CREATE TYPE "public"."material_kind" AS ENUM('pdf', 'markdown', 'paste');--> statement-breakpoint
CREATE TABLE "plan_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"kind" "material_kind" NOT NULL,
	"name" text NOT NULL,
	"storage_path" text,
	"text" text NOT NULL,
	"pages" integer,
	"tokens" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "plan_materials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "pinned_materials" jsonb;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "seen_materials" jsonb;--> statement-breakpoint
ALTER TABLE "plan_materials" ADD CONSTRAINT "plan_materials_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_materials_plan_idx" ON "plan_materials" USING btree ("plan_id");