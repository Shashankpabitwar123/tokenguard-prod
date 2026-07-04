CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_connections (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  account_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_connections_user_provider_idx
  ON provider_connections(user_id, provider);

CREATE TABLE IF NOT EXISTS provider_rulebooks (
  id text PRIMARY KEY,
  provider text NOT NULL,
  display_name text NOT NULL,
  description text NOT NULL,
  rules jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_rulebooks_provider_idx
  ON provider_rulebooks(provider);

CREATE TABLE IF NOT EXISTS user_settings (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  default_provider text NOT NULL DEFAULT 'codex',
  default_mode text NOT NULL DEFAULT 'balanced',
  show_savings_meter integer NOT NULL DEFAULT 1,
  show_cost_saved integer NOT NULL DEFAULT 1,
  save_history integer NOT NULL DEFAULT 1,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS optimization_runs (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  provider text NOT NULL,
  mode text NOT NULL DEFAULT 'balanced',
  original_prompt text NOT NULL,
  optimized_prompt text,
  original_tokens integer NOT NULL DEFAULT 0,
  optimized_tokens integer NOT NULL DEFAULT 0,
  saved_percent integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  response text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
