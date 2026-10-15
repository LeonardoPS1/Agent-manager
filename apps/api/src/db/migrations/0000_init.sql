-- Aicore Office - initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(64) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  role varchar(80),
  model varchar(120),
  system_prompt text,
  desk_id varchar(32),
  appearance jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_url text,
  webhook_secret varchar(64),
  token_hash varchar(255) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agents_slug_idx ON agents (slug);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'queued',
  priority varchar(8) NOT NULL DEFAULT 'med',
  progress integer DEFAULT 0,
  context text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_agent_status_idx ON tasks (agent_id, status);

CREATE TABLE IF NOT EXISTS events (
  id bigserial PRIMARY KEY,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  type varchar(32) NOT NULL,
  payload jsonb NOT NULL,
  source varchar(32),
  meta jsonb DEFAULT '{}'::jsonb,
  ts timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_agent_ts_idx ON events (agent_id, ts);
CREATE INDEX IF NOT EXISTS events_type_idx ON events (type);

CREATE TABLE IF NOT EXISTS messages (
  id bigserial PRIMARY KEY,
  thread_id uuid,
  from_agent uuid REFERENCES agents(id) ON DELETE SET NULL,
  to_agent uuid REFERENCES agents(id) ON DELETE SET NULL,
  content text NOT NULL,
  object jsonb,
  ts timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_thread_ts_idx ON messages (thread_id, ts);

CREATE TABLE IF NOT EXISTS usage (
  id bigserial PRIMARY KEY,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  ts timestamptz DEFAULT now(),
  model varchar(120),
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  cost numeric(12, 6),
  request_id varchar(64)
);
CREATE INDEX IF NOT EXISTS usage_agent_ts_idx ON usage (agent_id, ts);

CREATE TABLE IF NOT EXISTS layout (
  id integer PRIMARY KEY DEFAULT 1,
  layout_json jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES agents(id)
);