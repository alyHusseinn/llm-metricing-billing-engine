ALTER TABLE "usage_events" RENAME COLUMN "reasoning_tokents" TO "reasoning_tokens";--> statement-breakpoint
ALTER TABLE "usage_events" DROP COLUMN "total_tokens";--> statement-breakpoint
ALTER TABLE "usage_events" ADD COLUMN "total_tokens" integer GENERATED ALWAYS AS (input_tokens + output_tokens + reasoning_tokens + cached_tokens) STORED;