CREATE TYPE "plan_name" AS ENUM('Free', 'Pro');--> statement-breakpoint
CREATE TYPE "request_status" AS ENUM('Succeeded', 'Failed');--> statement-breakpoint
CREATE TYPE "sub_status" AS ENUM('Active', 'Past_due', 'Limit_Exceeded', 'Canceled');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" "plan_name" NOT NULL UNIQUE,
	"price_in_cents" integer NOT NULL,
	"tokens_limit" integer NOT NULL,
	"requests_limit" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_event" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stripe_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stripe_event_id" varchar(255) NOT NULL UNIQUE,
	"type" varchar(255) NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"stripe_subscription_id" text,
	"status" "sub_status" DEFAULT 'Active'::"sub_status" NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usage_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subscription_id" integer NOT NULL,
	"request_id" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"reasoning_tokents" integer NOT NULL,
	"cached_tokens" integer NOT NULL,
	"total_tokens" integer GENERATED ALWAYS AS (input_tokens + output_tokens + reasoning_tokents + cached_tokens) STORED NOT NULL,
	"requestStatus" "request_status" NOT NULL,
	CONSTRAINT "unique_on_requestId_and_subscription_id" UNIQUE("request_id","subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "uq_user_one_active_sub" ON "subscriptions" ("user_id") WHERE status = 'Active';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT;