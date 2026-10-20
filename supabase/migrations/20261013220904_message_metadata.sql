ALTER TABLE "messages" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD COLUMN "metadata" jsonb;