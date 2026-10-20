CREATE TYPE "public"."doc_author" AS ENUM('user', 'tutor');--> statement-breakpoint
CREATE TYPE "public"."doc_kind" AS ENUM('brief', 'syllabus', 'training');--> statement-breakpoint
CREATE TABLE "plan_doc_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"body" text NOT NULL,
	"author" "doc_author" NOT NULL,
	"conversation_id" uuid,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_doc_versions_doc_version_key" UNIQUE("doc_id","version")
);
--> statement-breakpoint
ALTER TABLE "plan_doc_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plan_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"kind" "doc_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_docs_plan_kind_key" UNIQUE("plan_id","kind")
);
--> statement-breakpoint
ALTER TABLE "plan_docs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "pinned" jsonb;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "seen" jsonb;--> statement-breakpoint
ALTER TABLE "plan_doc_versions" ADD CONSTRAINT "plan_doc_versions_doc_id_plan_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."plan_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_doc_versions" ADD CONSTRAINT "plan_doc_versions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_docs" ADD CONSTRAINT "plan_docs_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plans_user_idx" ON "plans" USING btree ("user_id");--> statement-breakpoint
-- plan_id is new and all null, so the scan is trivial; conversations is small.
-- squawk-ignore constraint-missing-not-valid, adding-foreign-key-constraint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- squawk-ignore require-concurrent-index-creation
CREATE INDEX "conversations_plan_idx" ON "conversations" USING btree ("plan_id");