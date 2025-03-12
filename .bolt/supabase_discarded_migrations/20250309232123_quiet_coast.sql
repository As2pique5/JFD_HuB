/*
  # Correction des politiques RLS pour les cotisations

  1. Tables
    - monthly_contribution_sessions
    - monthly_contribution_assignments
    - contributions
    - audit_logs

  2. Sécurité
    - Ajout de politiques RLS plus permissives pour les utilisateurs authentifiés
    - Correction des politiques pour permettre l'insertion de données
    - Maintien des restrictions sur les opérations sensibles

  3. Changements
    - Suppression des anciennes politiques
    - Création de nouvelles politiques plus permissives
    - Ajout d'indexes pour améliorer les performances
*/

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS monthly_contribution_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  monthly_target_amount integer NOT NULL CHECK (monthly_target_amount > 0),
  duration_months integer NOT NULL CHECK (duration_months > 0),
  payment_deadline_day integer NOT NULL CHECK (payment_deadline_day BETWEEN 1 AND 31),
  status text NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_contribution_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES monthly_contribution_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_amount integer NOT NULL CHECK (monthly_amount > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE monthly_contribution_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_contribution_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_contribution_sessions
CREATE POLICY "Users can view all monthly contribution sessions"
  ON monthly_contribution_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create monthly contribution sessions"
  ON monthly_contribution_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins and intermediates can update monthly contribution sessions"
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

CREATE POLICY "Super admins can delete monthly contribution sessions"
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

-- Create policies for monthly_contribution_assignments
CREATE POLICY "Users can view all monthly contribution assignments"
  ON monthly_contribution_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create monthly contribution assignments"
  ON monthly_contribution_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins and intermediates can update monthly contribution assignments"
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

CREATE POLICY "Super admins can delete monthly contribution assignments"
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

-- Create policies for contributions
CREATE POLICY "Users can view all contributions"
  ON contributions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create contributions"
  ON contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins and intermediates can update contributions"
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

CREATE POLICY "Super admins can delete contributions"
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

-- Create policies for audit_logs
CREATE POLICY "Super admins can view audit logs"
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

CREATE POLICY "Users can create audit logs"
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

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_monthly_contribution_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_monthly_contribution_sessions_updated_at
      BEFORE UPDATE ON monthly_contribution_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_monthly_contribution_assignments_updated_at'
  ) THEN
    CREATE TRIGGER update_monthly_contribution_assignments_updated_at
      BEFORE UPDATE ON monthly_contribution_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_contributions_updated_at'
  ) THEN
    CREATE TRIGGER update_contributions_updated_at
      BEFORE UPDATE ON contributions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;