CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PKR',
    status order_status NOT NULL DEFAULT 'pending',
    provider VARCHAR(20) NOT NULL, 
    provider_txn_id VARCHAR(255) UNIQUE, 
    
    -- NEW: Prevents double-charging on checkout
    idempotency_key VARCHAR(255) UNIQUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);