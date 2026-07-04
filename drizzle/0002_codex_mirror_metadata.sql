CREATE TABLE IF NOT EXISTS "bridge_devices" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "device_name" text NOT NULL,
  "status" text DEFAULT 'connected' NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "bridge_devices_user_device_idx"
  ON "bridge_devices" ("user_id", "device_name");

CREATE TABLE IF NOT EXISTS "mirrored_projects" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "cwd" text,
  "provider" text DEFAULT 'codex' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "mirrored_projects_user_name_idx"
  ON "mirrored_projects" ("user_id", "name");

CREATE TABLE IF NOT EXISTS "pinned_threads" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "provider" text DEFAULT 'codex' NOT NULL,
  "thread_id" text NOT NULL,
  "title" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "pinned_threads_user_provider_thread_idx"
  ON "pinned_threads" ("user_id", "provider", "thread_id");
