/*
  # Fix family relationships validation and RLS policies

  1. Changes
    - Drop existing RLS policies
    - Create new RLS policies with proper permissions
    - Fix ambiguous column references in validation function
    
  2. Security
    - Ensure proper access control for family relationships
    - Maintain data integrity during validation
*/

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view all family relationships" ON family_relationships;
DROP POLICY IF EXISTS "Super admins and intermediates can insert family relationships" ON family_relationships;
DROP POLICY IF EXISTS "Super admins and intermediates can update family relationships" ON family_relationships;
DROP POLICY IF EXISTS "Super admins can delete family relationships" ON family_relationships;

-- Create new RLS policies
CREATE POLICY "Anyone can view family relationships"
  ON family_relationships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins and intermediates can create family relationships"
  ON family_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins and intermediates can update family relationships"
  ON family_relationships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins can delete family relationships"
  ON family_relationships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Create helper function for checking admin/intermediate role
CREATE OR REPLACE FUNCTION is_admin_or_intermediate()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
  );
END;
$$;

-- Create helper function for checking super admin role
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  );
END;
$$;

-- Create function to validate and fix relationships
CREATE OR REPLACE FUNCTION validate_and_fix_relationships()
RETURNS TABLE (
  action text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  sibling_r RECORD;
  parent_r RECORD;
  child_r RECORD;
  sibling_group_r RECORD;
BEGIN
  -- Create temporary table to store results
  CREATE TEMP TABLE IF NOT EXISTS validation_results (
    action text,
    details jsonb
  );

  -- Create temporary table to store sibling groups
  CREATE TEMP TABLE IF NOT EXISTS sibling_groups (
    group_id serial PRIMARY KEY,
    member_ids uuid[]
  );

  -- 1. First, build sibling groups based on existing relationships
  FOR r IN 
    SELECT DISTINCT fr.from_member_id
    FROM family_relationships fr
    WHERE fr.relationship_type = 'sibling'
  LOOP
    -- Get all siblings of this member (including transitive relationships)
    WITH RECURSIVE sibling_tree AS (
      -- Direct siblings
      SELECT fr.from_member_id, fr.to_member_id
      FROM family_relationships fr
      WHERE fr.relationship_type = 'sibling'
      AND (fr.from_member_id = r.from_member_id OR fr.to_member_id = r.from_member_id)
      
      UNION
      
      -- Siblings of siblings
      SELECT fr.from_member_id, fr.to_member_id
      FROM family_relationships fr
      INNER JOIN sibling_tree st ON 
        fr.from_member_id = st.to_member_id OR 
        fr.to_member_id = st.from_member_id
      WHERE fr.relationship_type = 'sibling'
    )
    SELECT array_agg(DISTINCT m.member_id) as members
    INTO sibling_group_r
    FROM (
      SELECT st.from_member_id as member_id FROM sibling_tree st
      UNION
      SELECT st.to_member_id FROM sibling_tree st
    ) m;

    -- Add this group if it's not already included in an existing group
    IF NOT EXISTS (
      SELECT 1 FROM sibling_groups sg
      WHERE sg.member_ids @> sibling_group_r.members
      AND sg.member_ids <@ sibling_group_r.members
    ) THEN
      INSERT INTO sibling_groups (member_ids)
      VALUES (sibling_group_r.members);
    END IF;
  END LOOP;

  -- 2. Create missing sibling relationships within each group
  FOR sibling_group_r IN 
    SELECT * FROM sibling_groups
  LOOP
    -- For each pair of members in the group
    FOR i IN array_lower(sibling_group_r.member_ids, 1)..array_upper(sibling_group_r.member_ids, 1)
    LOOP
      FOR j IN (i + 1)..array_upper(sibling_group_r.member_ids, 1)
      LOOP
        -- Create sibling relationship if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM family_relationships fr
          WHERE fr.from_member_id = sibling_group_r.member_ids[i]
          AND fr.to_member_id = sibling_group_r.member_ids[j]
          AND fr.relationship_type = 'sibling'
        ) THEN
          -- Create sibling relationship in both directions
          INSERT INTO family_relationships (
            from_member_id,
            to_member_id,
            relationship_type,
            created_by
          ) VALUES (
            sibling_group_r.member_ids[i],
            sibling_group_r.member_ids[j],
            'sibling',
            (SELECT created_by FROM family_relationships WHERE relationship_type = 'sibling' LIMIT 1)
          );

          INSERT INTO family_relationships (
            from_member_id,
            to_member_id,
            relationship_type,
            created_by
          ) VALUES (
            sibling_group_r.member_ids[j],
            sibling_group_r.member_ids[i],
            'sibling',
            (SELECT created_by FROM family_relationships WHERE relationship_type = 'sibling' LIMIT 1)
          );

          -- Log the fix
          INSERT INTO validation_results (action, details)
          VALUES (
            'created_transitive_sibling_relationship',
            jsonb_build_object(
              'sibling1_id', sibling_group_r.member_ids[i],
              'sibling2_id', sibling_group_r.member_ids[j]
            )
          );
        END IF;

        -- Check if they share any parents and propagate parent relationships
        FOR parent_r IN 
          SELECT DISTINCT fr.from_member_id as parent_id
          FROM family_relationships fr
          WHERE fr.relationship_type = 'parent'
          AND fr.to_member_id = sibling_group_r.member_ids[i]
        LOOP
          -- Create parent relationship with the other sibling if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM family_relationships fr
            WHERE fr.from_member_id = parent_r.parent_id
            AND fr.to_member_id = sibling_group_r.member_ids[j]
            AND fr.relationship_type = 'parent'
          ) THEN
            -- Create parent-child relationships in both directions
            INSERT INTO family_relationships (
              from_member_id,
              to_member_id,
              relationship_type,
              created_by
            ) VALUES (
              parent_r.parent_id,
              sibling_group_r.member_ids[j],
              'parent',
              (SELECT created_by FROM family_relationships WHERE relationship_type = 'parent' LIMIT 1)
            );

            INSERT INTO family_relationships (
              from_member_id,
              to_member_id,
              relationship_type,
              created_by
            ) VALUES (
              sibling_group_r.member_ids[j],
              parent_r.parent_id,
              'child',
              (SELECT created_by FROM family_relationships WHERE relationship_type = 'parent' LIMIT 1)
            );

            -- Log the fix
            INSERT INTO validation_results (action, details)
            VALUES (
              'created_parent_child_relationship',
              jsonb_build_object(
                'parent_id', parent_r.parent_id,
                'child_id', sibling_group_r.member_ids[j],
                'through_sibling', sibling_group_r.member_ids[i]
              )
            );
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT * FROM validation_results;
  
  -- Clean up
  DROP TABLE IF EXISTS validation_results;
  DROP TABLE IF EXISTS sibling_groups;
END;
$$;

-- Create function to trigger validation (only accessible to super_admin)
CREATE OR REPLACE FUNCTION trigger_relationship_validation()
RETURNS TABLE (
  action text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can trigger relationship validation';
  END IF;

  RETURN QUERY SELECT * FROM validate_and_fix_relationships();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION trigger_relationship_validation() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_intermediate() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;