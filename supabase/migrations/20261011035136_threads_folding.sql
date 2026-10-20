ALTER TABLE "threads" ADD COLUMN "folded_through" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Intentional: thread status was never used and no code reads it.
-- squawk-ignore ban-drop-column
ALTER TABLE "threads" DROP COLUMN "status";--> statement-breakpoint
-- squawk-ignore ban-drop-type
DROP TYPE "public"."thread_status";