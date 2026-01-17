BEGIN;

-- Needed for exclusion constraints using "=" on UUID + range overlap.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Represent lesson time as a range so Postgres can reason about overlap.
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS time_range tstzrange
  GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED;

-- Prevent an instructor from being double-booked for overlapping scheduled lessons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lessons_no_overlap_instructor'
  ) THEN
    ALTER TABLE lessons
      ADD CONSTRAINT lessons_no_overlap_instructor
      EXCLUDE USING gist (
        instructor_id WITH =,
        time_range WITH &&
      )
      WHERE (status = 'scheduled');
  END IF;
END $$;

-- Prevent a vehicle from being double-booked for overlapping scheduled lessons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lessons_no_overlap_vehicle'
  ) THEN
    ALTER TABLE lessons
      ADD CONSTRAINT lessons_no_overlap_vehicle
      EXCLUDE USING gist (
        vehicle_id WITH =,
        time_range WITH &&
      )
      WHERE (status = 'scheduled' AND vehicle_id IS NOT NULL);
  END IF;
END $$;

COMMIT;
