/*
  # Create record_project_payment function

  1. Changes
    - Add stored procedure for recording project payments
    - Handle all payment updates in a single transaction
    
  2. Security
    - Ensure data consistency during payment recording
    - Validate input parameters
*/

CREATE OR REPLACE FUNCTION record_project_payment(
  p_project_id UUID,
  p_user_id UUID,
  p_amount INTEGER,
  p_payment_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contribution_id UUID;
  v_project_contribution_id UUID;
  v_assignment_id UUID;
  v_result JSONB;
BEGIN
  -- Get the project contribution ID
  SELECT id INTO v_project_contribution_id
  FROM project_contributions
  WHERE project_id = p_project_id;

  IF v_project_contribution_id IS NULL THEN
    RAISE EXCEPTION 'Project contribution not found';
  END IF;

  -- Get the assignment ID
  SELECT id INTO v_assignment_id
  FROM project_contribution_assignments
  WHERE project_id = p_project_id AND user_id = p_user_id;

  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Project contribution assignment not found';
  END IF;

  -- Record the payment
  INSERT INTO contributions (
    user_id,
    amount,
    payment_date,
    contribution_type,
    project_id,
    status,
    notes
  )
  VALUES (
    p_user_id,
    p_amount,
    p_payment_date,
    'project',
    p_project_id,
    'paid',
    p_notes
  )
  RETURNING id INTO v_contribution_id;

  -- Update project contribution total
  UPDATE project_contributions
  SET current_amount = current_amount + p_amount
  WHERE id = v_project_contribution_id;

  -- Update assignment amount
  UPDATE project_contribution_assignments
  SET current_amount = current_amount + p_amount
  WHERE id = v_assignment_id;

  -- Prepare result
  SELECT jsonb_build_object(
    'contribution_id', v_contribution_id,
    'project_contribution_id', v_project_contribution_id,
    'assignment_id', v_assignment_id,
    'amount', p_amount,
    'status', 'success'
  ) INTO v_result;

  RETURN v_result;
END;
$$;