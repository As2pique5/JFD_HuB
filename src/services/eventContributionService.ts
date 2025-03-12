import { supabase } from '../lib/supabase';
import { logAuditEvent } from '../lib/audit';

export interface EventContribution {
  id: string;
  event_id: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  status: 'active' | 'completed' | 'cancelled';
  created_by?: string;
}

export interface EventContributionAssignment {
  id: string;
  event_id: string;
  user_id: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
}

class EventContributionService {
  async getEventContributions(year?: number) {
    try {
      console.log('Fetching event contributions for year:', year);
      
      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_date,
          requires_contribution,
          event_contributions (
            id,
            target_amount,
            current_amount,
            deadline,
            status,
            event_contribution_assignments (
              id,
              user_id,
              target_amount,
              current_amount,
              deadline,
              profiles (
                id,
                name,
                email
              )
            )
          )
        `)
        .eq('requires_contribution', true);

      // Add year filter if provided
      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte('start_date', startDate).lte('start_date', endDate);
      }

      query = query.order('start_date', { ascending: false });

      const { data: events, error: eventsError } = await query;

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        throw eventsError;
      }

      console.log('Fetched events:', events);
      return events;
    } catch (error) {
      console.error('Error in getEventContributions:', error);
      throw error;
    }
  }

  async createEventContribution(contribution: Omit<EventContribution, 'id' | 'current_amount'>, userId: string) {
    try {
      console.log('Creating event contribution:', contribution);
      
      const { data, error } = await supabase
        .from('event_contributions')
        .insert({
          ...contribution,
          current_amount: 0,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Created contribution:', data);

      await logAuditEvent('event_contribution_create', userId, data.id, {
        event_id: contribution.event_id,
        target_amount: contribution.target_amount,
      });

      return data;
    } catch (error) {
      console.error('Error creating event contribution:', error);
      throw error;
    }
  }

  async createEventContributionAssignments(
    assignments: Omit<EventContributionAssignment, 'id' | 'current_amount'>[],
    userId: string
  ) {
    try {
      console.log('Creating event contribution assignments:', assignments);
      
      // First get the contribution ID for this event
      const { data: contribution, error: contribError } = await supabase
        .from('event_contributions')
        .select('id')
        .eq('event_id', assignments[0].event_id)
        .single();

      if (contribError) throw contribError;

      // Create assignments with contribution_id
      const { data, error } = await supabase
        .from('event_contribution_assignments')
        .insert(
          assignments.map(assignment => ({
            ...assignment,
            current_amount: 0,
            contribution_id: contribution.id
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

      await logAuditEvent('event_contribution_assignments_create', userId, assignments[0].event_id, {
        count: assignments.length,
        total_amount: assignments.reduce((sum, a) => sum + a.target_amount, 0),
      });

      return data;
    } catch (error) {
      console.error('Error creating event contribution assignments:', error);
      throw error;
    }
  }

  async recordPayment(
    eventId: string,
    userId: string,
    amount: number,
    paymentDate: string,
    notes?: string
  ) {
    try {
      console.log('Recording payment:', { eventId, userId, amount, paymentDate });

      // First get the event contribution to verify it exists
      const { data: contribution, error: contribError } = await supabase
        .from('event_contributions')
        .select('id, current_amount')
        .eq('event_id', eventId)
        .single();

      if (contribError) throw contribError;

      // Record the payment
      const { data: payment, error: paymentError } = await supabase
        .from('contributions')
        .insert({
          user_id: userId,
          amount,
          payment_date: paymentDate,
          contribution_type: 'event',
          event_id: eventId,
          status: 'paid',
          notes,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update the event contribution total
      const { error: updateContribError } = await supabase
        .from('event_contributions')
        .update({
          current_amount: (contribution.current_amount || 0) + amount
        })
        .eq('id', contribution.id);

      if (updateContribError) throw updateContribError;

      // Update the assignment amount
      const { error: updateAssignError } = await supabase
        .from('event_contribution_assignments')
        .update({
          current_amount: supabase.raw('current_amount + ?', [amount])
        })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (updateAssignError) throw updateAssignError;

      await logAuditEvent('event_payment_record', userId, eventId, {
        amount,
        payment_date: paymentDate,
      });

      return payment;
    } catch (error) {
      console.error('Error recording event payment:', error);
      throw error;
    }
  }
}

export const eventContributionService = new EventContributionService();