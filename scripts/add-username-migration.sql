-- Migration: Add username column to users table
-- Run BEFORE prisma db push (or use prisma db push with --accept-data-loss if safe)

-- Step 1: Add username column (nullable first)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Step 2: Set username for owners → 'admin'
UPDATE users SET username = 'admin' WHERE role = 'owner' AND username IS NULL;

-- Step 3: Set username for staff → lowercase first name
UPDATE users SET username = LOWER(SPLIT_PART(name, ' ', 1)) WHERE role != 'owner' AND username IS NULL;

-- Step 4: Make username NOT NULL
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Step 5: Drop old unique constraint and add new one
ALTER TABLE users DROP CONSTRAINT IF EXISTS "users_tenant_id_email_key";
ALTER TABLE users ADD CONSTRAINT "users_tenant_id_username_key" UNIQUE (tenant_id, username);

-- Step 6: Make email nullable
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Step 7: Add index on email for login lookup
CREATE INDEX IF NOT EXISTS "users_email_idx" ON users (email);
