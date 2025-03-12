/*
  # Add event contributions tables and event contribution status

  1. New Tables
    - `event_contributions`: Tracks contribution details for events
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `target_amount` (integer)
      - `current_amount` (integer)
      - `deadline` (date)
      - `status` (text)
      - `created_by` (uuid)
      - Timestamps

    - `event_contribution_assignments`: Tracks individual member contribution assignments
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `user_id` (uuid, references profiles)
      - `target_amount` (integer)
      - `current_amount` (integer)
      - `deadline` (date)
      - Timestamps

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users based on role

  3. Changes
    - Add requires_contribution and contribution_status columns to events table
*/

-- Drop existing triggers if they exist
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_event_contributions_updated_at ON event_contributions;
  DROP TRIGGER IF EXISTS update_event_contribution_assignments_updated_at ON event_contribution_assignments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Super admins et intermediates peuvent créer des cotisations" ON event_contributions;
  DROP POLICY IF EXISTS "Super admins et intermediates peuvent modifier les cotisations" ON event_contributions;
  DROP POLICY IF EXISTS "Super admins peuvent supprimer les cotisations" ON event_contributions;
  DROP POLICY IF EXISTS "Tous les utilisateurs peuvent voir les cotisations" ON event_contributions;
  
  DROP POLICY IF EXISTS "Super admins et intermediates peuvent créer des attributions" ON event_contribution_assignments;
  DROP POLICY IF EXISTS "Super admins et intermediates peuvent modifier les attributions" ON event_contribution_assignments;
  DROP POLICY IF EXISTS "Super admins peuvent supprimer les attributions" ON event_contribution_assignments;
  DROP POLICY IF EXISTS "Tous les utilisateurs peuvent voir les attributions" ON event_contribution_assignments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS event_contributions_event_id_idx;
DROP INDEX IF EXISTS event_contributions_status_idx;
DROP INDEX IF EXISTS event_contribution_assignments_event_id_idx;
DROP INDEX IF EXISTS event_contribution_assignments_user_id_idx;

-- Create event_contributions table
CREATE TABLE IF NOT EXISTS event_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  target_amount integer NOT NULL,
  current_amount integer DEFAULT 0,
  deadline date NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_contribution_assignments table
CREATE TABLE IF NOT EXISTS event_contribution_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  target_amount integer NOT NULL,
  current_amount integer DEFAULT 0,
  deadline date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS event_contributions_event_id_idx ON event_contributions(event_id);
CREATE INDEX IF NOT EXISTS event_contributions_status_idx ON event_contributions(status);
CREATE INDEX IF NOT EXISTS event_contribution_assignments_event_id_idx ON event_contribution_assignments(event_id);
CREATE INDEX IF NOT EXISTS event_contribution_assignments_user_id_idx ON event_contribution_assignments(user_id);

-- Enable RLS
ALTER TABLE event_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_contribution_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for event_contributions
CREATE POLICY "Super admins et intermediates peuvent créer des cotisations"
  ON event_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  ));

CREATE POLICY "Super admins et intermediates peuvent modifier les cotisations"
  ON event_contributions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  ));

CREATE POLICY "Super admins peuvent supprimer les cotisations"
  ON event_contributions
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  ));

CREATE POLICY "Tous les utilisateurs peuvent voir les cotisations"
  ON event_contributions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for event_contribution_assignments
CREATE POLICY "Super admins et intermediates peuvent créer des attributions"
  ON event_contribution_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  ));

CREATE POLICY "Super admins et intermediates peuvent modifier les attributions"
  ON event_contribution_assignments
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  ));

CREATE POLICY "Super admins peuvent supprimer les attributions"
  ON event_contribution_assignments
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  ));

CREATE POLICY "Tous les utilisateurs peuvent voir les attributions"
  ON event_contribution_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Add triggers for updated_at
DO $$ BEGIN
  CREATE TRIGGER update_event_contributions_updated_at
    BEFORE UPDATE ON event_contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_event_contribution_assignments_updated_at
    BEFORE UPDATE ON event_contribution_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add requires_contribution and contribution_status columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS requires_contribution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contribution_status text DEFAULT 'pending' 
CHECK (contribution_status IN ('pending', 'setup', 'completed'));