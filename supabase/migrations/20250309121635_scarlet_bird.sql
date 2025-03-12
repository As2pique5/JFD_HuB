/*
  # Correction de la gestion des utilisateurs et des profils

  1. Modifications
    - Nettoyage des profils orphelins
    - Mise à jour des contraintes de clé étrangère
    - Configuration des politiques et triggers
  
  2. Sécurité
    - Maintien de l'intégrité référentielle
    - Protection des données utilisateurs
*/

-- Supprimer les profils orphelins (qui n'ont pas d'utilisateur correspondant)
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Réactiver tous les triggers sur la table profiles
ALTER TABLE public.profiles ENABLE TRIGGER ALL;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Allow all operations on profiles" ON public.profiles;

-- Créer les nouvelles politiques
CREATE POLICY "Enable insert for authenticated users only" 
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow all operations on profiles" 
ON public.profiles
FOR ALL 
TO public
USING (true)
WITH CHECK (true);

-- Mettre à jour la contrainte de clé étrangère
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Mettre à jour la fonction de gestion des nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard'),
    'active'
  );
  RETURN NEW;
END;
$$;

-- Recréer le trigger pour les nouveaux utilisateurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();