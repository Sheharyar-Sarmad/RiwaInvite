CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL, -- 'subscription', 'template_purchase', 'custom_slug', 'whatsapp_credits'
    item_id UUID, -- Links to template ID, subscription ID, etc. (nullable for credits)
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);