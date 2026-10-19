-- Admins: Login and uniqueness
CREATE UNIQUE INDEX idx_admins_email_lower ON admins (LOWER(email));
CREATE UNIQUE INDEX idx_admins_account_name_lower ON admins (LOWER(account_name));