-- User service schema
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  monthly_income NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monthly_income >= 0),
  age INTEGER CHECK (age IS NULL OR age > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  city VARCHAR(100),
  occupation VARCHAR(100),
  risk_tolerance VARCHAR(20) NOT NULL DEFAULT 'moderate'
    CHECK (risk_tolerance IN ('low', 'moderate', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id);
