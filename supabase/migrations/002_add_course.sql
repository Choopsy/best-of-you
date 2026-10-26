-- ============================================================
-- 002_add_course.sql
-- Ajout du type de plat (course) sur les recettes
-- ============================================================

CREATE TYPE course_type AS ENUM (
  'breakfast',
  'appetizer',
  'starter',
  'main',
  'side',
  'dessert',
  'snack'
);

ALTER TABLE recipes ADD COLUMN course course_type;
