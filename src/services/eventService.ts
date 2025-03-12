import { supabase } from '../lib/supabase';
import { logAuditEvent } from '../lib/audit';

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: 'meeting' | 'celebration' | 'assistance' | 'other';
  start_date: string;
  end_date: string;
  location?: string;
  organizer_id?: string;
  status: 'upcoming' | 'ongoing' | 'past' | 'cancelled';
  created_by?: string;
  requires_contribution?: boolean;
}

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

class EventService {
  async getEvents(filters?: {
    status?: string;
    type?: string;
    search?: string;
    requiresContribution?: boolean;
  }) {
    try {
      console.log('Fetching events with filters:', filters);
      
      // Build the base query with all necessary relations
      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey (
            id,
            name,
            email
          ),
          event_contributions!event_contributions_event_id_fkey (
            id,
            target_amount,
            current_amount,
            deadline,
            status,
            event_contribution_assignments!event_contribution_assignments_contribution_id_fkey (
              id,
              user_id,
              target_amount,
              current_amount,
              deadline,
              profiles!event_contribution_assignments_user_id_fkey (
                id,
                name,
                email
              )
            )
          )
        `);

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.requiresContribution !== undefined) {
        query = query.eq('requires_contribution', filters.requiresContribution);
      }

      // Order by start date
      query = query.order('start_date', { ascending: false });

      // Execute the query
      const { data: events, error: eventsError } = await query;

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        throw eventsError;
      }

      console.log('Fetched events:', events);
      return { data: events, error: null };
    } catch (error) {
      console.error('Error in getEvents:', error);
      return { data: null, error };
    }
  }

  async createEventContribution(contribution: Omit<EventContribution, 'id' | 'current_amount'>, userId: string) {
    try {
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
          profiles!event_contribution_assignments_user_id_fkey (
            id,
            name,
            email
          )
        `);

      if (error) throw error;

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

  async deleteEvent(id: string) {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
}

export const eventService = new EventService();