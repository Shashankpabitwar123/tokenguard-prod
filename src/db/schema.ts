import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const providerConnections = pgTable(
  "provider_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("connected"),
    accountEmail: text("account_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProviderIdx: uniqueIndex("provider_connections_user_provider_idx").on(
      table.userId,
      table.provider,
    ),
  }),
);

export const providerRulebooks = pgTable(
  "provider_rulebooks",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    rules: jsonb("rules").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerIdx: uniqueIndex("provider_rulebooks_provider_idx").on(table.provider),
  }),
);

export const userSettings = pgTable("user_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  defaultProvider: text("default_provider").notNull().default("codex"),
  defaultMode: text("default_mode").notNull().default("balanced"),
  showSavingsMeter: integer("show_savings_meter").notNull().default(1),
  showCostSaved: integer("show_cost_saved").notNull().default(1),
  saveHistory: integer("save_history").notNull().default(1),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const optimizationRuns = pgTable("optimization_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  provider: text("provider").notNull(),
  mode: text("mode").notNull().default("balanced"),
  originalPrompt: text("original_prompt").notNull(),
  optimizedPrompt: text("optimized_prompt"),
  originalTokens: integer("original_tokens").notNull().default(0),
  optimizedTokens: integer("optimized_tokens").notNull().default(0),
  savedPercent: integer("saved_percent").notNull().default(0),
  status: text("status").notNull().default("draft"),
  response: text("response"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
