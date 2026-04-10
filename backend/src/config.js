import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

function asBool(value, fallback = false) {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDatabaseUrl(url) {
  if (!url) return "";
  return url.replace("postgresql+asyncpg://", "postgresql://");
}

const backendRoot = process.cwd();

export const config = {
  appName: process.env.APP_NAME || "Servify",
  appEnv: process.env.APP_ENV || "development",
  debug: asBool(process.env.DEBUG, true),
  port: asNumber(process.env.PORT, 8000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  corsOrigins: process.env.CORS_ORIGINS || "",
  autoCreateTables: asBool(process.env.AUTO_CREATE_TABLES, true),
  databaseUrl: normalizeDatabaseUrl(process.env.DATABASE_URL || ""),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  secretKey: process.env.SECRET_KEY || "dev-secret-key-change-me",
  algorithm: process.env.ALGORITHM || "HS256",
  accessTokenExpireMinutes: asNumber(process.env.ACCESS_TOKEN_EXPIRE_MINUTES, 30),
  refreshTokenExpireDays: asNumber(process.env.REFRESH_TOKEN_EXPIRE_DAYS, 7),
  emailSecretKey: process.env.EMAIL_SECRET_KEY || process.env.SECRET_KEY || "dev-email-secret",
  mailUsername: process.env.MAIL_USERNAME || "",
  mailPassword: process.env.MAIL_PASSWORD || "",
  mailFrom: process.env.MAIL_FROM || "noreply@servify.com",
  mailFromName: process.env.MAIL_FROM_NAME || "Servify",
  mailPort: asNumber(process.env.MAIL_PORT, 1025),
  mailServer: process.env.MAIL_SERVER || "localhost",
  mailStartTls: asBool(process.env.MAIL_STARTTLS, false),
  mailSslTls: asBool(process.env.MAIL_SSL_TLS, false),
  uploadDir: path.resolve(backendRoot, process.env.UPLOAD_DIR || "uploads"),
  maxFileSizeMB: asNumber(process.env.MAX_FILE_SIZE_MB, 10),
  platformFee: asNumber(process.env.PLATFORM_FEE, 49),
  defaultCommissionRate: asNumber(process.env.DEFAULT_COMMISSION_RATE, 0.2),
  gstRate: asNumber(process.env.GST_RATE, 0.18),
  rateLimitPerMinute: asNumber(process.env.RATE_LIMIT_PER_MINUTE, 60),
  authRateLimitPerMinute: asNumber(process.env.AUTH_RATE_LIMIT_PER_MINUTE, 5),
};

function isPrivateIpv4(hostname) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false;
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;

  // RFC1918 private ranges for local network testing.
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

export function getCorsOrigins() {
  const origins = [
    config.frontendUrl,
    ...String(config.corsOrigins)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    "http://localhost:3000",
    "http://localhost:5173",
  ];
  return [...new Set(origins)];
}

export function isDevLanOrigin(origin) {
  try {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol)) return false;

    const host = (url.hostname || "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;

    return isPrivateIpv4(host);
  } catch {
    return false;
  }
}

export const isProduction = config.appEnv === "production";
