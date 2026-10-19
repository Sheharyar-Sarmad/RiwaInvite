-- Fast lookup for login (email) and duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email_lower 
ON admins (LOWER(email));

-- Fast lookup by account name
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_account_name_lower 
ON admins (LOWER(account_name));

-- Fast lookup by phone number (if you ever need to search by it)
CREATE INDEX IF NOT EXISTS idx_admins_phone_number 
ON admins (phone_number);