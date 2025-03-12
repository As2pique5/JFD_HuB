import { supabase } from '../lib/supabase';
import { logAuditEvent } from '../lib/audit';

export interface ProjectContribution {
  id: string;
  project_id: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  duration_months: number;
  created_by?: string;
}

export interface ProjectContributionAssignment {
  id: string;
  project_id: string;
  user_id: string;
  target_amount: number;
  current_amount: number;
  monthly_amount: number;
}

class ProjectContributionService {
  async getProjectContributions(year?: number) {
    try {
      console.log('Fetching project contributions for year:', year);
      
      // First, get all projects with their contributions
      let query = supabase
        .from('projects')
        .select(`
          id,
          title,
          description,
          start_date,
          status,
          project_contributions (
            id,
            target_amount,
            current_amount,
            start_date,
            duration_months
          )
        `);

      // Add year filter if provided
      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte('start_date', startDate).lte('start_date', endDate);
      }

      const { data: projects, error: projectsError } = await query;

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      console.log('Fetched projects:', projects);

      // For each project with contributions, fetch assignments and payments separately
      for (const project of projects || []) {
        if (project.project_contributions?.length > 0) {
          const contribution = project.project_contributions[0];
          
          // Fetch assignments for this contribution
          const { data: assignments, error: assignmentsError } = await supabase
            .from('project_contribution_assignments')
            .select(`
              id,
              user_id,
              target_amount,
              current_amount,
              monthly_amount,
              profiles (
                id,
                name,
                email
              )
            `)
            .eq('project_id', project.id);

          if (assignmentsError) {
            console.error('Error fetching assignments for project:', project.id, assignmentsError);
            continue;
          }

          // Fetch payments for this project
          const { data: payments, error: paymentsError } = await supabase
            .from('contributions')
            .select('*')
            .eq('project_id', project.id)
            .eq('status', 'paid');

          if (paymentsError) {
            console.error('Error fetching payments for project:', project.id, paymentsError);
            continue;
          }

          // Group payments by user
          const userPayments = (payments || []).reduce((acc: Record<string, number>, payment) => {
            acc[payment.user_id] = (acc[payment.user_id] || 0) + payment.amount;
            return acc;
          }, {});

          // Update assignment amounts based on actual payments
          if (assignments) {
            contribution.project_contribution_assignments = assignments.map(assignment => ({
              ...assignment,
              current_amount: userPayments[assignment.user_id] || 0
            }));
          }

          // Update total contribution amount
          contribution.current_amount = Object.values(userPayments).reduce((sum, amount) => sum + amount, 0);
        }
      }

      return projects;
    } catch (error) {
      console.error('Error in getProjectContributions:', error);
      throw error;
    }
  }

  async createProjectContribution(contribution: Omit<ProjectContribution, 'id' | 'current_amount'>, userId: string) {
    try {
      console.log('Creating project contribution:', contribution);
      
      const { data, error } = await supabase
        .from('project_contributions')
        .insert({
          ...contribution,
          current_amount: 0,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Created contribution:', data);

      await logAuditEvent('project_contribution_create', userId, data.id, {
        project_id: contribution.project_id,
        target_amount: contribution.target_amount,
      });

      return data;
    } catch (error) {
      console.error('Error creating project contribution:', error);
      throw error;
    }
  }

  async createProjectContributionAssignments(
    assignments: Omit<ProjectContributionAssignment, 'id' | 'current_amount'>[],
    userId: string
  ) {
    try {
      console.log('Creating project contribution assignments:', assignments);
      
      const { data, error } = await supabase
        .from('project_contribution_assignments')
        .insert(
          assignments.map(assignment => ({
            ...assignment,
            current_amount: 0,
          }))
        )
        .select(`
          *,
          profiles (
            id,
            name,
            email
          )
        `);

      if (error) throw error;

      console.log('Created assignments:', data);

      await logAuditEvent('project_contribution_assignments_create', userId, assignments[0].project_id, {
        count: assignments.length,
        total_amount: assignments.reduce((sum, a) => sum + a.target_amount, 0),
      });

      return data;
    } catch (error) {
      console.error('Error creating project contribution assignments:', error);
      throw error;
    }
  }

  async recordPayment(
    projectId: string,
    userId: string,
    amount: number,
    paymentDate: string,
    notes?: string
  ) {
    try {
      console.log('Recording payment:', { projectId, userId, amount, paymentDate });

      // First get the project contribution to verify it exists
      const { data: contribution, error: contribError } = await supabase
        .from('project_contributions')
        .select('id, current_amount')
        .eq('project_id', projectId)
        .single();

      if (contribError) throw contribError;

      // Record the payment
      const { data: payment, error: paymentError } = await supabase
        .from('contributions')
        .insert({
          user_id: userId,
          amount,
          payment_date: paymentDate,
          contribution_type: 'project',
          project_id: projectId,
          status: 'paid',
          notes,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update the project contribution total
      const { error: updateContribError } = await supabase
        .from('project_contributions')
        .update({
          current_amount: (contribution.current_amount || 0) + amount
        })
        .eq('id', contribution.id);

      if (updateContribError) throw updateContribError;

      // Update the assignment amount
      const { error: updateAssignError } = await supabase
        .from('project_contribution_assignments')
        .update({
          current_amount: supabase.raw('current_amount + ?', [amount])
        })
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (updateAssignError) throw updateAssignError;

      await logAuditEvent('project_payment_record', userId, projectId, {
        amount,
        payment_date: paymentDate,
      });

      return payment;
    } catch (error) {
      console.error('Error recording project payment:', error);
      throw error;
    }
  }
}

export const projectContributionService = new ProjectContributionService();