CREATE TABLE "web_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"query" text NOT NULL,
	"results" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "web_searches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "web_searches" ADD CONSTRAINT "web_searches_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_searches" ADD CONSTRAINT "web_searches_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "web_searches_user_created_idx" ON "web_searches" USING btree ("user_id","created_at");