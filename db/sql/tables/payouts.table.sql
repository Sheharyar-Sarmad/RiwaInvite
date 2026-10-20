CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_amount DECIMAL(10,2) NOT NULL,
    status payout_status NOT NULL DEFAULT 'pending',
    payout_method VARCHAR(50), 
    reference_id VARCHAR(100), 
    
    -- NEW: Ensures the same payout batch isn't processed twice
    idempotency_key VARCHAR(255) UNIQUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);