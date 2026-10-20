CREATE TABLE IF NOT EXISTS users (
    -- Primary Key: UUID is natively supported in Neon PostgreSQL
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Columns
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone_number VARCHAR(20), -- Optional as per context
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Regex & Data Validation Constraints
    CONSTRAINT check_user_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
        
    CONSTRAINT check_user_phone_format 
        CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$'),
        
    CONSTRAINT check_user_first_name_length 
        CHECK (char_length(first_name) >= 2),
        
    CONSTRAINT check_user_last_name_length 
        CHECK (char_length(last_name) >= 2)
);




-- Users: Fast login (using LOWER to prevent case-sensitivity issues just like admins)
CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));