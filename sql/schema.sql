DO $$ BEGIN
  CREATE TYPE user_type_enum AS ENUM ('customer', 'vendor', 'both');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  trade_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE,
  user_type user_type_enum NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
