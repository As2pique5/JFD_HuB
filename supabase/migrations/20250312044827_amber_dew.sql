/*
  # Add function to validate and fix family relationships

  1. New Function
    - validate_and_fix_relationships() to check and repair relationship consistency
    - Handles parent/child, sibling, and spouse relationships
    - Creates missing reciprocal relationships
    - Creates missing sibling relationships

  2. Security
    - Function runs with security definer to ensure proper access
    - Only super admins can trigger the validation
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
  child_r RECORD;
  missing_relationship RECORD;
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

  -- 2. Check and fix sibling relationships
  -- For each parent-child relationship, ensure all children are siblings
  FOR r IN 
    SELECT DISTINCT from_member_id as parent_id
    FROM family_relationships
    WHERE relationship_type = 'parent'
  LOOP
    -- Get all children of this parent
    FOR child_r IN 
      SELECT to_member_id as child_id
      FROM family_relationships
      WHERE from_member_id = r.parent_id
      AND relationship_type = 'parent'
    LOOP
      -- For each child, check relationships with other children
      FOR sibling_r IN 
        SELECT to_member_id as sibling_id
        FROM family_relationships
        WHERE from_member_id = r.parent_id
        AND relationship_type = 'parent'
        AND to_member_id != child_r.child_id
      LOOP
        -- Create sibling relationship if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM family_relationships
          WHERE from_member_id = child_r.child_id
          AND to_member_id = sibling_r.sibling_id
          AND relationship_type = 'sibling'
        ) THEN
          -- Create sibling relationship
          INSERT INTO family_relationships (
            from_member_id,
            to_member_id,
            relationship_type,
            created_by
          ) VALUES (
            child_r.child_id,
            sibling_r.sibling_id,
            'sibling',
            (SELECT created_by FROM family_relationships WHERE from_member_id = r.parent_id LIMIT 1)
          );

          -- Create reciprocal sibling relationship
          INSERT INTO family_relationships (
            from_member_id,
            to_member_id,
            relationship_type,
            created_by
          ) VALUES (
            sibling_r.sibling_id,
            child_r.child_id,
            'sibling',
            (SELECT created_by FROM family_relationships WHERE from_member_id = r.parent_id LIMIT 1)
          );

          -- Log the fix
          INSERT INTO validation_results (action, details)
          VALUES (
            'created_sibling_relationship',
            jsonb_build_object(
              'child1_id', child_r.child_id,
              'child2_id', sibling_r.sibling_id,
              'parent_id', r.parent_id
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