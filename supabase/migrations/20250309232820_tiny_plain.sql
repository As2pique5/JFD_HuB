/*
  # Mise à jour des politiques RLS pour les cotisations

  1. Tables concernées
    - monthly_contribution_sessions
    - monthly_contribution_assignments
    - contributions
    - audit_logs

  2. Sécurité
    - Lecture autorisée pour tous les utilisateurs authentifiés
    - Création et modification réservées aux administrateurs et intermédiaires
    - Suppression réservée aux administrateurs

  3. Changements
    - Vérification et mise à jour des politiques existantes
*/

-- Vérification et mise à jour des politiques pour monthly_contribution_sessions
DO $$ 
BEGIN
  -- Suppression des anciennes politiques si elles existent
  DROP POLICY IF EXISTS "insert_monthly_contribution_sessions" ON monthly_contribution_sessions;
  DROP POLICY IF EXISTS "update_monthly_contribution_sessions" ON monthly_contribution_sessions;
  DROP POLICY IF EXISTS "delete_monthly_contribution_sessions" ON monthly_contribution_sessions;
  DROP POLICY IF EXISTS "view_monthly_contribution_sessions" ON monthly_contribution_sessions;
  
  -- Création des nouvelles politiques
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_contribution_sessions' 
    AND policyname = 'insert_monthly_contribution_sessions'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_contribution_sessions' 
    AND policyname = 'update_monthly_contribution_sessions'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_contribution_sessions' 
    AND policyname = 'delete_monthly_contribution_sessions'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_contribution_sessions' 
    AND policyname = 'view_monthly_contribution_sessions'
  ) THEN
    CREATE POLICY "view_monthly_contribution_sessions"
      ON monthly_contribution_sessions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Vérification et mise à jour des politiques pour monthly_contribution_assignments
DO $$ 
BEGIN
  -- Suppression des anciennes politiques si elles existent
  DROP POLICY IF EXISTS "insert_monthly_contribution_assignments" ON monthly_contribution_assignments;
  DROP POLICY IF EXISTS "update_monthly_contribution_assignments" ON monthly_contribution_assignments;
  DROP POLICY IF EXISTS "delete_monthly_contribution_assignments" ON monthly_contribution_assignments;
  DROP POLICY IF EXISTS "view_monthly_contribution_assignments" ON monthly_contribution_assignments;
  
  -- Création des nouvelles politiques
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_contribution_assignments' 
    AND policyname = 'insert_monthly_contribution_assignments'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_contribution_assignments' 
    AND policyname = 'update_monthly_contribution_assignments'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_contribution_assignments' 
    AND policyname = 'delete_monthly_contribution_assignments'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_contribution_assignments' 
    AND policyname = 'view_monthly_contribution_assignments'
  ) THEN
    CREATE POLICY "view_monthly_contribution_assignments"
      ON monthly_contribution_assignments
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Vérification et mise à jour des politiques pour contributions
DO $$ 
BEGIN
  -- Suppression des anciennes politiques si elles existent
  DROP POLICY IF EXISTS "insert_contributions" ON contributions;
  DROP POLICY IF EXISTS "update_contributions" ON contributions;
  DROP POLICY IF EXISTS "delete_contributions" ON contributions;
  DROP POLICY IF EXISTS "view_contributions" ON contributions;
  
  -- Création des nouvelles politiques
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contributions' 
    AND policyname = 'insert_contributions'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contributions' 
    AND policyname = 'update_contributions'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contributions' 
    AND policyname = 'delete_contributions'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contributions' 
    AND policyname = 'view_contributions'
  ) THEN
    CREATE POLICY "view_contributions"
      ON contributions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Vérification et mise à jour des politiques pour audit_logs
DO $$ 
BEGIN
  -- Suppression des anciennes politiques si elles existent
  DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
  DROP POLICY IF EXISTS "view_audit_logs" ON audit_logs;
  
  -- Création des nouvelles politiques
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'insert_audit_logs'
  ) THEN
    CREATE POLICY "insert_audit_logs"
      ON audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'view_audit_logs'
  ) THEN
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
  END IF;
END $$;