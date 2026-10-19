-- Sessions: Proxy validation, Bulk logout, and Cron cleanup
CREATE UNIQUE INDEX idx_admin_sessions_token_hash ON admin_sessions (token_hash);
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions (admin_id);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions (expires_at);