/*
  # Schéma des cotisations et audit

  1. Tables
    - monthly_contribution_sessions : Sessions de cotisation mensuelle
    - monthly_contribution_assignments : Attribution des montants aux membres
    - contributions : Paiements effectués
    - audit_logs : Journal des actions

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques d'accès selon les rôles

  3. Contraintes et validations
    - Vérification des montants et dates
    - Intégrité référentielle
*/

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create tables
CREATE TABLE IF NOT EXISTS monthly_contribution_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  monthly_target_amount integer NOT NULL CHECK (monthly_target_amount > 0),
  duration_months integer NOT NULL CHECK (duration_months > 0),
  payment_deadline_day integer NOT NULL CHECK (payment_deadline_day BETWEEN 1 AND 31),
  status text NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_contribution_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES monthly_contribution_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  monthly_amount integer NOT NULL CHECK (monthly_amount > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  payment_date timestamptz NOT NULL,
  payment_period_start date,
  payment_period_end date,
  status text NOT NULL CHECK (status IN ('paid', 'pending', 'late')),
  contribution_type text NOT NULL CHECK (contribution_type IN ('monthly', 'event', 'project')),
  session_id uuid REFERENCES monthly_contribution_sessions(id) ON DELETE SET NULL,
  event_id uuid,
  project_id uuid,
  is_late boolean DEFAULT false,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE monthly_contribution_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_contribution_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "view_monthly_contribution_sessions"
  ON monthly_contribution_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "insert_monthly_contribution_sessions"
  ON monthly_contribution_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "update_monthly_contribution_sessions"
  ON monthly_contribution_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "delete_monthly_contribution_sessions"
  ON monthly_contribution_sessions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "view_monthly_contribution_assignments"
  ON monthly_contribution_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "insert_monthly_contribution_assignments"
  ON monthly_contribution_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "update_monthly_contribution_assignments"
  ON monthly_contribution_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "delete_monthly_contribution_assignments"
  ON monthly_contribution_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "view_contributions"
  ON contributions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "insert_contributions"
  ON contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "update_contributions"
  ON contributions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "delete_contributions"
  ON contributions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "view_audit_logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "insert_audit_logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS monthly_contribution_sessions_status_idx 
  ON monthly_contribution_sessions(status);

CREATE INDEX IF NOT EXISTS monthly_contribution_assignments_session_id_idx 
  ON monthly_contribution_assignments(session_id);

CREATE INDEX IF NOT EXISTS monthly_contribution_assignments_user_id_idx 
  ON monthly_contribution_assignments(user_id);

CREATE INDEX IF NOT EXISTS contributions_user_id_idx 
  ON contributions(user_id);

CREATE INDEX IF NOT EXISTS contributions_session_id_idx 
  ON contributions(session_id);

CREATE INDEX IF NOT EXISTS contributions_status_idx 
  ON contributions(status);

CREATE INDEX IF NOT EXISTS contributions_payment_date_idx 
  ON contributions(payment_date);

CREATE INDEX IF NOT EXISTS audit_logs_action_idx 
  ON audit_logs(action);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx 
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx 
  ON audit_logs(created_at);

-- Create triggers
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_monthly_contribution_sessions_updated_at ON monthly_contribution_sessions;
  DROP TRIGGER IF EXISTS update_monthly_contribution_assignments_updated_at ON monthly_contribution_assignments;
  DROP TRIGGER IF EXISTS update_contributions_updated_at ON contributions;
  
  CREATE TRIGGER update_monthly_contribution_sessions_updated_at
    BEFORE UPDATE ON monthly_contribution_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  
  CREATE TRIGGER update_monthly_contribution_assignments_updated_at
    BEFORE UPDATE ON monthly_contribution_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  
  CREATE TRIGGER update_contributions_updated_at
    BEFORE UPDATE ON contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
END $$;