CREATE TABLE "ai_usage_counters" (
	"scope" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"user_id" uuid,
	"requests" integer NOT NULL,
	CONSTRAINT "ai_usage_counters_scope_window_start_pk" PRIMARY KEY("scope","window_start")
);
--> statement-breakpoint
ALTER TABLE "ai_usage_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage_counters" ADD CONSTRAINT "ai_usage_counters_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_counters_user_id_window_start_index" ON "ai_usage_counters" USING btree ("user_id","window_start");