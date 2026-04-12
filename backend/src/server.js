import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { URL } from "node:url";
import { WebSocket, WebSocketServer } from "ws";

import { config, getCorsOrigins, isDevLanOrigin, isProduction } from "./config.js";
import { pool, query, withTransaction, initDb } from "./db.js";
import {
  ApiError,
  asyncHandler,
  badRequest,
  conflict,
  errorMiddleware,
  forbidden,
  notFound,
  unauthorized,
} from "./errors.js";
import {
  buildMasterAdminUser,
  createAccessToken,
  createRefreshToken,
  decodeAccessToken,
  decodeRefreshToken,
  generateEmailToken,
  hashPassword,
  isMasterAdminLogin,
  isMasterAdminSubject,
  MASTER_ADMIN_ID,
  requireAdmin,
  requireAuth,
  verifyEmailToken,
  verifyPassword,
} from "./auth.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./mailer.js";
import { calculatePrice } from "./pricing.js";

const app = express();

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024,
  },
});

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_PROFILE_PHOTOS = 10;

const BOOKING_TRANSITIONS = {
  requested: ["accepted", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["rated"],
  rated: [],
  cancelled: ["refunded"],
  refunded: [],
};

const CANCELLATION_REFUND_RULES = {
  requested: 1.0,
  accepted: 1.0,
  in_progress: 0.5,
};

function parseJsonList(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getDbActorId(user) {
  return user?.id === MASTER_ADMIN_ID ? null : user?.id ?? null;
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar_url: row.avatar_url ?? null,
    wallet_balance: toNumber(row.wallet_balance),
    is_email_verified: Boolean(row.is_email_verified),
    created_at: row.created_at,
  };
}

function mapService(row) {
  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    base_price: toNumber(row.base_price),
    icon: row.icon,
    is_active: Boolean(row.is_active),
    avg_rating: toNumber(row.avg_rating),
    reviews_count: Number(row.reviews_count || 0),
  };
}

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    is_active: Boolean(row.is_active),
  };
}

function mapBooking(row) {
  return {
    id: row.id,
    service_id: row.service_id,
    user_id: row.user_id,
    pro_id: row.pro_id,
    status: row.status,
    scheduled_date: row.scheduled_date,
    time_slot: row.time_slot,
    address: row.address,
    description: row.description,
    base_price: toNumber(row.base_price),
    addons: row.addons || null,
    platform_fee: toNumber(row.platform_fee),
    tax: toNumber(row.tax),
    total_price: toNumber(row.total_price),
    notes: row.notes,
    reschedule_count: Number(row.reschedule_count || 0),
    cancellation_reason: row.cancellation_reason,
  };
}

function mapReview(row) {
  return {
    id: row.id,
    booking_id: row.booking_id,
    reviewer_id: row.reviewer_id,
    reviewee_id: row.reviewee_id,
    rating: Number(row.rating || 0),
    comment: row.comment,
    is_verified: Boolean(row.is_verified),
    is_flagged: Boolean(row.is_flagged),
  };
}

function mapDispute(row) {
  return {
    id: row.id,
    booking_id: row.booking_id,
    raised_by: row.raised_by,
    against_id: row.against_id,
    reason: row.reason,
    status: row.status,
    resolution: row.resolution,
    refund_amount: row.refund_amount == null ? null : toNumber(row.refund_amount),
  };
}

function mapProfessional(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.user_name ?? null,
    avatar_url: row.user_avatar_url ?? null,
    specialty: row.specialty,
    bio: row.bio,
    experience_years: Number(row.experience_years || 0),
    is_available: Boolean(row.is_available),
    is_kyc_verified: Boolean(row.is_kyc_verified),
    is_suspended: Boolean(row.is_suspended),
    avg_rating: toNumber(row.avg_rating),
    total_jobs: Number(row.total_jobs || 0),
    starting_price: toNumber(row.starting_price),
    public_phone: row.public_phone ?? row.user_phone ?? null,
    public_email: row.public_email ?? row.user_email ?? null,
    whatsapp_number: row.whatsapp_number ?? null,
    website_url: row.website_url ?? null,
    contact_address: row.contact_address ?? null,
    photo_urls: parseJsonList(row.photo_urls_json),
  };
}

function mapAdminAccount(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: Boolean(row.is_active),
    is_blocked: Boolean(row.is_blocked),
    is_email_verified: Boolean(row.is_email_verified),
    created_at: row.created_at,
    professional_id: row.professional_id ?? null,
    is_suspended: row.is_suspended == null ? null : Boolean(row.is_suspended),
  };
}

function assertStrongPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    badRequest("Password must be at least 8 characters");
  }
}

function assertEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) {
    badRequest("Invalid email");
  }
}

function ensureUploadsRoot() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

function safeExt(filename, fallback = ".jpg") {
  const ext = path.extname(filename || "").toLowerCase();
  if (!ext || ext.length > 8) return fallback;
  return ext;
}

function authHeaderLimiter(maxPerMinute) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: maxPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ detail: "Rate limit exceeded" }),
  });
}

app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = getCorsOrigins();
      if (allowed.includes(origin)) return callback(null, true);
      if (!isProduction && isDevLanOrigin(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(authHeaderLimiter(config.rateLimitPerMinute));
app.use("/uploads", express.static(config.uploadDir));

async function getProfessionalByUserId(userId, client = pool) {
  const result = await query(
    `SELECT p.*,
            u.name AS user_name,
            u.avatar_url AS user_avatar_url,
            u.phone AS user_phone,
            u.email AS user_email,
            pp.starting_price,
            pp.public_phone,
            pp.public_email,
            pp.whatsapp_number,
            pp.website_url,
            pp.contact_address,
            pp.photo_urls_json
     FROM professionals p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN professional_public_profiles pp ON pp.professional_id = p.id
     WHERE p.user_id = $1`,
    [userId],
    client
  );
  return result.rows[0] || null;
}

async function getProfessionalById(proId, client = pool) {
  const result = await query(
    `SELECT p.*,
            u.name AS user_name,
            u.avatar_url AS user_avatar_url,
            u.phone AS user_phone,
            u.email AS user_email,
            pp.starting_price,
            pp.public_phone,
            pp.public_email,
            pp.whatsapp_number,
            pp.website_url,
            pp.contact_address,
            pp.photo_urls_json
     FROM professionals p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN professional_public_profiles pp ON pp.professional_id = p.id
     WHERE p.id = $1`,
    [proId],
    client
  );
  return result.rows[0] || null;
}

async function assertAdminDeletionGuard(userId, client) {
  const userResult = await query(
    `SELECT id, role FROM users WHERE id = $1`,
    [userId],
    client
  );
  const user = userResult.rows[0];
  if (!user) {
    notFound("User not found");
  }
  if (user.role !== "admin") return;

  const countResult = await query(
    `SELECT COUNT(*)::int AS count
     FROM users
     WHERE role = 'admin' AND id <> $1 AND is_active = TRUE AND is_blocked = FALSE`,
    [userId],
    client
  );
  if ((countResult.rows[0]?.count || 0) < 1) {
    badRequest("Cannot delete the last active admin account");
  }
}

async function softDeleteUserAccount(userRow, client) {
  const marker = Math.floor(Date.now() / 1000);
  const sanitizedEmail = `deleted_${userRow.id}_${marker}@deleted.local`;
  await query(
    `UPDATE users
     SET name = $2,
         email = $3,
         phone = NULL,
         avatar_url = NULL,
         hashed_password = NULL,
         google_id = NULL,
         is_active = FALSE,
         is_blocked = TRUE,
         updated_at = NOW()
     WHERE id = $1`,
    [userRow.id, `Deleted User ${String(userRow.id).slice(0, 6)}`, sanitizedEmail],
    client
  );

  const proResult = await query(`SELECT id FROM professionals WHERE user_id = $1`, [userRow.id], client);
  const pro = proResult.rows[0];
  if (!pro) return;

  await query(
    `UPDATE professionals
     SET is_available = FALSE,
         is_suspended = TRUE,
         bio = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [pro.id],
    client
  );

  await query(
    `UPDATE professional_public_profiles
     SET starting_price = 0,
         public_phone = NULL,
         public_email = NULL,
         whatsapp_number = NULL,
         website_url = NULL,
         contact_address = NULL,
         photo_urls_json = '[]',
         updated_at = NOW()
     WHERE professional_id = $1`,
    [pro.id],
    client
  );

  fs.rmSync(path.join(config.uploadDir, "professionals", pro.id), { recursive: true, force: true });
}

async function getBookingById(bookingId, client = pool) {
  const result = await query(`SELECT * FROM bookings WHERE id = $1`, [bookingId], client);
  return result.rows[0] || null;
}

async function transitionBooking(client, booking, newStatus, actorUserId, note = null) {
  const allowed = BOOKING_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(newStatus)) {
    badRequest(`Cannot move booking from '${booking.status}' to '${newStatus}'`);
  }

  const updated = await query(
    `UPDATE bookings
     SET status = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [booking.id, newStatus],
    client
  );

  await query(
    `INSERT INTO booking_status_timeline (id, booking_id, status, changed_by, note, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [randomUUID(), booking.id, newStatus, actorUserId, note],
    client
  );

  return updated.rows[0];
}

async function issueWalletRefund(client, booking, userId, amount, actorId) {
  await query(`UPDATE users SET wallet_balance = wallet_balance + $2, updated_at = NOW() WHERE id = $1`, [userId, amount], client);

  await query(
    `INSERT INTO wallet_transactions (id, user_id, amount, type, reason, booking_id, created_at)
     VALUES ($1, $2, $3, 'credit', $4, $5, NOW())`,
    [
      randomUUID(),
      userId,
      amount,
      `Refund for cancelled booking ${String(booking.id).slice(0, 8).toUpperCase()}`,
      booking.id,
    ],
    client
  );

  const refreshedBooking = await getBookingById(booking.id, client);
  return transitionBooking(client, refreshedBooking, "refunded", actorId, `Auto-refund INR ${amount}`);
}

async function cancelBooking(client, booking, actorId, reason) {
  const preStatus = booking.status;

  await query(
    `UPDATE bookings SET cancellation_reason = $2, updated_at = NOW() WHERE id = $1`,
    [booking.id, reason],
    client
  );

  const cancelled = await transitionBooking(client, booking, "cancelled", actorId, reason);

  const paymentResult = await query(
    `SELECT * FROM payments WHERE booking_id = $1 AND status = 'paid'`,
    [booking.id],
    client
  );
  const payment = paymentResult.rows[0];
  if (payment && payment.method === "wallet") {
    const refundPct = CANCELLATION_REFUND_RULES[preStatus] || 0;
    if (refundPct > 0) {
      const amount = Number((toNumber(payment.amount) * refundPct).toFixed(2));
      await issueWalletRefund(client, booking, booking.user_id, amount, actorId);
      return getBookingById(cancelled.id, client);
    }
  }

  return cancelled;
}

async function assertBookingAccess(booking, user, client = pool) {
  if (user.role === "admin") return;
  if (booking.user_id === user.id) return;
  if (user.role === "professional") {
    const pro = await getProfessionalByUserId(user.id, client);
    if (pro && booking.pro_id === pro.id) return;
  }
  forbidden("Access denied");
}

function conversationResponse(row, currentUserRole, unreadCount) {
  if (currentUserRole === "user") {
    return {
      id: row.id,
      user_id: row.user_id,
      professional_id: row.professional_id,
      booking_id: row.booking_id,
      counterpart_user_id: row.pro_user_id || row.professional_user_id || row.user_id,
      counterpart_name: row.pro_user_name || row.professional_specialty || "Professional",
      counterpart_avatar_url: row.pro_user_avatar_url || null,
      last_message_preview: row.last_message_preview,
      last_message_at: row.last_message_at,
      unread_count: unreadCount,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  return {
    id: row.id,
    user_id: row.user_id,
    professional_id: row.professional_id,
    booking_id: row.booking_id,
    counterpart_user_id: row.chat_user_id || row.user_id,
    counterpart_name: row.chat_user_name || "User",
    counterpart_avatar_url: row.chat_user_avatar_url || null,
    last_message_preview: row.last_message_preview,
    last_message_at: row.last_message_at,
    unread_count: unreadCount,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getConversationForActor(conversationId, currentUser, client = pool) {
  let sql = `
    SELECT c.*, 
           u.id AS chat_user_id,
           u.name AS chat_user_name,
           u.avatar_url AS chat_user_avatar_url,
           p.user_id AS professional_user_id,
           p.specialty AS professional_specialty,
           pu.id AS pro_user_id,
           pu.name AS pro_user_name,
           pu.avatar_url AS pro_user_avatar_url
    FROM conversations c
    JOIN users u ON u.id = c.user_id
    JOIN professionals p ON p.id = c.professional_id
    JOIN users pu ON pu.id = p.user_id
    WHERE c.id = $1
  `;
  const params = [conversationId];

  if (currentUser.role === "user") {
    sql += " AND c.user_id = $2";
    params.push(currentUser.id);
  } else if (currentUser.role === "professional") {
    const pro = await getProfessionalByUserId(currentUser.id, client);
    if (!pro || pro.is_suspended) {
      forbidden("Professional profile required");
    }
    sql += " AND c.professional_id = $2";
    params.push(pro.id);
  } else {
    forbidden("Messaging is available only for user and professional accounts");
  }

  const result = await query(sql, params, client);
  const conversation = result.rows[0];
  if (!conversation) {
    notFound("Conversation not found");
  }
  return conversation;
}

function requireMessagingRole(req, _res, next) {
  if (!req.user || !["user", "professional"].includes(req.user.role)) {
    return next(forbidden("Messaging is available only for user and professional accounts"));
  }
  return next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", env: config.appEnv });
});

app.get("/", (_req, res) => {
  res.json({ message: "Servify API is running" });
});

const authLimiter = authHeaderLimiter(config.authRateLimitPerMinute);

app.post(
  "/api/v1/auth/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, password, phone = null, role = "user", specialty = null } = req.body || {};
    if (!name || typeof name !== "string") badRequest("name is required");
    assertEmail(email);
    assertStrongPassword(password);
    if (!["user", "professional", "admin"].includes(role)) badRequest("Invalid role");

    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (existing.rows[0]) {
      conflict("Email already registered");
    }

    const user = await withTransaction(async (client) => {
      const userResult = await query(
        `INSERT INTO users (
           id, name, email, hashed_password, phone, role, avatar_url,
           wallet_balance, is_active, is_email_verified, is_blocked, google_id,
           created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NULL, 0, TRUE, FALSE, FALSE, NULL, NOW(), NOW())
         RETURNING id, name, email, role, avatar_url, wallet_balance, is_email_verified, created_at`,
        [randomUUID(), name, email.toLowerCase(), hashPassword(password), phone, role],
        client
      );
      const created = userResult.rows[0];

      if (role === "professional") {
        const proId = randomUUID();
        await query(
          `INSERT INTO professionals (id, user_id, specialty, is_available, is_kyc_verified, is_suspended, avg_rating, total_ratings, total_jobs, commission_rate, created_at, updated_at)
           VALUES ($1, $2, $3, TRUE, FALSE, FALSE, 0, 0, 0, $4, NOW(), NOW())`,
          [proId, created.id, specialty || "General", config.defaultCommissionRate],
          client
        );
        await query(
          `INSERT INTO professional_public_profiles (id, professional_id, public_phone, public_email, starting_price, photo_urls_json, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 0, '[]', NOW(), NOW())`,
          [randomUUID(), proId, phone, email.toLowerCase()],
          client
        );
      }

      return created;
    });

    const token = generateEmailToken(user.email, "email-verify", 86400);
    void sendVerificationEmail(user.email, token, user.name);

    res.status(201).json(mapUser(user));
  })
);

app.post(
  "/api/v1/auth/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    assertEmail(email);
    if (!password) badRequest("password is required");

    if (isMasterAdminLogin(email, password)) {
      const masterAdmin = buildMasterAdminUser();
      res.json({
        access_token: createAccessToken(MASTER_ADMIN_ID, { role: masterAdmin.role, is_master_admin: true }),
        refresh_token: createRefreshToken(MASTER_ADMIN_ID),
        token_type: "bearer",
        user: mapUser(masterAdmin),
      });
      return;
    }

    const userResult = await query(
      `SELECT id, name, email, role, avatar_url, wallet_balance, is_email_verified, is_blocked, hashed_password, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const user = userResult.rows[0];
    if (!user || !user.hashed_password || !verifyPassword(password, user.hashed_password)) {
      unauthorized("Invalid credentials");
    }
    if (user.is_blocked) {
      forbidden("Account has been blocked");
    }

    const accessToken = createAccessToken(user.id, { role: user.role });
    const refreshToken = createRefreshToken(user.id);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      user: mapUser(user),
    });
  })
);

app.post(
  "/api/v1/auth/refresh",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { refresh_token: refreshToken } = req.body || {};
    if (!refreshToken) badRequest("refresh_token is required");

    const payload = decodeRefreshToken(refreshToken);
    if (isMasterAdminSubject(payload.sub)) {
      const masterAdmin = buildMasterAdminUser();
      res.json({
        access_token: createAccessToken(MASTER_ADMIN_ID, { role: masterAdmin.role, is_master_admin: true }),
        refresh_token: createRefreshToken(MASTER_ADMIN_ID),
        token_type: "bearer",
        user: mapUser(masterAdmin),
      });
      return;
    }

    const userResult = await query(
      `SELECT id, name, email, role, avatar_url, wallet_balance, is_email_verified, is_active, created_at
       FROM users WHERE id = $1`,
      [payload.sub]
    );
    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      unauthorized("User not found or inactive");
    }

    res.json({
      access_token: createAccessToken(user.id, { role: user.role }),
      refresh_token: createRefreshToken(user.id),
      token_type: "bearer",
      user: mapUser(user),
    });
  })
);

app.get(
  "/api/v1/auth/verify-email",
  asyncHandler(async (req, res) => {
    const token = String(req.query.token || "");
    if (!token) badRequest("token is required");
    const email = verifyEmailToken(token, "email-verify");

    const userResult = await query(`SELECT id, is_email_verified FROM users WHERE email = $1`, [email]);
    const user = userResult.rows[0];
    if (!user) {
      notFound("User not found");
    }
    if (user.is_email_verified) {
      res.json({ message: "Email already verified" });
      return;
    }

    await query(`UPDATE users SET is_email_verified = TRUE, updated_at = NOW() WHERE id = $1`, [user.id]);
    res.json({ message: "Email verified successfully" });
  })
);

app.post(
  "/api/v1/auth/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    assertEmail(email);

    const userResult = await query(`SELECT id, email FROM users WHERE email = $1`, [email.toLowerCase()]);
    const user = userResult.rows[0];
    if (user) {
      const token = generateEmailToken(user.email, "password-reset", 3600);
      void sendPasswordResetEmail(user.email, token);
    }

    res.status(202).json({ message: "If that email exists, a reset link has been sent." });
  })
);

app.post(
  "/api/v1/auth/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, new_password: newPassword } = req.body || {};
    if (!token) badRequest("token is required");
    assertStrongPassword(newPassword);

    const email = verifyEmailToken(token, "password-reset");
    const userResult = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    const user = userResult.rows[0];
    if (!user) {
      notFound("User not found");
    }

    await query(`UPDATE users SET hashed_password = $2, updated_at = NOW() WHERE id = $1`, [user.id, hashPassword(newPassword)]);
    res.json({ message: "Password updated successfully" });
  })
);

app.get(
  "/api/v1/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(mapUser(req.user));
  })
);

app.get("/api/v1/auth/google", (_req, res) => {
  res.json({ message: "Google OAuth not yet configured. Set GOOGLE_CLIENT_ID in .env" });
});

app.get(
  "/api/v1/users/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(mapUser(req.user));
  })
);

app.patch(
  "/api/v1/users/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updates = [];
    const values = [req.user.id];

    if (typeof req.body?.name === "string" && req.body.name.trim()) {
      values.push(req.body.name.trim());
      updates.push(`name = $${values.length}`);
    }
    if (typeof req.body?.phone === "string") {
      values.push(req.body.phone.trim() || null);
      updates.push(`phone = $${values.length}`);
    }
    if (typeof req.body?.avatar_url === "string") {
      values.push(req.body.avatar_url.trim() || null);
      updates.push(`avatar_url = $${values.length}`);
    }

    if (!updates.length) {
      const current = await query(
        `SELECT id, name, email, role, avatar_url, wallet_balance, is_email_verified, created_at FROM users WHERE id = $1`,
        [req.user.id]
      );
      res.json(mapUser(current.rows[0]));
      return;
    }

    updates.push("updated_at = NOW()");

    const updated = await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $1 RETURNING id, name, email, role, avatar_url, wallet_balance, is_email_verified, created_at`,
      values
    );

    res.json(mapUser(updated.rows[0]));
  })
);

app.delete(
  "/api/v1/users/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    await withTransaction(async (client) => {
      const userResult = await query(`SELECT id, role FROM users WHERE id = $1`, [req.user.id], client);
      const user = userResult.rows[0];
      if (!user) notFound("User not found");
      await assertAdminDeletionGuard(user.id, client);
      await softDeleteUserAccount(user, client);
    });

    res.json({ message: "Account deleted successfully" });
  })
);

app.get(
  "/api/v1/users/:user_id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, name, email, role, avatar_url, wallet_balance, is_email_verified, created_at FROM users WHERE id = $1`,
      [req.params.user_id]
    );
    const user = result.rows[0];
    if (!user) notFound("User not found");
    res.json(mapUser(user));
  })
);

app.get(
  "/api/v1/professionals",
  asyncHandler(async (req, res) => {
    const specialty = typeof req.query.specialty === "string" ? req.query.specialty.trim() : "";
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));

    const params = [];
    let where = `
      WHERE p.is_suspended = FALSE
        AND u.is_active = TRUE
        AND u.is_blocked = FALSE
    `;

    if (specialty) {
      params.push(`%${specialty}%`);
      where += ` AND p.specialty ILIKE $${params.length}`;
    }

    params.push(skip, limit);

    const result = await query(
      `SELECT p.*,
              u.name AS user_name,
              u.avatar_url AS user_avatar_url,
              u.phone AS user_phone,
              u.email AS user_email,
              pp.starting_price,
              pp.public_phone,
              pp.public_email,
              pp.whatsapp_number,
              pp.website_url,
              pp.contact_address,
              pp.photo_urls_json
       FROM professionals p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN professional_public_profiles pp ON pp.professional_id = p.id
       ${where}
       ORDER BY p.avg_rating DESC
       OFFSET $${params.length - 1}
       LIMIT $${params.length}`,
      params
    );

    res.json(result.rows.map(mapProfessional));
  })
);

app.get(
  "/api/v1/professionals/:pro_id",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT p.*,
              u.name AS user_name,
              u.avatar_url AS user_avatar_url,
              u.phone AS user_phone,
              u.email AS user_email,
              pp.starting_price,
              pp.public_phone,
              pp.public_email,
              pp.whatsapp_number,
              pp.website_url,
              pp.contact_address,
              pp.photo_urls_json
       FROM professionals p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN professional_public_profiles pp ON pp.professional_id = p.id
       WHERE p.id = $1
         AND p.is_suspended = FALSE
         AND u.is_active = TRUE
         AND u.is_blocked = FALSE`,
      [req.params.pro_id]
    );

    const pro = result.rows[0];
    if (!pro) notFound("Professional not found");
    res.json(mapProfessional(pro));
  })
);

app.patch(
  "/api/v1/professionals/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "professional") forbidden("Only professionals can update this profile");

    const fields = req.body || {};
    const proFields = ["specialty", "bio", "experience_years", "base_location", "is_available"];
    const publicFields = [
      "starting_price",
      "public_phone",
      "public_email",
      "whatsapp_number",
      "website_url",
      "contact_address",
      "photo_urls",
    ];

    const updated = await withTransaction(async (client) => {
      const pro = await getProfessionalByUserId(req.user.id, client);
      if (!pro) notFound("Professional profile not found");

      const proUpdates = [];
      const proValues = [pro.id];
      for (const key of proFields) {
        if (Object.prototype.hasOwnProperty.call(fields, key)) {
          proValues.push(fields[key]);
          proUpdates.push(`${key} = $${proValues.length}`);
        }
      }
      if (proUpdates.length) {
        proUpdates.push("updated_at = NOW()");
        await query(
          `UPDATE professionals SET ${proUpdates.join(", ")} WHERE id = $1`,
          proValues,
          client
        );
      }

      const hasPublicUpdates = publicFields.some((key) => Object.prototype.hasOwnProperty.call(fields, key));
      if (hasPublicUpdates) {
        await query(
          `INSERT INTO professional_public_profiles (id, professional_id, public_phone, public_email, starting_price, photo_urls_json, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 0, '[]', NOW(), NOW())
           ON CONFLICT (professional_id) DO NOTHING`,
          [randomUUID(), pro.id, req.user.phone, req.user.email],
          client
        );

        const pubUpdates = [];
        const pubValues = [pro.id];
        for (const key of publicFields) {
          if (!Object.prototype.hasOwnProperty.call(fields, key) || key === "photo_urls") continue;
          pubValues.push(fields[key]);
          pubUpdates.push(`${key} = $${pubValues.length}`);
        }
        if (Object.prototype.hasOwnProperty.call(fields, "photo_urls")) {
          pubValues.push(JSON.stringify(Array.isArray(fields.photo_urls) ? fields.photo_urls : []));
          pubUpdates.push(`photo_urls_json = $${pubValues.length}`);
        }
        if (pubUpdates.length) {
          pubUpdates.push("updated_at = NOW()");
          await query(
            `UPDATE professional_public_profiles SET ${pubUpdates.join(", ")} WHERE professional_id = $1`,
            pubValues,
            client
          );
        }
      }

      return getProfessionalById(pro.id, client);
    });

    res.json(mapProfessional(updated));
  })
);

app.post(
  "/api/v1/professionals/me/photos",
  requireAuth,
  uploadMemory.single("file"),
  asyncHandler(async (req, res) => {
    if (req.user.role !== "professional") forbidden("Only professionals can upload profile photos");
    if (!req.file) badRequest("file is required");
    if (!ALLOWED_PHOTO_TYPES.has(req.file.mimetype)) {
      badRequest(`Unsupported file type. Allowed: ${Array.from(ALLOWED_PHOTO_TYPES).join(", ")}`);
    }

    const updated = await withTransaction(async (client) => {
      const pro = await getProfessionalByUserId(req.user.id, client);
      if (!pro) notFound("Professional profile not found");

      const currentPhotos = parseJsonList(pro.photo_urls_json);
      if (currentPhotos.length >= MAX_PROFILE_PHOTOS) {
        badRequest(`You can upload up to ${MAX_PROFILE_PHOTOS} photos`);
      }

      const ext = safeExt(req.file.originalname, ".jpg");
      const safeName = `${pro.id}_${Date.now()}${ext}`;
      const uploadDir = path.join(config.uploadDir, "professionals", pro.id);
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, safeName), req.file.buffer);

      await query(
        `INSERT INTO professional_public_profiles (id, professional_id, public_phone, public_email, starting_price, photo_urls_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, '[]', NOW(), NOW())
         ON CONFLICT (professional_id) DO NOTHING`,
        [randomUUID(), pro.id, req.user.phone, req.user.email],
        client
      );

      const photoUrl = `/uploads/professionals/${pro.id}/${safeName}`;
      const nextPhotos = JSON.stringify([...currentPhotos, photoUrl]);
      await query(
        `UPDATE professional_public_profiles
         SET photo_urls_json = $2,
             updated_at = NOW()
         WHERE professional_id = $1`,
        [pro.id, nextPhotos],
        client
      );

      return getProfessionalById(pro.id, client);
    });

    res.json(mapProfessional(updated));
  })
);

app.delete(
  "/api/v1/professionals/me/photos",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "professional") forbidden("Only professionals can remove profile photos");
    const photoUrl = req.body?.photo_url;
    if (!photoUrl || typeof photoUrl !== "string") badRequest("photo_url is required");

    const updated = await withTransaction(async (client) => {
      const pro = await getProfessionalByUserId(req.user.id, client);
      if (!pro) notFound("Professional profile not found");

      const currentPhotos = parseJsonList(pro.photo_urls_json);
      if (!currentPhotos.includes(photoUrl)) {
        notFound("Photo not found");
      }

      await query(
        `INSERT INTO professional_public_profiles (id, professional_id, public_phone, public_email, starting_price, photo_urls_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, '[]', NOW(), NOW())
         ON CONFLICT (professional_id) DO NOTHING`,
        [randomUUID(), pro.id, req.user.phone, req.user.email],
        client
      );

      const filtered = currentPhotos.filter((url) => url !== photoUrl);
      await query(
        `UPDATE professional_public_profiles
         SET photo_urls_json = $2,
             updated_at = NOW()
         WHERE professional_id = $1`,
        [pro.id, JSON.stringify(filtered)],
        client
      );

      const expectedPrefix = `/uploads/professionals/${pro.id}/`;
      if (photoUrl.startsWith(expectedPrefix)) {
        const filename = photoUrl.slice(expectedPrefix.length);
        if (filename && !filename.includes("/") && !filename.includes("\\")) {
          const uploadDir = path.normalize(path.join(config.uploadDir, "professionals", pro.id));
          const filePath = path.normalize(path.join(uploadDir, filename));
          if (filePath.startsWith(uploadDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            try {
              fs.unlinkSync(filePath);
            } catch {
              // Keep profile update even if file cleanup fails.
            }
          }
        }
      }

      return getProfessionalById(pro.id, client);
    });

    res.json(mapProfessional(updated));
  })
);

app.get(
  "/api/v1/categories",
  asyncHandler(async (req, res) => {
    const activeOnly = String(req.query.active_only || "false") === "true";
    const params = [];
    let where = "";
    if (activeOnly) {
      params.push(true);
      where = `WHERE is_active = $${params.length}`;
    }

    const result = await query(`SELECT * FROM categories ${where} ORDER BY name ASC`, params);
    res.json(result.rows.map(mapCategory));
  })
);

app.post(
  "/api/v1/categories",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name, icon, description = null } = req.body || {};
    if (!name || !icon) badRequest("name and icon are required");

    const result = await query(
      `INSERT INTO categories (id, name, icon, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
       RETURNING *`,
      [randomUUID(), name, icon, description]
    );

    res.status(201).json(mapCategory(result.rows[0]));
  })
);

app.get(
  "/api/v1/services",
  asyncHandler(async (req, res) => {
    const categoryId = typeof req.query.category_id === "string" ? req.query.category_id : null;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const activeOnly = String(req.query.active_only || "false") === "true";
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));

    const params = [];
    const where = [];

    if (activeOnly) {
      params.push(true);
      where.push(`is_active = $${params.length}`);
    }
    if (categoryId) {
      params.push(categoryId);
      where.push(`category_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`name ILIKE $${params.length}`);
    }

    params.push(skip, limit);

    const result = await query(
      `SELECT *
       FROM services
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY created_at DESC
       OFFSET $${params.length - 1}
       LIMIT $${params.length}`,
      params
    );

    res.json(result.rows.map(mapService));
  })
);

app.get(
  "/api/v1/services/:service_id",
  asyncHandler(async (req, res) => {
    const result = await query(`SELECT * FROM services WHERE id = $1`, [req.params.service_id]);
    const service = result.rows[0];
    if (!service) notFound("Service not found");
    res.json(mapService(service));
  })
);

app.post(
  "/api/v1/services",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { category_id: categoryId, name, description = null, base_price: basePrice, icon, requires_inspection: requiresInspection = false } = req.body || {};
    if (!categoryId || !name || basePrice == null || !icon) {
      badRequest("category_id, name, base_price and icon are required");
    }

    const created = await query(
      `INSERT INTO services (id, category_id, name, description, base_price, icon, requires_inspection, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW())
       RETURNING *`,
      [randomUUID(), categoryId, name, description, basePrice, icon, Boolean(requiresInspection)]
    );

    res.status(201).json(mapService(created.rows[0]));
  })
);

app.patch(
  "/api/v1/services/:service_id/approve",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const updated = await query(
      `UPDATE services SET is_active = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.service_id]
    );
    if (!updated.rows[0]) notFound("Service not found");
    res.json({ message: "Service approved" });
  })
);

app.delete(
  "/api/v1/services/:service_id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const updated = await query(
      `UPDATE services SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.service_id]
    );
    if (!updated.rows[0]) notFound("Service not found");
    res.json({ message: "Service deactivated" });
  })
);

app.post(
  "/api/v1/bookings/quote",
  asyncHandler(async (req, res) => {
    const { service_id: serviceId, addons = [] } = req.body || {};
    if (!serviceId) badRequest("service_id is required");

    const serviceResult = await query(`SELECT id, base_price FROM services WHERE id = $1`, [serviceId]);
    const service = serviceResult.rows[0];
    if (!service) notFound("Service not found");

    const breakdown = calculatePrice(toNumber(service.base_price), addons);
    res.json(breakdown);
  })
);

app.post(
  "/api/v1/bookings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const {
      service_id: serviceId = null,
      pro_id: proId = null,
      description = null,
      scheduled_date: scheduledDate,
      time_slot: timeSlot,
      address,
      latitude = null,
      longitude = null,
      addons = null,
      notes = null,
    } = body;

    if (!scheduledDate || !timeSlot || !address) {
      badRequest("scheduled_date, time_slot and address are required");
    }

    let breakdown;
    if (serviceId) {
      const serviceResult = await query(
        `SELECT id, base_price FROM services WHERE id = $1 AND is_active = TRUE`,
        [serviceId]
      );
      const service = serviceResult.rows[0];
      if (!service) notFound("Service not found or unavailable");
      breakdown = calculatePrice(toNumber(service.base_price), addons || []);
    } else {
      if (!proId) badRequest("Either service_id or pro_id is required");
      const proResult = await query(
        `SELECT p.id, pp.starting_price
         FROM professionals p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN professional_public_profiles pp ON pp.professional_id = p.id
         WHERE p.id = $1
           AND p.is_suspended = FALSE
           AND u.is_active = TRUE
           AND u.is_blocked = FALSE`,
        [proId]
      );
      const pro = proResult.rows[0];
      if (!pro) notFound("Professional not found");
      breakdown = calculatePrice(toNumber(pro.starting_price), addons || []);
    }

    const booking = await withTransaction(async (client) => {
      const created = await query(
        `INSERT INTO bookings (
          id, service_id, user_id, pro_id, description, status, scheduled_date, time_slot,
          address, latitude, longitude, addons, notes, reschedule_count, cancellation_reason,
          base_price, platform_fee, tax, total_price,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'requested', $6, $7,
          $8, $9, $10, $11, $12, 0, NULL, $13, $14, $15, $16,
          NOW(), NOW()
        ) RETURNING *`,
        [
          randomUUID(),
          serviceId,
          req.user.id,
          proId,
          description,
          scheduledDate,
          timeSlot,
          address,
          latitude,
          longitude,
          addons ? JSON.stringify(addons) : null,
          notes,
          breakdown.base_price,
          breakdown.platform_fee,
          breakdown.tax,
          breakdown.total,
        ],
        client
      );
      const bookingRow = created.rows[0];

      await query(
        `INSERT INTO booking_status_timeline (id, booking_id, status, changed_by, note, created_at)
         VALUES ($1, $2, 'requested', $3, 'Booking created', NOW())`,
        [randomUUID(), bookingRow.id, req.user.id],
        client
      );

      return bookingRow;
    });

    res.status(201).json(mapBooking(booking));
  })
);

app.get(
  "/api/v1/bookings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 20)));

    let sql = `SELECT b.* FROM bookings b`;
    const params = [];

    if (req.user.role === "user") {
      params.push(req.user.id);
      sql += `
        WHERE b.user_id = $${params.length}
          AND (
            b.pro_id IS NULL
            OR b.pro_id IN (
              SELECT p.id
              FROM professionals p
              JOIN users u ON u.id = p.user_id
              WHERE p.is_suspended = FALSE
                AND u.is_active = TRUE
                AND u.is_blocked = FALSE
            )
          )`;
    } else if (req.user.role === "professional") {
      const pro = await getProfessionalByUserId(req.user.id);
      if (!pro) {
        res.json([]);
        return;
      }
      params.push(pro.id);
      sql += ` WHERE b.pro_id = $${params.length}`;
    }

    params.push(skip, limit);
    sql += ` ORDER BY b.created_at DESC OFFSET $${params.length - 1} LIMIT $${params.length}`;

    const result = await query(sql, params);
    res.json(result.rows.map(mapBooking));
  })
);

app.get(
  "/api/v1/bookings/:booking_id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await getBookingById(req.params.booking_id);
    if (!booking) notFound("Booking not found");
    await assertBookingAccess(booking, req.user);
    res.json(mapBooking(booking));
  })
);

async function getBookingAndProfessional(bookingId, user, client = pool) {
  if (user.role !== "professional") {
    forbidden("Professional profile required");
  }
  const pro = await getProfessionalByUserId(user.id, client);
  if (!pro) forbidden("Professional profile required");

  const booking = await getBookingById(bookingId, client);
  if (!booking) notFound("Booking not found");
  return { booking, pro };
}

app.patch(
  "/api/v1/bookings/:booking_id/accept",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await withTransaction(async (client) => {
      const { booking, pro } = await getBookingAndProfessional(req.params.booking_id, req.user, client);

      let currentBooking = booking;
      if (!currentBooking.pro_id) {
        const assign = await query(
          `UPDATE bookings SET pro_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [booking.id, pro.id],
          client
        );
        currentBooking = assign.rows[0];
      }
      const transitioned = await transitionBooking(client, currentBooking, "accepted", req.user.id, "Accepted by professional");
      return transitioned;
    });

    res.json(mapBooking(updated));
  })
);

app.patch(
  "/api/v1/bookings/:booking_id/reject",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await withTransaction(async (client) => {
      const { booking } = await getBookingAndProfessional(req.params.booking_id, req.user, client);
      if (booking.status !== "requested") {
        badRequest("Can only reject bookings in 'requested' status");
      }
      return transitionBooking(client, booking, "cancelled", req.user.id, "Rejected by professional");
    });

    res.json(mapBooking(updated));
  })
);

app.patch(
  "/api/v1/bookings/:booking_id/start",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await withTransaction(async (client) => {
      const { booking } = await getBookingAndProfessional(req.params.booking_id, req.user, client);
      return transitionBooking(client, booking, "in_progress", req.user.id, "Work started");
    });

    res.json(mapBooking(updated));
  })
);

app.patch(
  "/api/v1/bookings/:booking_id/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await withTransaction(async (client) => {
      const { booking } = await getBookingAndProfessional(req.params.booking_id, req.user, client);
      return transitionBooking(client, booking, "completed", req.user.id, "Work completed");
    });

    res.json(mapBooking(updated));
  })
);

app.patch(
  "/api/v1/bookings/:booking_id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const reason = req.body?.reason;
    if (!reason) badRequest("reason is required");

    const cancelled = await withTransaction(async (client) => {
      const booking = await getBookingById(req.params.booking_id, client);
      if (!booking) notFound("Booking not found");
      await assertBookingAccess(booking, req.user, client);
      return cancelBooking(client, booking, req.user.id, reason);
    });

    res.json(mapBooking(cancelled));
  })
);

app.patch(
  "/api/v1/bookings/:booking_id/reschedule",
  requireAuth,
  asyncHandler(async (req, res) => {
    const newDate = req.body?.new_date;
    const newSlot = req.body?.new_slot;
    if (!newDate || !newSlot) badRequest("new_date and new_slot are required");

    const updated = await withTransaction(async (client) => {
      const booking = await getBookingById(req.params.booking_id, client);
      if (!booking) notFound("Booking not found");
      await assertBookingAccess(booking, req.user, client);

      if (!["requested", "accepted"].includes(booking.status)) {
        badRequest("Booking can only be rescheduled when requested or accepted");
      }
      if (Number(booking.reschedule_count || 0) >= 2) {
        badRequest("Maximum 2 reschedules allowed per booking");
      }

      const result = await query(
        `UPDATE bookings
         SET scheduled_date = $2,
             time_slot = $3,
             reschedule_count = reschedule_count + 1,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [booking.id, newDate, newSlot],
        client
      );

      await query(
        `INSERT INTO booking_status_timeline (id, booking_id, status, changed_by, note, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [randomUUID(), booking.id, booking.status, req.user.id, `Rescheduled to ${newDate} ${newSlot}`],
        client
      );

      return result.rows[0];
    });

    res.json(mapBooking(updated));
  })
);

app.get(
  "/api/v1/bookings/:booking_id/timeline",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await getBookingById(req.params.booking_id);
    if (!booking) notFound("Booking not found");
    await assertBookingAccess(booking, req.user);

    const result = await query(
      `SELECT status, note, created_at
       FROM booking_status_timeline
       WHERE booking_id = $1
       ORDER BY created_at ASC`,
      [req.params.booking_id]
    );

    res.json(result.rows);
  })
);

app.post(
  "/api/v1/reviews",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { booking_id: bookingId, rating, comment = null } = req.body || {};
    if (!bookingId) badRequest("booking_id is required");
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      badRequest("Rating must be between 1 and 5");
    }

    const review = await withTransaction(async (client) => {
      const booking = await getBookingById(bookingId, client);
      if (!booking) notFound("Booking not found");
      if (booking.user_id !== req.user.id) forbidden("You can only review your own bookings");
      if (!["completed", "rated"].includes(booking.status)) {
        badRequest("Reviews can only be submitted for completed bookings");
      }

      const existing = await query(`SELECT id FROM reviews WHERE booking_id = $1`, [bookingId], client);
      if (existing.rows[0]) conflict("You have already reviewed this booking");

      if (!booking.pro_id) {
        badRequest("No professional assigned to this booking");
      }

      const proResult = await query(`SELECT id, user_id, total_jobs FROM professionals WHERE id = $1`, [booking.pro_id], client);
      const pro = proResult.rows[0];
      if (!pro) badRequest("No professional assigned to this booking");

      const created = await query(
        `INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment, is_verified, is_flagged, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, NOW(), NOW())
         RETURNING *`,
        [randomUUID(), bookingId, req.user.id, pro.user_id, numericRating, comment],
        client
      );

      await query(`UPDATE bookings SET status = 'rated', updated_at = NOW() WHERE id = $1`, [bookingId], client);

      const aggregate = await query(
        `SELECT AVG(rating)::float AS avg_rating, COUNT(id)::int AS count
         FROM reviews
         WHERE reviewee_id = $1 AND is_verified = TRUE`,
        [pro.user_id],
        client
      );

      await query(
        `UPDATE professionals
         SET avg_rating = $2,
             total_ratings = $3,
             total_jobs = total_jobs + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [pro.id, Number((aggregate.rows[0]?.avg_rating || 0).toFixed(2)), aggregate.rows[0]?.count || 0],
        client
      );

      return created.rows[0];
    });

    res.status(201).json(mapReview(review));
  })
);

app.get(
  "/api/v1/reviews/professional/:professional_id",
  asyncHandler(async (req, res) => {
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 20)));

    const proResult = await query(`SELECT id, user_id FROM professionals WHERE id = $1`, [req.params.professional_id]);
    const pro = proResult.rows[0];
    if (!pro) notFound("Professional not found");

    const result = await query(
      `SELECT *
       FROM reviews
       WHERE reviewee_id = $1
         AND is_verified = TRUE
         AND is_flagged = FALSE
       ORDER BY created_at DESC
       OFFSET $2 LIMIT $3`,
      [pro.user_id, skip, limit]
    );

    res.json(result.rows.map(mapReview));
  })
);

app.patch(
  "/api/v1/reviews/:review_id/flag",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await query(`UPDATE reviews SET is_flagged = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id`, [req.params.review_id]);
    if (!updated.rows[0]) notFound("Review not found");
    res.json({ message: "Review flagged for moderation" });
  })
);

app.post(
  "/api/v1/disputes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { booking_id: bookingId, reason } = req.body || {};
    if (!bookingId || !reason) badRequest("booking_id and reason are required");

    const dispute = await withTransaction(async (client) => {
      const booking = await getBookingById(bookingId, client);
      if (!booking) notFound("Booking not found");
      if (booking.user_id !== req.user.id) forbidden("Access denied");
      if (!["completed", "rated"].includes(booking.status)) {
        badRequest("Disputes can only be raised on completed bookings");
      }

      const existing = await query(`SELECT id FROM disputes WHERE booking_id = $1`, [bookingId], client);
      if (existing.rows[0]) conflict("A dispute already exists for this booking");

      const created = await query(
        `INSERT INTO disputes (id, booking_id, raised_by, against_id, reason, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW())
         RETURNING *`,
        [randomUUID(), bookingId, req.user.id, booking.pro_id || booking.user_id, reason],
        client
      );

      return created.rows[0];
    });

    res.status(201).json(mapDispute(dispute));
  })
);

app.post(
  "/api/v1/disputes/:dispute_id/evidence",
  requireAuth,
  uploadMemory.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) badRequest("file is required");
    if (!ALLOWED_EVIDENCE_TYPES.has(req.file.mimetype)) {
      badRequest(`File type not allowed. Allowed: ${Array.from(ALLOWED_EVIDENCE_TYPES).join(", ")}`);
    }

    const saved = await withTransaction(async (client) => {
      const disputeResult = await query(`SELECT id, raised_by FROM disputes WHERE id = $1`, [req.params.dispute_id], client);
      const dispute = disputeResult.rows[0];
      if (!dispute) notFound("Dispute not found");
      if (dispute.raised_by !== req.user.id) forbidden("Access denied");

      const uploadDir = path.join(config.uploadDir, "disputes", dispute.id);
      fs.mkdirSync(uploadDir, { recursive: true });

      const filename = `${dispute.id}_${path.basename(req.file.originalname || "evidence")}`;
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      const fileUrl = `/uploads/disputes/${dispute.id}/${filename}`;

      await query(
        `INSERT INTO dispute_evidence (id, dispute_id, uploaded_by, file_url, file_type, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [randomUUID(), dispute.id, req.user.id, fileUrl, req.file.mimetype],
        client
      );

      return fileUrl;
    });

    res.json({ file_url: saved });
  })
);

app.get(
  "/api/v1/disputes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 20)));

    const params = [];
    let where = "";
    if (req.user.role !== "admin") {
      params.push(req.user.id);
      where = `WHERE raised_by = $${params.length}`;
    }
    params.push(skip, limit);

    const result = await query(
      `SELECT *
       FROM disputes
       ${where}
       ORDER BY created_at DESC
       OFFSET $${params.length - 1}
       LIMIT $${params.length}`,
      params
    );

    res.json(result.rows.map(mapDispute));
  })
);

app.patch(
  "/api/v1/disputes/:dispute_id/resolve",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { resolution, refund_amount: refundAmount } = req.body || {};
    if (!resolution) badRequest("resolution is required");
    const actorUserId = getDbActorId(req.user);

    const resolved = await withTransaction(async (client) => {
      const disputeResult = await query(`SELECT * FROM disputes WHERE id = $1`, [req.params.dispute_id], client);
      const dispute = disputeResult.rows[0];
      if (!dispute) notFound("Dispute not found");
      if (dispute.status === "resolved") badRequest("Dispute already resolved");

      const updated = await query(
        `UPDATE disputes
         SET status = 'resolved',
             resolution = $2,
             resolved_by = $3,
             resolved_at = NOW(),
             refund_amount = $4,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [dispute.id, resolution, actorUserId, refundAmount ?? null],
        client
      );

      if (refundAmount && Number(refundAmount) > 0) {
        await query(
          `UPDATE users SET wallet_balance = wallet_balance + $2, updated_at = NOW() WHERE id = $1`,
          [dispute.raised_by, Number(refundAmount)],
          client
        );
        await query(
          `INSERT INTO wallet_transactions (id, user_id, amount, type, reason, booking_id, created_at)
           VALUES ($1, $2, $3, 'credit', $4, $5, NOW())`,
          [
            randomUUID(),
            dispute.raised_by,
            Number(refundAmount),
            `Dispute refund for booking ${String(dispute.booking_id).slice(0, 8).toUpperCase()}`,
            dispute.booking_id,
          ],
          client
        );
      }

      return updated.rows[0];
    });

    res.json(mapDispute(resolved));
  })
);

app.get(
  "/api/v1/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const unreadOnly = String(req.query.unread_only || "false") === "true";
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));

    const params = [req.user.id];
    let where = `WHERE user_id = $1`;
    if (unreadOnly) {
      where += ` AND is_read = FALSE`;
    }
    params.push(skip, limit);

    const result = await query(
      `SELECT id, type, title, body, is_read, metadata AS metadata_, created_at
       FROM notifications
       ${where}
       ORDER BY created_at DESC
       OFFSET $2 LIMIT $3`,
      params
    );

    res.json(result.rows);
  })
);

app.patch(
  "/api/v1/notifications/:notification_id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [req.params.notification_id, req.user.id]
    );
    res.json({ message: "Marked as read" });
  })
);

app.patch(
  "/api/v1/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [req.user.id]);
    res.json({ message: "All notifications marked as read" });
  })
);

app.get(
  "/api/v1/messages/conversations",
  requireAuth,
  requireMessagingRole,
  asyncHandler(async (req, res) => {
    const bookingId = typeof req.query.booking_id === "string" ? req.query.booking_id : null;
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

    const params = [];
    const where = [
      "u.is_active = TRUE",
      "u.is_blocked = FALSE",
      "p.is_suspended = FALSE",
      "pu.is_active = TRUE",
      "pu.is_blocked = FALSE",
    ];

    if (req.user.role === "user") {
      params.push(req.user.id);
      where.push(`c.user_id = $${params.length}`);
    } else {
      const pro = await getProfessionalByUserId(req.user.id);
      if (!pro || pro.is_suspended) forbidden("Professional profile required");
      params.push(pro.id);
      where.push(`c.professional_id = $${params.length}`);
    }

    if (bookingId) {
      params.push(bookingId);
      where.push(`c.booking_id = $${params.length}`);
    }

    params.push(skip, limit);

    const result = await query(
      `SELECT c.*,
              u.id AS chat_user_id,
              u.name AS chat_user_name,
              u.avatar_url AS chat_user_avatar_url,
              p.user_id AS professional_user_id,
              p.specialty AS professional_specialty,
              pu.id AS pro_user_id,
              pu.name AS pro_user_name,
              pu.avatar_url AS pro_user_avatar_url
       FROM conversations c
       JOIN users u ON u.id = c.user_id
       JOIN professionals p ON p.id = c.professional_id
       JOIN users pu ON pu.id = p.user_id
       WHERE ${where.join(" AND ")}
       ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC
       OFFSET $${params.length - 1}
       LIMIT $${params.length}`,
      params
    );

    const conversations = result.rows;
    if (!conversations.length) {
      res.json([]);
      return;
    }

    const ids = conversations.map((c) => c.id);
    const unread = await query(
      `SELECT conversation_id, COUNT(id)::int AS count
       FROM conversation_messages
       WHERE conversation_id = ANY($1::varchar[])
         AND sender_id <> $2
         AND read_at IS NULL
       GROUP BY conversation_id`,
      [ids, req.user.id]
    );

    const unreadMap = new Map(unread.rows.map((r) => [r.conversation_id, Number(r.count || 0)]));

    res.json(
      conversations.map((row) => conversationResponse(row, req.user.role, unreadMap.get(row.id) || 0))
    );
  })
);

app.post(
  "/api/v1/messages/conversations",
  requireAuth,
  requireMessagingRole,
  asyncHandler(async (req, res) => {
    const { professional_id: professionalId = null, user_id: userIdInput = null, booking_id: bookingId = null, initial_message: initialMessage = null } = req.body || {};

    const responseConversation = await withTransaction(async (client) => {
      let professional;
      let userId = null;
      let booking = null;

      if (req.user.role === "user") {
        if (!professionalId) badRequest("professional_id is required for user conversations");

        const proResult = await query(
          `SELECT p.*
           FROM professionals p
           JOIN users u ON u.id = p.user_id
           WHERE p.id = $1
             AND p.is_suspended = FALSE
             AND u.is_active = TRUE
             AND u.is_blocked = FALSE`,
          [professionalId],
          client
        );
        professional = proResult.rows[0];
        if (!professional) notFound("Professional not found");
        userId = req.user.id;
      } else {
        professional = await getProfessionalByUserId(req.user.id, client);
        if (!professional || professional.is_suspended) forbidden("Professional profile required");

        if (userIdInput) {
          const targetUserResult = await query(
            `SELECT id FROM users WHERE id = $1 AND role = 'user' AND is_active = TRUE AND is_blocked = FALSE`,
            [userIdInput],
            client
          );
          const targetUser = targetUserResult.rows[0];
          if (!targetUser) notFound("User not found");
          userId = targetUser.id;
        } else if (!bookingId) {
          badRequest("user_id is required when booking_id is not provided");
        }
      }

      if (bookingId) {
        const bookingResult = await query(`SELECT * FROM bookings WHERE id = $1`, [bookingId], client);
        booking = bookingResult.rows[0];
        if (!booking) notFound("Booking not found");

        if (req.user.role === "user") {
          if (booking.user_id !== req.user.id) forbidden("Access denied");
          if (booking.pro_id && booking.pro_id !== professional.id) {
            badRequest("Booking is not linked to the selected professional");
          }
          userId = booking.user_id;
        } else {
          if (booking.pro_id !== professional.id) forbidden("Access denied");
          if (userIdInput && userIdInput !== booking.user_id) {
            badRequest("booking_id and user_id do not belong to the same user");
          }
          userId = booking.user_id;
        }
      }

      if (!userId) badRequest("Unable to resolve conversation participants");

      const existing = await query(
        `SELECT *
         FROM conversations
         WHERE user_id = $1
           AND professional_id = $2
           AND ${booking ? "booking_id = $3" : "booking_id IS NULL"}
         LIMIT 1`,
        booking ? [userId, professional.id, booking.id] : [userId, professional.id],
        client
      );

      let conversation = existing.rows[0];
      if (!conversation) {
        const created = await query(
          `INSERT INTO conversations (id, user_id, professional_id, booking_id, created_by_user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
          [randomUUID(), userId, professional.id, booking ? booking.id : null, req.user.id],
          client
        );
        conversation = created.rows[0];

        const text = typeof initialMessage === "string" ? initialMessage.trim() : "";
        if (text) {
          await query(
            `INSERT INTO conversation_messages (id, conversation_id, sender_id, body, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [randomUUID(), conversation.id, req.user.id, text],
            client
          );

          const refreshed = await query(
            `UPDATE conversations
             SET last_message_preview = $2,
                 last_message_sender_id = $3,
                 last_message_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [conversation.id, text.slice(0, 280), req.user.id],
            client
          );
          conversation = refreshed.rows[0];
        }
      }

      const hydrated = await query(
        `SELECT c.*,
                u.id AS chat_user_id,
                u.name AS chat_user_name,
                u.avatar_url AS chat_user_avatar_url,
                p.user_id AS professional_user_id,
                p.specialty AS professional_specialty,
                pu.id AS pro_user_id,
                pu.name AS pro_user_name,
                pu.avatar_url AS pro_user_avatar_url
         FROM conversations c
         JOIN users u ON u.id = c.user_id
         JOIN professionals p ON p.id = c.professional_id
         JOIN users pu ON pu.id = p.user_id
         WHERE c.id = $1`,
        [conversation.id],
        client
      );

      return conversationResponse(hydrated.rows[0], req.user.role, 0);
    });

    res.json(responseConversation);
  })
);

app.get(
  "/api/v1/messages/conversations/:conversation_id/messages",
  requireAuth,
  requireMessagingRole,
  asyncHandler(async (req, res) => {
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));

    const conversation = await getConversationForActor(req.params.conversation_id, req.user);

    const result = await query(
      `SELECT m.*, s.name AS sender_name
       FROM conversation_messages m
       LEFT JOIN users s ON s.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       OFFSET $2 LIMIT $3`,
      [conversation.id, skip, limit]
    );

    const messages = result.rows.map((message) => ({
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender_name: message.sender_name,
      sender_role: message.sender_id === conversation.user_id ? "user" : "professional",
      body: message.body,
      read_at: message.read_at,
      created_at: message.created_at,
      is_mine: message.sender_id === req.user.id,
    }));

    res.json(messages);
  })
);

app.post(
  "/api/v1/messages/conversations/:conversation_id/messages",
  requireAuth,
  requireMessagingRole,
  asyncHandler(async (req, res) => {
    const text = String(req.body?.body || "").trim();
    if (!text) badRequest("Message cannot be empty");

    const message = await withTransaction(async (client) => {
      const conversation = await getConversationForActor(req.params.conversation_id, req.user, client);
      const inserted = await query(
        `INSERT INTO conversation_messages (id, conversation_id, sender_id, body, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [randomUUID(), conversation.id, req.user.id, text],
        client
      );

      await query(
        `UPDATE conversations
         SET last_message_preview = $2,
             last_message_sender_id = $3,
             last_message_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [conversation.id, text.slice(0, 280), req.user.id],
        client
      );

      return {
        message: inserted.rows[0],
        conversation,
      };
    });

    res.status(201).json({
      id: message.message.id,
      conversation_id: message.message.conversation_id,
      sender_id: message.message.sender_id,
      sender_name: req.user.name,
      sender_role: req.user.role === "user" ? "user" : "professional",
      body: message.message.body,
      read_at: message.message.read_at,
      created_at: message.message.created_at,
      is_mine: true,
    });
  })
);

app.post(
  "/api/v1/messages/conversations/:conversation_id/read",
  requireAuth,
  requireMessagingRole,
  asyncHandler(async (req, res) => {
    const conversation = await getConversationForActor(req.params.conversation_id, req.user);
    const result = await query(
      `UPDATE conversation_messages
       SET read_at = NOW(),
           updated_at = NOW()
       WHERE conversation_id = $1
         AND sender_id <> $2
         AND read_at IS NULL`,
      [conversation.id, req.user.id]
    );

    res.json({ updated: Number(result.rowCount || 0) });
  })
);

app.get(
  "/api/v1/admin/analytics",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const [usersCount, prosCount, bookingsCount, completedCount, cancelledCount, revenueCount, disputesCount, kycCount] = await Promise.all([
      query(`SELECT COUNT(id)::int AS count FROM users WHERE role = 'user'`),
      query(`SELECT COUNT(id)::int AS count FROM professionals`),
      query(`SELECT COUNT(id)::int AS count FROM bookings`),
      query(`SELECT COUNT(id)::int AS count FROM bookings WHERE status = 'completed'`),
      query(`SELECT COUNT(id)::int AS count FROM bookings WHERE status = 'cancelled'`),
      query(`SELECT COALESCE(SUM(amount), 0)::float AS amount FROM payments WHERE status = 'paid'`),
      query(`SELECT COUNT(id)::int AS count FROM disputes WHERE status = 'open'`),
      query(`SELECT COUNT(id)::int AS count FROM kyc_documents WHERE status = 'pending'`),
    ]);

    const totalBookings = bookingsCount.rows[0]?.count || 0;
    const cancelledBookings = cancelledCount.rows[0]?.count || 0;

    res.json({
      total_users: usersCount.rows[0]?.count || 0,
      total_professionals: prosCount.rows[0]?.count || 0,
      total_bookings: totalBookings,
      completed_bookings: completedCount.rows[0]?.count || 0,
      cancelled_bookings: cancelledBookings,
      cancellation_rate: totalBookings ? Number(((cancelledBookings / totalBookings) * 100).toFixed(2)) : 0,
      total_revenue: toNumber(revenueCount.rows[0]?.amount),
      open_disputes: disputesCount.rows[0]?.count || 0,
      pending_kyc: kycCount.rows[0]?.count || 0,
    });
  })
);

app.patch(
  "/api/v1/admin/users/:user_id/block",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await withTransaction(async (client) => {
      const userResult = await query(`SELECT id, email, role FROM users WHERE id = $1`, [req.params.user_id], client);
      const user = userResult.rows[0];
      if (!user) notFound("User not found");
      await assertAdminDeletionGuard(user.id, client);
      await query(`UPDATE users SET is_blocked = TRUE, updated_at = NOW() WHERE id = $1`, [user.id], client);
      res.json({ message: `User ${user.email} has been blocked` });
    });
  })
);

app.patch(
  "/api/v1/admin/users/:user_id/unblock",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userResult = await query(`SELECT id, email, is_active FROM users WHERE id = $1`, [req.params.user_id]);
    const user = userResult.rows[0];
    if (!user) notFound("User not found");
    if (!user.is_active) badRequest("Cannot unblock an inactive/deleted account");

    await query(`UPDATE users SET is_blocked = FALSE, updated_at = NOW() WHERE id = $1`, [user.id]);
    res.json({ message: `User ${user.email} has been unblocked` });
  })
);

app.patch(
  "/api/v1/admin/users/:user_id/suspend",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userResult = await query(
      `SELECT u.id, u.role, p.id AS professional_id
       FROM users u
       LEFT JOIN professionals p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.params.user_id]
    );
    const user = userResult.rows[0];
    if (!user) notFound("User not found");
    if (user.role !== "professional" || !user.professional_id) {
      badRequest("User is not a professional account");
    }

    await query(
      `UPDATE professionals
       SET is_suspended = TRUE,
           is_available = FALSE,
           updated_at = NOW()
       WHERE id = $1`,
      [user.professional_id]
    );

    res.json({ message: "Professional account suspended" });
  })
);

app.patch(
  "/api/v1/admin/users/:user_id/reinstate",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userResult = await query(
      `SELECT u.id, u.role, p.id AS professional_id
       FROM users u
       LEFT JOIN professionals p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.params.user_id]
    );
    const user = userResult.rows[0];
    if (!user) notFound("User not found");
    if (user.role !== "professional" || !user.professional_id) {
      badRequest("User is not a professional account");
    }

    await query(`UPDATE professionals SET is_suspended = FALSE, updated_at = NOW() WHERE id = $1`, [user.professional_id]);
    res.json({ message: "Professional account reinstated" });
  })
);

app.patch(
  "/api/v1/admin/professionals/:pro_id/suspend",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await query(`UPDATE professionals SET is_suspended = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id`, [req.params.pro_id]);
    if (!result.rows[0]) notFound("Professional not found");
    res.json({ message: "Professional suspended" });
  })
);

app.patch(
  "/api/v1/admin/professionals/:pro_id/reinstate",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await query(`UPDATE professionals SET is_suspended = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id`, [req.params.pro_id]);
    if (!result.rows[0]) notFound("Professional not found");
    res.json({ message: "Professional reinstated" });
  })
);

app.get(
  "/api/v1/admin/kyc",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const statusFilter = typeof req.query.status_filter === "string" ? req.query.status_filter : "pending";
    const result = await query(
      `SELECT * FROM kyc_documents WHERE status = $1 ORDER BY created_at ASC`,
      [statusFilter]
    );
    res.json(result.rows);
  })
);

app.patch(
  "/api/v1/admin/kyc/:doc_id/approve",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const actorUserId = getDbActorId(req.user);
    await withTransaction(async (client) => {
      const docResult = await query(`SELECT * FROM kyc_documents WHERE id = $1`, [req.params.doc_id], client);
      const doc = docResult.rows[0];
      if (!doc) notFound("KYC document not found");

      await query(
        `UPDATE kyc_documents
         SET status = 'approved',
             reviewed_by = $2,
             reviewed_at = NOW()
         WHERE id = $1`,
        [doc.id, actorUserId],
        client
      );

      const allDocs = await query(`SELECT status FROM kyc_documents WHERE pro_id = $1`, [doc.pro_id], client);
      if (allDocs.rows.length > 0 && allDocs.rows.every((x) => x.status === "approved")) {
        await query(`UPDATE professionals SET is_kyc_verified = TRUE, updated_at = NOW() WHERE id = $1`, [doc.pro_id], client);
      }
    });

    res.json({ message: "KYC document approved" });
  })
);

app.patch(
  "/api/v1/admin/kyc/:doc_id/reject",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const actorUserId = getDbActorId(req.user);
    const updated = await query(
      `UPDATE kyc_documents
       SET status = 'rejected',
           reviewed_by = $2,
           reviewed_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [req.params.doc_id, actorUserId]
    );
    if (!updated.rows[0]) notFound("KYC document not found");
    res.json({ message: "KYC document rejected" });
  })
);

app.get(
  "/api/v1/admin/users",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 200)));
    const role = typeof req.query.role === "string" ? req.query.role : null;

    const params = [];
    const where = ["u.is_active = TRUE"];
    if (role) {
      params.push(role);
      where.push(`u.role = $${params.length}`);
    }
    params.push(skip, limit);

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_blocked, u.is_email_verified, u.created_at,
              p.id AS professional_id,
              p.is_suspended AS is_suspended
       FROM users u
       LEFT JOIN professionals p ON p.user_id = u.id
       WHERE ${where.join(" AND ")}
       ORDER BY u.created_at DESC
       OFFSET $${params.length - 1}
       LIMIT $${params.length}`,
      params
    );

    res.json(result.rows.map(mapAdminAccount));
  })
);

app.patch(
  "/api/v1/admin/users/:user_id/grant-admin",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userResult = await query(
      `SELECT id, email, role, is_active, is_blocked FROM users WHERE id = $1`,
      [req.params.user_id]
    );
    const user = userResult.rows[0];
    if (!user) notFound("User not found");
    if (!user.is_active || user.is_blocked) {
      badRequest("Only active, unblocked users can be granted admin privileges");
    }
    if (user.role === "admin") {
      res.json({ message: `${user.email} is already an admin` });
      return;
    }

    await query(`UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`, [user.id]);
    res.json({ message: `${user.email} has been granted admin privileges` });
  })
);

app.delete(
  "/api/v1/admin/users/:user_id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await withTransaction(async (client) => {
      const userResult = await query(`SELECT id, role FROM users WHERE id = $1`, [req.params.user_id], client);
      const user = userResult.rows[0];
      if (!user) notFound("User not found");
      await assertAdminDeletionGuard(user.id, client);
      await softDeleteUserAccount(user, client);
    });

    res.json({ message: "Account deleted successfully" });
  })
);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ detail: `File too large. Max ${config.maxFileSizeMB}MB` });
    }
    return res.status(400).json({ detail: err.message });
  }
  if (err?.message?.includes("Not allowed by CORS")) {
    return res.status(403).json({ detail: "CORS origin blocked" });
  }
  return next(err);
});

app.use(errorMiddleware);

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const trackingRooms = new Map();

function addSocketToRoom(bookingId, ws) {
  const room = trackingRooms.get(bookingId) || new Set();
  room.add(ws);
  trackingRooms.set(bookingId, room);
}

function removeSocketFromRoom(bookingId, ws) {
  const room = trackingRooms.get(bookingId);
  if (!room) return;
  room.delete(ws);
  if (!room.size) {
    trackingRooms.delete(bookingId);
  }
}

async function validateTrackingAccess(bookingId, token) {
  if (!token) unauthorized("Missing token");
  const payload = decodeAccessToken(token);
  const userId = payload.sub;
  const role = payload.role;

  const bookingResult = await query(`SELECT id, user_id, pro_id, status FROM bookings WHERE id = $1`, [bookingId]);
  const booking = bookingResult.rows[0];
  if (!booking || booking.status !== "in_progress") {
    forbidden("Booking is not in progress");
  }

  if (role === "user") {
    if (booking.user_id !== userId) forbidden("Access denied");
  } else if (role === "professional") {
    const pro = await getProfessionalByUserId(userId);
    if (!pro || booking.pro_id !== pro.id) forbidden("Access denied");
  } else {
    forbidden("Access denied");
  }

  return { userId, role, booking };
}

server.on("upgrade", async (request, socket, head) => {
  try {
    const reqUrl = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    const match = reqUrl.pathname.match(/^\/api\/v1\/tracking\/([^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    const bookingId = match[1];
    const token = reqUrl.searchParams.get("token") || "";
    const context = await validateTrackingAccess(bookingId, token);

    request.trackingContext = { bookingId, ...context };

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } catch {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
  }
});

wss.on("connection", (ws, request) => {
  const tracking = request.trackingContext;
  if (!tracking) {
    ws.close();
    return;
  }

  ws.bookingId = tracking.bookingId;
  ws.userRole = tracking.role;
  ws.userId = tracking.userId;

  addSocketToRoom(ws.bookingId, ws);

  ws.on("message", async (data) => {
    if (ws.userRole !== "professional") return;

    let payload;
    try {
      payload = JSON.parse(String(data));
    } catch {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ error: "Invalid location format" }));
      }
      return;
    }

    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ error: "Invalid location format" }));
      }
      return;
    }

    try {
      await query(`UPDATE professionals SET latitude = $2, longitude = $3, updated_at = NOW() WHERE user_id = $1`, [ws.userId, lat, lng]);
      const room = trackingRooms.get(ws.bookingId);
      if (!room) return;

      const outbound = JSON.stringify({
        booking_id: ws.bookingId,
        lat,
        lng,
        ts: new Date().toISOString(),
      });

      for (const peer of room) {
        if (peer === ws) continue;
        if (peer.readyState === WebSocket.OPEN) {
          peer.send(outbound);
        }
      }
    } catch {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ error: "Failed to process location" }));
      }
    }
  });

  ws.on("close", () => {
    removeSocketFromRoom(ws.bookingId, ws);
  });

  ws.on("error", () => {
    removeSocketFromRoom(ws.bookingId, ws);
  });
});

async function start() {
  ensureUploadsRoot();
  await initDb();
  server.listen(config.port, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(`Servify Express API running on port ${config.port}`);
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
