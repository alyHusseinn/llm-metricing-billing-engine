import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm'

export const planNameEnum = pgEnum("plan_name", ["Free", "Pro"]);
export const subStatusEnum = pgEnum("sub_status", ["Active", "Past_due", "Limit_Exceeded", "Canceled"]);
export const reqStatusEnum = pgEnum("request_status", ["Succeeded", "Failed"]);


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

  /** Null until user subscribes via Stripe. */
  stripeSubscriptionId: text("stripe_subscription_id"),

  status: subStatusEnum().notNull().default("Active"),
  // end-date = start_date + 30
  startDate: timestamp("start_date").notNull().defaultNow(),

  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),

  // createdAt: timestamp("created_at").notNull().defaultNow() 

  /**
   * NOTE: requestsUsed / tokensUsed counters are intentionally ABSENT.
   * Reason: usage_events is the append-only source of truth. Counters on the
   * subscription row create a dual source of truth that drifts under concurrent
   * writes. Derive usage totals via SUM() on usage_events filtered by period.
   * For fast quota checks, use a Redis counter or MATERIALIZED VIEW backed by
   * usage_events — not a mutable column on this row.
   */
}, (t) => [
  /**
   * Partial unique index: allows multiple historical rows per user (Canceled,
   * Past_due) but enforces at most ONE Active subscription per user.
   * Using a full unique index on user_id alone would prevent re-subscribing
   * after cancellation and make plan-change history impossible.
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
  requestId: text("request_id").notNull().unique(),

  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull()
    .generatedAlwaysAs(sql`input_tokens + output_tokens`),

  requestStatus: reqStatusEnum().notNull(),
});