CREATE TABLE IF NOT EXISTS admins (
    -- Primary Key: UUID is natively supported in Neon PostgreSQL
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Columns
    account_name VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Regex & Data Validation Constraints
    CONSTRAINT check_account_name_format 
        CHECK (account_name ~ '^[a-zA-Z0-9_]{3,30}$'),
        
    CONSTRAINT check_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
        
    CONSTRAINT check_phone_format 
        CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$'),
        
    CONSTRAINT check_first_name_length 
        CHECK (char_length(first_name) >= 2),
        
    CONSTRAINT check_last_name_length 
        CHECK (char_length(last_name) >= 2)
);