CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    attendance VARCHAR(10) NOT NULL CHECK (attendance IN ('yes', 'no', 'maybe')),
    adults_count INT DEFAULT 1,
    kids_count INT DEFAULT 0,
    comments TEXT,
    edit_token UUID DEFAULT gen_random_uuid() UNIQUE, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);