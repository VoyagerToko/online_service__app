import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { config } from "./config.js";
import { forbidden, unauthorized } from "./errors.js";
import { query } from "./db.js";

function tokenSecret(salt = "") {
  return salt ? `${config.emailSecretKey}:${salt}` : config.secretKey;
}

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hashed) {
  try {
    return bcrypt.compareSync(plain, hashed || "");
  } catch {
    return false;
  }
}

export function createAccessToken(subject, extra = {}) {
  return jwt.sign(
    { sub: subject, type: "access", ...extra },
    config.secretKey,
    {
      algorithm: config.algorithm,
      expiresIn: `${config.accessTokenExpireMinutes}m`,
    }
  );
}

export function createRefreshToken(subject) {
  return jwt.sign(
    { sub: subject, type: "refresh" },
    config.secretKey,
    {
      algorithm: config.algorithm,
      expiresIn: `${config.refreshTokenExpireDays}d`,
    }
  );
}

export function decodeAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.secretKey, { algorithms: [config.algorithm] });
    if (payload.type !== "access") {
      unauthorized("Invalid token type");
    }
    return payload;
  } catch {
    unauthorized("Could not validate credentials");
  }
}

export function decodeRefreshToken(token) {
  try {
    const payload = jwt.verify(token, config.secretKey, { algorithms: [config.algorithm] });
    if (payload.type !== "refresh") {
      unauthorized("Invalid token type");
    }
    return payload;
  } catch {
    unauthorized("Invalid refresh token");
  }
}

export function generateEmailToken(email, salt = "email-verify", maxAgeSeconds = 86400) {
  return jwt.sign(
    { email, salt, type: "email" },
    tokenSecret(salt),
    {
      algorithm: config.algorithm,
      expiresIn: maxAgeSeconds,
    }
  );
}

export function verifyEmailToken(token, salt = "email-verify") {
  try {
    const payload = jwt.verify(token, tokenSecret(salt), { algorithms: [config.algorithm] });
    if (payload.type !== "email" || payload.salt !== salt || !payload.email) {
      unauthorized("Invalid or tampered token");
    }
    return payload.email;
  } catch (error) {
    const msg = error?.name === "TokenExpiredError" ? "Token has expired" : "Invalid or tampered token";
    unauthorized(msg);
  }
}

export async function requireAuth(req, _res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      unauthorized("Not authenticated");
    }
    const token = auth.slice("Bearer ".length).trim();
    const payload = decodeAccessToken(token);
    const result = await query(
      `SELECT id, name, email, phone, role, avatar_url, wallet_balance, is_active, is_email_verified, is_blocked, created_at
       FROM users WHERE id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user) {
      unauthorized("User not found");
    }
    if (!user.is_active || user.is_blocked) {
      forbidden("Account is inactive or blocked");
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden(`Access denied. Required roles: ${roles.join(", ")}`));
    }
    return next();
  };
}

export const requireAdmin = requireRole("admin");
