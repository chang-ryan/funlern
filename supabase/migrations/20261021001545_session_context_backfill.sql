-- Data migration (drizzle-kit generate --custom): carry each plan session's pinned and seen doc versions and
-- material ids into the one context column, so running sessions keep the system prompt they started with.
UPDATE "conversations"
SET "context" = jsonb_build_object(
  'pinned', jsonb_build_object('docs', coalesce("pinned", '{}'::jsonb), 'materials', coalesce("pinned_materials", '[]'::jsonb)),
  'seen', jsonb_build_object('docs', coalesce("seen", '{}'::jsonb), 'materials', coalesce("seen_materials", '[]'::jsonb))
)
WHERE "plan_id" IS NOT NULL AND "context" IS NULL;
