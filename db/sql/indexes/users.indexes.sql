-- Users: Fast login (using LOWER to prevent case-sensitivity issues just like admins)
CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));