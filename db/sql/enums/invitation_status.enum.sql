CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Required for gen_random_uuid()

CREATE TYPE invitation_status AS ENUM ('draft', 'published', 'expired', 'archived');
