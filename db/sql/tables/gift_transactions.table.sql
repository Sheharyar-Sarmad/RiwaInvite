CREATE TABLE IF NOT EXISTS gift_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    guest_name VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PKR',
    provider VARCHAR(20) NOT NULL,
    provider_txn_id VARCHAR(255) UNIQUE,
    
    -- NEW: Prevents duplicate Salami charges
    idempotency_key VARCHAR(255) UNIQUE,
    
    status order_status NOT NULL DEFAULT 'pending',
    platform_fee DECIMAL(10,2),
    host_payout_amount DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);