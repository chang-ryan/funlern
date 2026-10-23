CREATE TABLE "ai_usage" (
	"scope" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"user_id" uuid,
	"requests" integer NOT NULL,
	CONSTRAINT "ai_usage_scope_window_start_pk" PRIMARY KEY("scope","window_start")
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;