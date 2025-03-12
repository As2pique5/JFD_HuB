/*
  # Fix sibling relationships validation

  1. Changes
    - Add transitive sibling relationship validation
    - Ensure siblings of siblings are also siblings
    - Improve relationship validation function
    
  2. Security
    - No changes to security policies
*/

-- Create function to validate and fix relationships with transitive sibling relationships
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
  member_id uuid;
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
    SELECT DISTINCT from_member_id as member_id
    FROM family_relationships
    WHERE relationship_type = 'sibling'
  LOOP
    -- Get all siblings of this member (including transitive relationships)
    WITH RECURSIVE sibling_tree AS (
      -- Direct siblings
      SELECT from_member_id, to_member_id
      FROM family_relationships
      WHERE relationship_type = 'sibling'
      AND (from_member_id = r.member_id OR to_member_id = r.member_id)
      
      UNION
      
      -- Siblings of siblings
      SELECT fr.from_member_id, fr.to_member_id
      FROM family_relationships fr
      INNER JOIN sibling_tree st ON 
        fr.from_member_id = st.to_member_id OR 
        fr.to_member_id = st.from_member_id
      WHERE fr.relationship_type = 'sibling'
    )
    SELECT array_agg(DISTINCT member_id) as members
    INTO sibling_group_r
    FROM (
      SELECT from_member_id as member_id FROM sibling_tree
      UNION
      SELECT to_member_id FROM sibling_tree
    ) members;

    -- Add this group if it's not already included in an existing group
    IF NOT EXISTS (
      SELECT 1 FROM sibling_groups
      WHERE member_ids @> sibling_group_r.members
      AND member_ids <@ sibling_group_r.members
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
          SELECT 1 FROM family_relationships
          WHERE from_member_id = sibling_group_r.member_ids[i]
          AND to_member_id = sibling_group_r.member_ids[j]
          AND relationship_type = 'sibling'
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
      END LOOP;
    END LOOP;
  END LOOP;

  -- 3. Check and fix reciprocal relationships
  FOR r IN 
    SELECT * FROM family_relationships
  LOOP
    -- Check if reciprocal relationship exists
    IF NOT EXISTS (
      SELECT 1 FROM family_relationships
      WHERE from_member_id = r.to_member_id
      AND to_member_id = r.from_member_id
      AND (
        (r.relationship_type = 'parent' AND relationship_type = 'child') OR
        (r.relationship_type = 'child' AND relationship_type = 'parent') OR
        relationship_type = r.relationship_type -- for spouse and sibling
      )
    ) THEN
      -- Create missing reciprocal relationship
      INSERT INTO family_relationships (
        from_member_id,
        to_member_id,
        relationship_type,
        created_by
      ) VALUES (
        r.to_member_id,
        r.from_member_id,
        CASE r.relationship_type
          WHEN 'parent' THEN 'child'
          WHEN 'child' THEN 'parent'
          ELSE r.relationship_type
        END,
        r.created_by
      );

      -- Log the fix
      INSERT INTO validation_results (action, details)
      VALUES (
        'created_reciprocal_relationship',
        jsonb_build_object(
          'from_member_id', r.to_member_id,
          'to_member_id', r.from_member_id,
          'relationship_type', CASE r.relationship_type
            WHEN 'parent' THEN 'child'
            WHEN 'child' THEN 'parent'
            ELSE r.relationship_type
          END
        )
      );
    END IF;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT * FROM validation_results;
  
  -- Clean up
  DROP TABLE IF EXISTS validation_results;
  DROP TABLE IF EXISTS sibling_groups;
END;
$$;