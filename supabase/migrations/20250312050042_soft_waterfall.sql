/*
  # Fix family relationships validation

  1. Changes
    - Create function to validate and fix family relationships
    - Ensure all logical relationships are created automatically
    - Handle sibling relationships through common parents
    - Handle spouse relationships through common children
    - Log all changes made

  2. Security
    - Only super admins can trigger validation
    - All changes are audited
*/

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
  common_parent RECORD;
BEGIN
  -- Create temporary table to store results
  CREATE TEMP TABLE IF NOT EXISTS validation_results (
    action text,
    details jsonb
  );

  -- 1. Check and fix reciprocal relationships
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

  -- 2. Check and fix sibling relationships through common parents
  -- First, get all parent-child relationships
  FOR parent_r IN 
    SELECT DISTINCT p.from_member_id as parent_id, array_agg(p.to_member_id) as children
    FROM family_relationships p
    WHERE p.relationship_type = 'parent'
    GROUP BY p.from_member_id
  LOOP
    -- For each pair of children
    FOR i IN array_lower(parent_r.children, 1)..array_upper(parent_r.children, 1)
    LOOP
      FOR j IN (i + 1)..array_upper(parent_r.children, 1)
      LOOP
        -- Create sibling relationship if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM family_relationships
          WHERE from_member_id = parent_r.children[i]
          AND to_member_id = parent_r.children[j]
          AND relationship_type = 'sibling'
        ) THEN
          -- Create sibling relationship in both directions
          INSERT INTO family_relationships (
            from_member_id,
            to_member_id,
            relationship_type,
            created_by
          ) VALUES (
            parent_r.children[i],
            parent_r.children[j],
            'sibling',
            (SELECT created_by FROM family_relationships WHERE from_member_id = parent_r.parent_id LIMIT 1)
          );

          INSERT INTO family_relationships (
            from_member_id,
            to_member_id,
            relationship_type,
            created_by
          ) VALUES (
            parent_r.children[j],
            parent_r.children[i],
            'sibling',
            (SELECT created_by FROM family_relationships WHERE from_member_id = parent_r.parent_id LIMIT 1)
          );

          -- Log the fix
          INSERT INTO validation_results (action, details)
          VALUES (
            'created_sibling_relationship',
            jsonb_build_object(
              'child1_id', parent_r.children[i],
              'child2_id', parent_r.children[j],
              'parent_id', parent_r.parent_id
            )
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- 3. Check and fix spouse relationships through common children
  FOR child_r IN 
    SELECT DISTINCT c.to_member_id as child_id, array_agg(c.from_member_id) as parents
    FROM family_relationships c
    WHERE c.relationship_type = 'parent'
    GROUP BY c.to_member_id
  LOOP
    -- For each pair of parents
    FOR i IN array_lower(child_r.parents, 1)..array_upper(child_r.parents, 1)
    LOOP
      FOR j IN (i + 1)..array_upper(child_r.parents, 1)
      LOOP
        -- Create spouse relationship if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM family_relationships
          WHERE from_member_id = child_r.parents[i]
          AND to_member_id = child_r.parents[j]
          AND relationship_type = 'spouse'
        ) THEN
          -- Create spouse relationship in both directions
          INSERT INTO family_relationships (
            from_member_id,
            to_member_id,
            relationship_type,
            created_by
          ) VALUES (
            child_r.parents[i],
            child_r.parents[j],
            'spouse',
            (SELECT created_by FROM family_relationships WHERE to_member_id = child_r.child_id LIMIT 1)
          );

          INSERT INTO family_relationships (
            from_member_id,
            to_member_id,
            relationship_type,
            created_by
          ) VALUES (
            child_r.parents[j],
            child_r.parents[i],
            'spouse',
            (SELECT created_by FROM family_relationships WHERE to_member_id = child_r.child_id LIMIT 1)
          );

          -- Log the fix
          INSERT INTO validation_results (action, details)
          VALUES (
            'created_spouse_relationship',
            jsonb_build_object(
              'spouse1_id', child_r.parents[i],
              'spouse2_id', child_r.parents[j],
              'child_id', child_r.child_id
            )
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT * FROM validation_results;
  
  -- Clean up
  DROP TABLE IF EXISTS validation_results;
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can trigger relationship validation';
  END IF;

  RETURN QUERY SELECT * FROM validate_and_fix_relationships();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION trigger_relationship_validation() TO authenticated;