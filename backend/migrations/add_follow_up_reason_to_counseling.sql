-- Migration: Add follow_up_reason column to counseling_sessions table
-- Date: 2025-01-XX
-- Purpose: Align counseling_sessions table with DATABASE_STRUCTURE.md (Module 7)

ALTER TABLE counseling_sessions
ADD COLUMN follow_up_reason TEXT DEFAULT NULL
AFTER follow_up_date;

