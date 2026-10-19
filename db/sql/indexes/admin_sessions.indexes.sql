-- Fast lookup for session validation
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_sessions_token_hash 
ON admin_sessions (token_hash);

-- Fast lookup for finding all sessions for a specific admin
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id 
ON admin_sessions (admin_id);

-- Fast lookup for background cleanup jobs (deleting expired sessions)
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at 
ON admin_sessions (expires_at) 
WHERE revoked_at IS NULL;