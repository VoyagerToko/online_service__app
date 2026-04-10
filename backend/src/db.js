import { Pool } from "pg";
import { config } from "./config.js";
import { ApiError } from "./errors.js";

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

export async function query(text, params = [], client = pool) {
  return client.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    avatar_url VARCHAR(500),
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    google_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS professionals (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty VARCHAR(255) NOT NULL,
    bio TEXT,
    experience_years INTEGER NOT NULL DEFAULT 0,
    base_location VARCHAR(500),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    avg_rating DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_ratings INTEGER NOT NULL DEFAULT 0,
    total_jobs INTEGER NOT NULL DEFAULT 0,
    commission_rate DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS professional_public_profiles (
    id VARCHAR(36) PRIMARY KEY,
    professional_id VARCHAR(36) UNIQUE NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    starting_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    public_phone VARCHAR(30),
    public_email VARCHAR(320),
    whatsapp_number VARCHAR(30),
    website_url VARCHAR(500),
    contact_address TEXT,
    photo_urls_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DOUBLE PRECISION NOT NULL,
    icon VARCHAR(100) NOT NULL,
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    requires_inspection BOOLEAN NOT NULL DEFAULT FALSE,
    avg_rating DOUBLE PRECISION NOT NULL DEFAULT 0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    service_id VARCHAR(36) REFERENCES services(id),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    pro_id VARCHAR(36) REFERENCES professionals(id),
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'requested',
    scheduled_date DATE NOT NULL,
    time_slot VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    base_price NUMERIC(10, 2) NOT NULL,
    addons JSONB,
    platform_fee NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    reschedule_count INTEGER NOT NULL DEFAULT 0,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS booking_status_timeline (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    changed_by VARCHAR(36) REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) UNIQUE NOT NULL REFERENCES bookings(id),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    amount NUMERIC(10, 2) NOT NULL,
    platform_commission NUMERIC(10, 2) NOT NULL DEFAULT 0,
    pro_payout NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    gateway_ref VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    reason TEXT,
    booking_id VARCHAR(36) REFERENCES bookings(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) UNIQUE NOT NULL REFERENCES bookings(id),
    reviewer_id VARCHAR(36) NOT NULL REFERENCES users(id),
    reviewee_id VARCHAR(36) NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_review_rating CHECK (rating >= 1 AND rating <= 5)
  )`,
  `CREATE TABLE IF NOT EXISTS disputes (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) UNIQUE NOT NULL REFERENCES bookings(id),
    raised_by VARCHAR(36) NOT NULL REFERENCES users(id),
    against_id VARCHAR(36) NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    resolution TEXT,
    refund_amount NUMERIC(10, 2),
    resolved_by VARCHAR(36) REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS dispute_evidence (
    id VARCHAR(36) PRIMARY KEY,
    dispute_id VARCHAR(36) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    uploaded_by VARCHAR(36) NOT NULL REFERENCES users(id),
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professional_id VARCHAR(36) NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    booking_id VARCHAR(36) REFERENCES bookings(id) ON DELETE SET NULL,
    created_by_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    last_message_preview TEXT,
    last_message_sender_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS conversation_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS availability_slots (
    id VARCHAR(36) PRIMARY KEY,
    pro_id VARCHAR(36) NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS kyc_documents (
    id VARCHAR(36) PRIMARY KEY,
    pro_id VARCHAR(36) NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    doc_type VARCHAR(100) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    reviewed_by VARCHAR(36) REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  "CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_bookings_pro_id ON bookings(pro_id)",
  "CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)",
  "CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id)",
  "CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)",
  "CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON conversation_messages(conversation_id)",
  "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
];

export async function initDb() {
  if (!config.autoCreateTables) return;
  const client = await pool.connect();
  try {
    for (const sql of TABLES_SQL) {
      await client.query(sql);
    }
  } catch (error) {
    throw new ApiError(500, `Database initialization failed: ${error.message}`);
  } finally {
    client.release();
  }
}
