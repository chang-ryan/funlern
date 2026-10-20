CREATE TYPE "public"."session_mode" AS ENUM('learning', 'training');--> statement-breakpoint
CREATE TYPE "public"."training_style" AS ENUM('guided', 'full', 'card');--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "mode" "session_mode" DEFAULT 'learning' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "training_style" "training_style";