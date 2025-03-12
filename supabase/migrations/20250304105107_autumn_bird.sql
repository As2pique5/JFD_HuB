/*
  # Insert Initial Data for JFD'HuB

  1. Data Insertion
    - Insert initial document categories
    - Insert sample family members
    - Insert sample family relationships
    - Insert sample monthly contribution session
    - Insert sample project
    - Insert sample events

  This migration provides a basic set of data to get started with the application.
*/

-- Insert document categories
INSERT INTO document_categories (id, name, description, icon)
VALUES
  (gen_random_uuid(), 'Documents administratifs', 'Pièces d''identité, actes de naissance, etc.', 'folder'),
  (gen_random_uuid(), 'Documents financiers', 'Relevés bancaires, factures, reçus, etc.', 'folder'),
  (gen_random_uuid(), 'Photos de famille', 'Albums photos des événements familiaux', 'folder'),
  (gen_random_uuid(), 'Projets', 'Documents relatifs aux projets familiaux', 'folder')
ON CONFLICT DO NOTHING;

-- Insert sample family members
DO $$
DECLARE
  jean_id uuid := gen_random_uuid();
  marie_id uuid := gen_random_uuid();
  pierre_id uuid := gen_random_uuid();
  sophie_id uuid := gen_random_uuid();
  paul_id uuid := gen_random_uuid();
  emma_id uuid := gen_random_uuid();
  thomas_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO family_members (id, name, birth_date, bio, avatar_url)
  VALUES
    (jean_id, 'Jean Dupont', '1965-05-15', 'Fondateur de la famille Dupont, Jean est un entrepreneur qui a bâti une entreprise prospère dans le secteur agricole.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'),
    (marie_id, 'Marie Dupont', '1968-08-23', 'Épouse de Jean, Marie est une enseignante dévouée qui a consacré sa vie à l''éducation et à sa famille.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'),
    (pierre_id, 'Pierre Dupont', '1990-03-10', 'Fils aîné de Jean et Marie, Pierre est ingénieur en informatique et travaille pour une entreprise internationale.', 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'),
    (sophie_id, 'Sophie Dubois', '1992-11-05', 'Fille de Jean et Marie, Sophie est médecin et mère d''un enfant. Elle est très impliquée dans les projets familiaux.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'),
    (paul_id, 'Paul Dupont', '1995-07-20', 'Fils cadet de Jean et Marie, Paul est entrepreneur comme son père et dirige sa propre entreprise de conseil.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'),
    (emma_id, 'Emma Dubois', '2020-02-15', 'Fille de Sophie et Thomas, Emma est la première petite-fille de Jean et Marie.', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'),
    (thomas_id, 'Thomas Dubois', '1991-09-12', 'Époux de Sophie, Thomas est architecte et participe activement aux projets de construction de la famille.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80')
  ON CONFLICT DO NOTHING;

  -- Insert family relationships
  INSERT INTO family_relationships (from_member_id, to_member_id, relationship_type)
  VALUES
    -- Jean and Marie are spouses
    (jean_id, marie_id, 'spouse'),
    (marie_id, jean_id, 'spouse'),
    
    -- Jean and Marie are parents of Pierre, Sophie, and Paul
    (jean_id, pierre_id, 'parent'),
    (jean_id, sophie_id, 'parent'),
    (jean_id, paul_id, 'parent'),
    (marie_id, pierre_id, 'parent'),
    (marie_id, sophie_id, 'parent'),
    (marie_id, paul_id, 'parent'),
    
    -- Pierre, Sophie, and Paul are children of Jean and Marie
    (pierre_id, jean_id, 'child'),
    (pierre_id, marie_id, 'child'),
    (sophie_id, jean_id, 'child'),
    (sophie_id, marie_id, 'child'),
    (paul_id, jean_id, 'child'),
    (paul_id, marie_id, 'child'),
    
    -- Pierre, Sophie, and Paul are siblings
    (pierre_id, sophie_id, 'sibling'),
    (pierre_id, paul_id, 'sibling'),
    (sophie_id, pierre_id, 'sibling'),
    (sophie_id, paul_id, 'sibling'),
    (paul_id, pierre_id, 'sibling'),
    (paul_id, sophie_id, 'sibling'),
    
    -- Sophie and Thomas are spouses
    (sophie_id, thomas_id, 'spouse'),
    (thomas_id, sophie_id, 'spouse'),
    
    -- Sophie and Thomas are parents of Emma
    (sophie_id, emma_id, 'parent'),
    (thomas_id, emma_id, 'parent'),
    
    -- Emma is child of Sophie and Thomas
    (emma_id, sophie_id, 'child'),
    (emma_id, thomas_id, 'child')
  ON CONFLICT DO NOTHING;
END $$;

-- Insert sample monthly contribution session
DO $$
DECLARE
  session_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO monthly_contribution_sessions (id, name, description, start_date, monthly_target_amount, duration_months, payment_deadline_day, status)
  VALUES
    (session_id, 'Session 2025', 'Cotisations mensuelles pour l''année 2025', '2025-01-01', 500000, 12, 10, 'active')
  ON CONFLICT DO NOTHING;
END $$;

-- Insert sample project
DO $$
DECLARE
  project_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO projects (id, title, description, budget, spent, start_date, end_date, status, progress)
  VALUES
    (project_id, 'Construction Maison Familiale', 'Construction d''une maison familiale à Douala', 5000000, 2100000, '2025-01-01', '2025-10-31', 'in_progress', 42)
  ON CONFLICT DO NOTHING;

  -- Insert project phases
  INSERT INTO project_phases (project_id, name, status, progress)
  VALUES
    (project_id, 'Phase 1: Fondations', 'completed', 100),
    (project_id, 'Phase 2: Gros œuvre', 'in_progress', 60),
    (project_id, 'Phase 3: Second œuvre', 'not_started', 0),
    (project_id, 'Phase 4: Finitions', 'not_started', 0)
  ON CONFLICT DO NOTHING;
END $$;

-- Insert sample events
DO $$
DECLARE
  meeting_id uuid := gen_random_uuid();
  birthday_id uuid := gen_random_uuid();
  wedding_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO events (id, title, description, type, start_date, end_date, location, status)
  VALUES
    (meeting_id, 'Réunion mensuelle', 'Réunion mensuelle de la famille pour discuter des projets en cours', 'meeting', '2025-05-10 14:00:00', '2025-05-10 16:00:00', 'Salle communale, Douala', 'upcoming'),
    (birthday_id, 'Anniversaire de Paul', 'Célébration du 40ème anniversaire de Paul', 'celebration', '2025-05-17 18:30:00', '2025-05-17 23:00:00', 'Résidence familiale, Yaoundé', 'upcoming'),
    (wedding_id, 'Mariage de Sophie et Thomas', 'Cérémonie de mariage suivie d''une réception', 'celebration', '2025-06-05 11:00:00', '2025-06-05 23:00:00', 'Église Saint-Michel puis Salle des fêtes, Douala', 'upcoming')
  ON CONFLICT DO NOTHING;

  -- Insert event contributions for wedding
  INSERT INTO event_contributions (event_id, target_amount, current_amount, deadline, status)
  VALUES
    (wedding_id, 500000, 350000, '2025-05-30', 'active')
  ON CONFLICT DO NOTHING;
END $$;