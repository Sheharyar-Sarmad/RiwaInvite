CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Required for gen_random_uuid()

CREATE TYPE template_status AS ENUM ('draft', 'published', 'archived');
