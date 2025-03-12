import { supabase } from '../lib/supabase';
import { logAuditEvent } from '../lib/audit';

export interface MonthlyContributionSession {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  monthly_target_amount: number;
  duration_months: number;
  payment_deadline_day: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  created_by?: string;
}

export interface MonthlyContributionAssignment {
  id?: string;
  session_id: string;
  user_id: string;
  monthly_amount: number;
}

export interface Contribution {
  id?: string;
  user_id: string;
  session_id: string;
  amount: number;
  payment_date: string;
  payment_period_start?: string;
  payment_period_end?: string;
  contribution_type: 'monthly' | 'event' | 'project';
  status: 'paid' | 'pending' | 'late';
  notes?: string;
}

class ContributionService {
  async getMonthlySessions(filters?: {
    status?: 'active' | 'completed' | 'cancelled';
    year?: number;
  }) {
    try {
      console.log('Fetching monthly sessions with filters:', filters);
      
      let query = supabase
        .from('monthly_contribution_sessions')
        .select(`
          *,
          monthly_contribution_assignments!monthly_contribution_assignments_session_id_fkey (
            id,
            user_id,
            monthly_amount,
            profiles!monthly_contribution_assignments_user_id_fkey (
              id,
              name,
              email
            )
          )
        `);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.year) {
        const startDate = `${filters.year}-01-01`;
        const endDate = `${filters.year}-12-31`;
        query = query.gte('start_date', startDate).lte('start_date', endDate);
      }

      query = query.order('created_at', { ascending: false });

      const { data: sessions, error } = await query;

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }

      console.log('Fetched sessions:', sessions);
      return sessions || [];
    } catch (error) {
      console.error('Error in getMonthlySessions:', error);
      throw error;
    }
  }

  async getSessionPayments(sessionId: string) {
    try {
      console.log('Fetching payments for session:', sessionId);
      
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          *,
          profiles!contributions_user_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('session_id', sessionId)
        .eq('contribution_type', 'monthly')
        .eq('status', 'paid')
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }

      console.log('Fetched payments:', data);
      return data || [];
    } catch (error) {
      console.error('Error in getSessionPayments:', error);
      throw error;
    }
  }

  async updateMonthlySession(sessionId: string, updates: Partial<MonthlyContributionSession>) {
    try {
      console.log('Updating monthly session:', { sessionId, updates });

      const { data, error } = await supabase
        .from('monthly_contribution_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      console.log('Updated session:', data);
      return data;
    } catch (error) {
      console.error('Error updating monthly session:', error);
      throw error;
    }
  }

  async createMonthlySession(session: Omit<MonthlyContributionSession, 'id' | 'created_at'>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('monthly_contribution_sessions')
        .insert({
          ...session,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }

      await logAuditEvent('session_create', userId, data.id, {
        name: session.name,
        monthly_target_amount: session.monthly_target_amount,
      });

      return data;
    } catch (error) {
      console.error('Error in createMonthlySession:', error);
      throw error;
    }
  }

  async createMonthlyAssignments(assignments: MonthlyContributionAssignment[], userId: string) {
    try {
      const { data, error } = await supabase
        .from('monthly_contribution_assignments')
        .insert(assignments)
        .select(`
          *,
          profiles!monthly_contribution_assignments_user_id_fkey (
            id,
            name,
            email
          )
        `);

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }

      await logAuditEvent('assignments_create', userId, assignments[0].session_id, {
        count: assignments.length,
        total_amount: assignments.reduce((sum, a) => sum + a.monthly_amount, 0),
      });

      return data;
    } catch (error) {
      console.error('Error in createMonthlyAssignments:', error);
      throw error;
    }
  }

  async recordPayment(payment: Contribution, userId: string) {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .insert({
          ...payment,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }

      await logAuditEvent('payment_record', userId, payment.session_id, {
        amount: payment.amount,
        user_id: payment.user_id,
      });

      return data;
    } catch (error) {
      console.error('Error in recordPayment:', error);
      throw error;
    }
  }

  async deleteMonthlySession(sessionId: string) {
    try {
      const { error } = await supabase
        .from('monthly_contribution_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error in deleteMonthlySession:', error);
      throw error;
    }
  }
}

export const contributionService = new ContributionService();