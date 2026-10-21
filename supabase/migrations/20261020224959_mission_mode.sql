-- Appending is intended: modes have no order. A new value can't be used in the transaction that adds it, so
-- the one-mission-per-plan index is its own migration.
-- squawk-ignore require-enum-value-ordering
ALTER TYPE "public"."session_mode" ADD VALUE 'mission';