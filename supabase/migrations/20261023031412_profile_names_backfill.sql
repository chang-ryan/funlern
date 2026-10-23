-- Data migration (drizzle-kit generate --custom): accounts made before sign-up asked for a name go by their
-- email, so only new sign-ups see the name step.
UPDATE "profiles"
SET "display_name" = "users"."email"
FROM "auth"."users"
WHERE "users"."id" = "profiles"."id" AND "profiles"."display_name" IS NULL;
