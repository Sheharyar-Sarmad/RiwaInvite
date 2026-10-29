-- ==========================================
-- 1. EXTENSIONS & ENUMS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Safe creation of ENUMs (prevents errors if script is run twice)
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
-- 3. TABLES (Ordered by dependencies)
-- ==========================================

-- INDEPENDENT TABLES
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

-- SESSIONS
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

-- TEMPLATES
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

CREATE TABLE IF NOT EXISTS template_bodies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    design_schema JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, version)
);

-- ORDERS & SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(20) NOT NULL,
    provider_order_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    reference_id UUID NOT NULL,
    status order_status DEFAULT 'pending', -- Changed to use ENUM
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
    purchased_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, template_id) 
);

-- Note: Kept your original `subscriptions` table, but `user_subscriptions` is the one used for the Paywall logic.
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

-- INVITATIONS & GUESTS
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

-- ==========================================
-- 4. INDEXES
-- ==========================================
-- Admin & Auth
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email_lower ON admins (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_account_name_lower ON admins (LOWER(account_name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions (expires_at) WHERE revoked_at IS NULL;

-- Users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);

-- Templates
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_categories_slug ON template_categories(slug);
CREATE INDEX IF NOT EXISTS idx_template_categories_name ON template_categories(name);
CREATE INDEX IF NOT EXISTS idx_template_categories_name_trgm ON template_categories USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_template_categories_slug_trgm ON template_categories USING GIN (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_is_premium ON templates(is_premium) WHERE is_premium = TRUE;
CREATE INDEX IF NOT EXISTS idx_template_bodies_template ON template_bodies(template_id);

-- Orders & Subscriptions
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions (user_id, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions (user_id);

-- Invitations & Guests
CREATE INDEX IF NOT EXISTS idx_invitations_user ON invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_guests_invitation ON guests(invitation_id);
CREATE INDEX IF NOT EXISTS idx_guests_attendance ON guests(invitation_id, attendance_status); -- Fixed column name
CREATE INDEX IF NOT EXISTS idx_guests_created_at ON guests(invitation_id, created_at DESC);

-- ==========================================
-- 5. TRIGGERS
-- ==========================================
-- Max 2 Admins
DROP TRIGGER IF EXISTS trigger_max_two_admins ON admins;
CREATE TRIGGER trigger_max_two_admins BEFORE INSERT ON admins FOR EACH ROW EXECUTE FUNCTION enforce_max_two_admins();

-- Invitations Logic
DROP TRIGGER IF EXISTS trg_validate_invitation_date ON invitations;
CREATE TRIGGER trg_validate_invitation_date BEFORE INSERT OR UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION validate_invitation_date();

DROP TRIGGER IF EXISTS trg_set_invitation_expiry ON invitations;
CREATE TRIGGER trg_set_invitation_expiry BEFORE INSERT OR UPDATE OF event_date ON invitations FOR EACH ROW EXECUTE FUNCTION set_invitation_expiry(); -- Fixed column name

-- Updated At Triggers (Applied to all tables with `updated_at`)
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

-- 1. Create the ENUM type
DO $$ 
BEGIN 
    CREATE TYPE admin_notification_type AS ENUM ('order', 'user', 'system', 'alert'); 
EXCEPTION 
    WHEN duplicate_object THEN null; 
END $$;

-- 2. Create the table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE, -- NULL means broadcast to all admins
    type admin_notification_type NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create the indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin 
    ON admin_notifications(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread 
    ON admin_notifications(admin_id) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created 
    ON admin_notifications(created_at DESC);

-- 1. Create the ENUM type
DO $$ 
BEGIN 
    CREATE TYPE admin_notification_type AS ENUM ('order', 'user', 'system', 'alert'); 
EXCEPTION 
    WHEN duplicate_object THEN null; 
END $$;

-- 2. Create the table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE, -- NULL means broadcast to all admins
    type admin_notification_type NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create the indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin 
    ON admin_notifications(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread 
    ON admin_notifications(admin_id) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created 
    ON admin_notifications(created_at DESC);

-- 1. ORDERS: Speeds up COUNT(*) and MAX(created_at)
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
  ON orders (user_id, created_at DESC);

-- 2. INVITATIONS: Speeds up the COUNT(*) FILTER (WHERE status = 'published')
CREATE INDEX IF NOT EXISTS idx_invitations_user_status 
  ON invitations (user_id, status, expires_at);

-- 3. USER_SUBSCRIPTIONS: Speeds up fetching the latest active plan
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_expires 
  ON user_subscriptions (user_id, expires_at DESC);

-- 4. TEMPLATE_PURCHASES: Speeds up the purchase count
-- (Your schema has UNIQUE(user_id, template_id), which covers this, 
-- but adding an explicit index guarantees the planner uses it for counts)
CREATE INDEX IF NOT EXISTS idx_template_purchases_user 
  ON template_purchases (user_id);

-- 5. USERS: Speeds up the search (ILIKE) and Deleted filter
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Ensure this is enabled
CREATE INDEX IF NOT EXISTS idx_users_search_trgm 
  ON users USING GIN (
    first_name gin_trgm_ops, 
    last_name gin_trgm_ops, 
    email gin_trgm_ops, 
    phone_number gin_trgm_ops
  );
CREATE INDEX IF NOT EXISTS idx_users_deleted_marker 
  ON users (id) WHERE email LIKE '%@deleted.riwainvite.local';

-- 1. Index for the subquery count (CRITICAL)
-- This makes counting active subscribers instant.
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id 
  ON user_subscriptions (plan_id);

-- 2. Index for sorting plans by date
CREATE INDEX IF NOT EXISTS idx_plans_created_at 
  ON plans (created_at DESC);

-- 3. Trigram index for fast plan searching (ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_plans_name_trgm 
  ON plans USING GIN (name gin_trgm_ops);

-- 4. Partial index for active plans
CREATE INDEX IF NOT EXISTS idx_plans_is_active 
  ON plans (is_active) WHERE is_active = TRUE;

-- ==========================================
-- 6. SUBSCRIPTIONS TABLE OPTIMIZATION
-- ==========================================

-- 1. Speeds up pagination sorting (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_user_subs_created_at 
  ON user_subscriptions (created_at DESC);

-- 2. Superpower Index: Speeds up filtering by status AND sorting by date in one step
CREATE INDEX IF NOT EXISTS idx_user_subs_status_created 
  ON user_subscriptions (status, created_at DESC);