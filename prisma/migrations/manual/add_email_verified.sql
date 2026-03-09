-- Add email_verified field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Mark existing owners as verified (they registered before verification existed)
UPDATE users SET email_verified = true WHERE role = 'owner';
