-- 001_init.sql
-- Purpose: Create the core Sentle-driving tables (v1)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A tiny table that records which migrations have been applied.
-- Why: So we never run the same migration twice.
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users = identity + login
-- Roles are stored as text with a CHECK constraint (simple and explicit).
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'instructor', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Students = profile info (linked 1-to-1 with a user)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Instructors = profile info (linked 1-to-1 with a user)
CREATE TABLE IF NOT EXISTS instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicles = cars used for lessons
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lessons = scheduled driving lessons
-- Status is constrained so the system can't enter nonsense states.
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE RESTRICT,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes (performance)
-- Why indexes: they act like "fast lookup structures" so we don't scan the whole table.

-- Common query: "show upcoming lessons for an instructor ordered by time"
CREATE INDEX IF NOT EXISTS idx_lessons_instructor_starts_at
  ON lessons (instructor_id, starts_at);

-- Common query: "show a student's lessons ordered by time"
CREATE INDEX IF NOT EXISTS idx_lessons_student_starts_at
  ON lessons (student_id, starts_at);

COMMIT;
