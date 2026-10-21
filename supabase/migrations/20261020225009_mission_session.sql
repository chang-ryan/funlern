-- conversations is small; a plain index build is fine.
-- squawk-ignore require-concurrent-index-creation
CREATE UNIQUE INDEX "conversations_plan_mission_key" ON "conversations" USING btree ("plan_id") WHERE "conversations"."mode" = 'mission';