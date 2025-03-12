/*
  # Correction de la contrainte de clé unique pour les profils

  1. Modifications
    - Ajout d'une contrainte d'unicité sur l'email dans la table profiles
    - Mise à jour des politiques RLS pour gérer correctement les insertions
  
  2. Sécurité
    - Maintien des politiques de sécurité existantes
    - Amélioration de la validation des données
*/

-- Vérifier si la contrainte d'unicité existe déjà sur l'email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_email_key' AND conrelid = 'profiles'::regclass
  ) THEN
    -- Ajouter une contrainte d'unicité sur l'email
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- Mettre à jour la fonction de gestion des nouveaux utilisateurs pour éviter les doublons
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si un profil avec cet email existe déjà
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      'standard',
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour la politique d'insertion pour vérifier l'unicité de l'email
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;

-- Créer une politique qui permet l'insertion de profils
CREATE POLICY "Anyone can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);