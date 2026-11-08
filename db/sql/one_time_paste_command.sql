-- ==========================================
-- 1. EXTENSIONS & ENUMS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('draft', 'published', 'expired', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE template_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==========================================
-- 2. DATABASE FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION enforce_max_two_admins()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM admins) >= 2 THEN
        RAISE EXCEPTION 'Hard limit reached: Maximum of 2 admin accounts are allowed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_invitation_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' THEN
        NEW.expires_at := NEW.event_date + INTERVAL '5 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_invitation_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_date > CURRENT_DATE + INTERVAL '2 months' THEN
        RAISE EXCEPTION 'Event date cannot be more than 2 months in the future.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. TABLES
-- ==========================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_account_name_format CHECK (account_name ~ '^[a-zA-Z0-9_]{3,30}$'),
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT check_phone_format CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT check_first_name_length CHECK (char_length(first_name) >= 2),
    CONSTRAINT check_last_name_length CHECK (char_length(last_name) >= 2)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_user_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT check_user_phone_format CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT check_user_first_name_length CHECK (char_length(first_name) >= 2),
    CONSTRAINT check_user_last_name_length CHECK (char_length(last_name) >= 2)
);

CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INT NOT NULL,
    max_simple_templates INT DEFAULT 3,
    max_premium_templates INT DEFAULT 3,
    allows_custom_slug BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT check_session_expiry CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT check_user_session_expiry CHECK (expires_at > created_at)
);

-- TEMPLATES (fixed: no duplicate columns)
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
    allows_custom_slug BOOLEAN NOT NULL DEFAULT TRUE,
    status template_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Safe-alter for existing installs
ALTER TABLE templates ADD COLUMN IF NOT EXISTS custom_slug_price DECIMAL(10,2) NOT NULL DEFAULT 1000.00;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS allows_custom_slug BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS template_bodies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    design_schema JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, version)
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(20) NOT NULL,
    provider_order_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    reference_id UUID NOT NULL,
    preferred_slug VARCHAR(100),
    has_custom_slug BOOLEAN NOT NULL DEFAULT FALSE,
    status order_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_custom_slug BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL,
    item_id UUID,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    price_paid DECIMAL(10,2) NOT NULL,
    has_custom_slug BOOLEAN NOT NULL DEFAULT FALSE,
    purchased_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, template_id)
);

ALTER TABLE template_purchases ADD COLUMN IF NOT EXISTS has_custom_slug BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(50) NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_sub_id VARCHAR(255) UNIQUE,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status subscription_status NOT NULL DEFAULT 'active',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    provider VARCHAR(20) NOT NULL DEFAULT 'manual',
    provider_sub_id VARCHAR(255) UNIQUE,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_subscriptions_period_check CHECK (expires_at > starts_at)
);

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    template_body_id UUID REFERENCES template_bodies(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    venue_details JSONB DEFAULT '{}'::jsonb,
    slug VARCHAR(100) NOT NULL UNIQUE DEFAULT (gen_random_uuid()::text),
    is_custom_slug BOOLEAN NOT NULL DEFAULT FALSE,
    design_schema JSONB NOT NULL,
    selected_music_url TEXT,
    status invitation_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    guest_name VARCHAR(100) NOT NULL,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    number_of_guests INT DEFAULT 1,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'received',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    CREATE TYPE admin_notification_type AS ENUM ('order', 'user', 'system', 'alert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    type admin_notification_type NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. INDEXES
-- ==========================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email_lower ON admins (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_account_name_lower ON admins (LOWER(account_name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions (expires_at) WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_categories_slug ON template_categories(slug);
CREATE INDEX IF NOT EXISTS idx_template_categories_name ON template_categories(name);
CREATE INDEX IF NOT EXISTS idx_template_categories_name_trgm ON template_categories USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_template_categories_slug_trgm ON template_categories USING GIN (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_is_premium ON templates(is_premium) WHERE is_premium = TRUE;
CREATE INDEX IF NOT EXISTS idx_templates_allows_custom_slug ON templates(allows_custom_slug) WHERE allows_custom_slug = TRUE;
CREATE INDEX IF NOT EXISTS idx_template_bodies_template ON template_bodies(template_id);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions (user_id, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prevent_double_pending ON orders (user_id, reference_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_user ON invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_guests_invitation ON guests(invitation_id);
CREATE INDEX IF NOT EXISTS idx_guests_attendance ON guests(invitation_id, attendance_status);
CREATE INDEX IF NOT EXISTS idx_guests_created_at ON guests(invitation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(admin_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_user_status ON invitations (user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_expires ON user_subscriptions (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_purchases_user ON template_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_users_search_trgm ON users USING GIN (first_name gin_trgm_ops, last_name gin_trgm_ops, email gin_trgm_ops, phone_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_deleted_marker ON users (id) WHERE email LIKE '%@deleted.riwainvite.local';
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_name_trgm ON plans USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_subs_created_at ON user_subscriptions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_subs_status_created ON user_subscriptions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON payment_logs (status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_provider ON payment_logs (provider);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_invitations_user_recent ON invitations (user_id, created_at DESC);

-- Custom-slug partial indexes
CREATE INDEX IF NOT EXISTS idx_template_purchases_custom_slug ON template_purchases (user_id, template_id) WHERE has_custom_slug = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_custom_slug_paid ON orders (user_id, created_at DESC) WHERE has_custom_slug = TRUE AND status = 'completed';
CREATE INDEX IF NOT EXISTS idx_orders_preferred_slug ON orders (LOWER(preferred_slug)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_orders_pending_cron ON orders (status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_logs_event ON payment_logs(event_id);

-- ==========================================
-- 5. TRIGGERS
-- ==========================================
DROP TRIGGER IF EXISTS trigger_max_two_admins ON admins;
CREATE TRIGGER trigger_max_two_admins BEFORE INSERT ON admins FOR EACH ROW EXECUTE FUNCTION enforce_max_two_admins();

DROP TRIGGER IF EXISTS trg_validate_invitation_date ON invitations;
CREATE TRIGGER trg_validate_invitation_date BEFORE INSERT OR UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION validate_invitation_date();

-- Fires on event_date OR status change (draft -> published without touching date still sets expiry)
DROP TRIGGER IF EXISTS trg_set_invitation_expiry ON invitations;
CREATE TRIGGER trg_set_invitation_expiry BEFORE INSERT OR UPDATE OF event_date, status ON invitations FOR EACH ROW EXECUTE FUNCTION set_invitation_expiry();

DROP TRIGGER IF EXISTS trg_update_template_categories_updated_at ON template_categories;
CREATE TRIGGER trg_update_template_categories_updated_at BEFORE UPDATE ON template_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_invitations_updated_at ON invitations;
CREATE TRIGGER trg_update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_templates_updated_at ON templates;
CREATE TRIGGER trg_update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_plans_updated_at ON plans;
CREATE TRIGGER trg_update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER trg_update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_orders_updated_at ON orders;
CREATE TRIGGER trg_update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. MATERIALIZED VIEWS
-- ==========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public_marquee_templates_view AS
SELECT
  t.id,
  t.name,
  t.description,
  t.thumbnail_url AS "thumbnailUrl",
  t.gallery_urls AS "galleryUrls",
  t.video_urls AS "videoUrls",
  t.music_urls AS "musicUrls",
  t.is_premium AS "isPremium",
  (t.price)::float AS "price",
  (t.custom_slug_price)::float AS "customSlugPrice",
  t.allows_custom_slug AS "allowsCustomSlug",
  c.name AS "categoryName",
  tb.design_schema AS "design_schema",
  t.created_at
FROM templates t
JOIN template_categories c ON t.category_id = c.id
LEFT JOIN LATERAL (
  SELECT design_schema
  FROM template_bodies
  WHERE template_id = t.id
  ORDER BY version DESC
  LIMIT 1
) tb ON true
WHERE t.status = 'published';

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_marquee_view_id ON public_marquee_templates_view (id);

CREATE OR REPLACE FUNCTION refresh_public_marquee_templates()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public_marquee_templates_view;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_marquee_templates ON templates;
CREATE TRIGGER trg_refresh_marquee_templates
AFTER INSERT OR UPDATE OR DELETE ON templates
FOR EACH STATEMENT EXECUTE FUNCTION refresh_public_marquee_templates();

DROP TRIGGER IF EXISTS trg_refresh_marquee_bodies ON template_bodies;
CREATE TRIGGER trg_refresh_marquee_bodies
AFTER INSERT OR UPDATE OR DELETE ON template_bodies
FOR EACH STATEMENT EXECUTE FUNCTION refresh_public_marquee_templates();

DROP TRIGGER IF EXISTS trg_refresh_marquee_categories ON template_categories;
CREATE TRIGGER trg_refresh_marquee_categories
AFTER UPDATE ON template_categories
FOR EACH STATEMENT EXECUTE FUNCTION refresh_public_marquee_templates();

CREATE MATERIALIZED VIEW IF NOT EXISTS public_active_plans_view AS
SELECT
  id,
  name,
  description,
  price,
  duration_days,
  max_simple_templates,
  max_premium_templates,
  allows_custom_slug,
  created_at
FROM plans
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_plans_view_id ON public_active_plans_view (id);

CREATE OR REPLACE FUNCTION refresh_public_plans()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public_active_plans_view;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_public_plans ON plans;
CREATE TRIGGER trg_refresh_public_plans
AFTER INSERT OR UPDATE OR DELETE ON plans
FOR EACH STATEMENT EXECUTE FUNCTION refresh_public_plans();