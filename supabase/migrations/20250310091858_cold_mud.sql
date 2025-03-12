/*
  # Schéma des cotisations pour événements

  1. Nouvelles Tables
    - `event_contributions`
      - Gère les cotisations globales pour un événement
      - Contient le montant cible et la date limite
    - `event_contribution_assignments`
      - Gère les attributions individuelles aux membres
      - Lie un membre à une cotisation d'événement avec son montant

  2. Sécurité
    - Enable RLS sur les tables
    - Politiques d'accès basées sur les rôles

  3. Changements
    - Ajout des contraintes de clés étrangères
    - Ajout des triggers pour updated_at
*/

-- Création de la table des cotisations d'événements
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

-- Création de la table des attributions de cotisations
CREATE TABLE IF NOT EXISTS event_contribution_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  target_amount integer NOT NULL,
  current_amount integer DEFAULT 0,
  deadline date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_contribution_assignments ENABLE ROW LEVEL SECURITY;

-- Policies pour event_contributions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_contributions' 
    AND policyname = 'Super admins et intermediates peuvent créer des cotisations'
  ) THEN
    CREATE POLICY "Super admins et intermediates peuvent créer des cotisations" ON event_contributions
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_contributions' 
    AND policyname = 'Super admins et intermediates peuvent modifier les cotisations'
  ) THEN
    CREATE POLICY "Super admins et intermediates peuvent modifier les cotisations" ON event_contributions
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_contributions' 
    AND policyname = 'Super admins peuvent supprimer les cotisations'
  ) THEN
    CREATE POLICY "Super admins peuvent supprimer les cotisations" ON event_contributions
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_contributions' 
    AND policyname = 'Tous les utilisateurs peuvent voir les cotisations'
  ) THEN
    CREATE POLICY "Tous les utilisateurs peuvent voir les cotisations" ON event_contributions
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Policies pour event_contribution_assignments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_contribution_assignments' 
    AND policyname = 'Super admins et intermediates peuvent créer des attributions'
  ) THEN
    CREATE POLICY "Super admins et intermediates peuvent créer des attributions" ON event_contribution_assignments
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_contribution_assignments' 
    AND policyname = 'Super admins et intermediates peuvent modifier les attributions'
  ) THEN
    CREATE POLICY "Super admins et intermediates peuvent modifier les attributions" ON event_contribution_assignments
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_contribution_assignments' 
    AND policyname = 'Super admins peuvent supprimer les attributions'
  ) THEN
    CREATE POLICY "Super admins peuvent supprimer les attributions" ON event_contribution_assignments
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_contribution_assignments' 
    AND policyname = 'Tous les utilisateurs peuvent voir les attributions'
  ) THEN
    CREATE POLICY "Tous les utilisateurs peuvent voir les attributions" ON event_contribution_assignments
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Triggers pour updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_event_contributions_updated_at'
  ) THEN
    CREATE TRIGGER update_event_contributions_updated_at
      BEFORE UPDATE ON event_contributions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_event_contribution_assignments_updated_at'
  ) THEN
    CREATE TRIGGER update_event_contribution_assignments_updated_at
      BEFORE UPDATE ON event_contribution_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS event_contributions_event_id_idx ON event_contributions(event_id);
CREATE INDEX IF NOT EXISTS event_contributions_status_idx ON event_contributions(status);
CREATE INDEX IF NOT EXISTS event_contribution_assignments_event_id_idx ON event_contribution_assignments(event_id);
CREATE INDEX IF NOT EXISTS event_contribution_assignments_user_id_idx ON event_contribution_assignments(user_id);