-- Run this in the Supabase SQL Editor (Project Settings → SQL Editor)

-- 1. Add new columns to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS announcement TEXT;

-- 2. Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  details TEXT
);

-- 3. Additional users table (lets multiple logins share one dashboard)
CREATE TABLE IF NOT EXISTS client_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, user_id)
);
