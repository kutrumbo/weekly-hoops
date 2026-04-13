-- Add substitutes column to attendance table
-- Each substitute is stored as { "name": "string" } in a jsonb array
ALTER TABLE attendance
ADD COLUMN substitutes jsonb NOT NULL DEFAULT '[]'::jsonb;
