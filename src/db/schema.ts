import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm'

export const planNameEnum = pgEnum("plan_name", ["Free", "Pro"]);
export const subStatusEnum = pgEnum("sub_status", ["Active", "Past_due", "Limit_Exceeded", "Canceled"]);
export const reqStatusEnum = pgEnum("request_status", ["Succeeded", "Failed"]);
export const thresholdEnum = pgEnum("threshold", ["80", "100"]);

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  passwordHash: varchar({ length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const planTable = pgTable("plans", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: planNameEnum().notNull().unique(),
  priceInCents: integer("price_in_cents").notNull(),
  tokensLimit: integer("tokens_limit").notNull(),
  requestsLimit: integer("requests_limit").notNull(),
});


export const subscriptionTable = pgTable("subscriptions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => planTable.id, { onDelete: "restrict" }),

  stripeSubscriptionId: text("stripe_subscription_id"),

  status: subStatusEnum().notNull().default("Active"),
  startDate: timestamp("start_date").notNull().defaultNow(),

  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  /**
   * Partial unique index: allows multiple historical rows per user (Canceled,
   * Past_due) but enforces at most ONE Active subscription per user.
   */
  index("uq_user_one_active_sub")
    .on(t.userId)
    .where(sql`status = 'Active'`),
]);

export const usageEventTable = pgTable("usage_events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  subscriptionId: integer("subscription_id").notNull()
    .references(() => subscriptionTable.id, { onDelete: "restrict" }),
  // idempotency key uuid4.
  requestId: text("request_id").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  reasoningTokens: integer("reasoning_tokens").notNull(),
  cachedTokens: integer("cached_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull()
    .generatedAlwaysAs(sql`input_tokens + output_tokens + reasoning_tokens + cached_tokens`),

  requestStatus: reqStatusEnum().notNull(),
}, (t) => [
  unique("unique_on_requestId_and_subscription_id").on(t.requestId, t.subscriptionId)
]);

export const stripeEventTable = pgTable("stripe_event", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  stripeEventId: varchar("stripe_event_id", { length: 255 })
    .notNull()
    .unique(),

  type: varchar("type", { length: 255 }).notNull(),

  receivedAt: timestamp("received_at")
    .defaultNow()
    .notNull(),
});

export const alertsTable = pgTable("alerts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  subscriptionId: integer("subscription_id").notNull()
    .references(() => subscriptionTable.id, { onDelete: "restrict" }),
  threshold: thresholdEnum().notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (t) => [
  unique("unique_on_subscriptionId_and_threshold").on(t.subscriptionId, t.threshold)
]);