CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    template_body_id UUID REFERENCES template_bodies(id) ON DELETE SET NULL,
    
    title VARCHAR(100) NOT NULL,
    invitation_date DATE NOT NULL,
    
    slug VARCHAR(100) NOT NULL UNIQUE DEFAULT (gen_random_uuid()::text),
    is_custom_slug BOOLEAN NOT NULL DEFAULT FALSE, 
    
    design_schema JSONB NOT NULL,
    selected_video_urls JSONB DEFAULT '[]'::jsonb,
    selected_music_url TEXT, 
    
    status invitation_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, 
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);