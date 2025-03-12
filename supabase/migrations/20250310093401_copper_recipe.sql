/*
  # Add indexes for events table

  1. Changes
    - Add indexes to improve query performance for commonly accessed columns
    - Add indexes for foreign key relationships
    - Add indexes for status and type columns used in filtering

  2. Performance
    - Optimize queries on start_date, end_date
    - Optimize filtering by status and type
    - Optimize joins with profiles table
*/

-- Add indexes for date columns
CREATE INDEX IF NOT EXISTS events_start_date_idx ON events(start_date);
CREATE INDEX IF NOT EXISTS events_end_date_idx ON events(end_date);

-- Add indexes for filtering columns
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);
CREATE INDEX IF NOT EXISTS events_type_idx ON events(type);

-- Add index for created_by column
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS events_status_start_date_idx ON events(status, start_date);