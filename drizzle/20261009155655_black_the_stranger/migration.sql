CREATE TYPE "threshold" AS ENUM('80', '100');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subscription_id" integer NOT NULL,
	"threshold" "threshold" NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_on_subscriptionId_and_threshold" UNIQUE("subscription_id","threshold")
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT;