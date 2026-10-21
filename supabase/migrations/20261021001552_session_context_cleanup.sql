-- Replaced by conversations.context (backfilled in the previous migration). Nothing outside this app reads them,
-- and the hosted database never had them.
-- squawk-ignore ban-drop-column
ALTER TABLE "conversations" DROP COLUMN "pinned";--> statement-breakpoint
-- squawk-ignore ban-drop-column
ALTER TABLE "conversations" DROP COLUMN "seen";--> statement-breakpoint
-- squawk-ignore ban-drop-column
ALTER TABLE "conversations" DROP COLUMN "pinned_materials";--> statement-breakpoint
-- squawk-ignore ban-drop-column
ALTER TABLE "conversations" DROP COLUMN "seen_materials";