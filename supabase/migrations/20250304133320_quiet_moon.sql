/*
  # Correction de la contrainte de clé étrangère pour les profils

  1. Modifications
    - Modification de la contrainte de clé étrangère entre profiles et auth.users
    - Mise à jour des politiques RLS pour permettre l'insertion sans contrainte stricte
  
  2. Raison
    - Permettre l'ajout de membres dans l'interface sans avoir à créer un utilisateur auth correspondant
    - Faciliter la démonstration et le développement de l'application
*/

-- Vérifier si la contrainte existe avant de la supprimer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_id_fkey' AND conrelid = 'profiles'::regclass
  ) THEN
    -- Supprimer la contrainte de clé étrangère existante
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- Mettre à jour les politiques RLS pour permettre l'insertion sans contrainte
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;

CREATE POLICY "Anyone can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Assurez-vous que les profils ont un statut valide
UPDATE profiles SET status = 'active' WHERE status IS NULL;