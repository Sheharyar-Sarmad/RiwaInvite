CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES template_categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    thumbnail_url TEXT NOT NULL,
    
    gallery_urls JSONB DEFAULT '[]'::jsonb,
    video_urls JSONB DEFAULT '[]'::jsonb,
    music_urls JSONB DEFAULT '[]'::jsonb,
    
    core_names_config JSONB NOT NULL,
    
    is_premium BOOLEAN DEFAULT FALSE,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    custom_slug_price DECIMAL(10,2) NOT NULL DEFAULT 1000.00, 
    
    status template_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);