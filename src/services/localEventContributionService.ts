import { apiService } from '../lib/api';
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
      console.log('Récupération des contributions d\'événements pour l\'année:', year);
      
      let url = '/events/contributions';
      if (year) {
        url += `?year=${year}`;
      }
      
      const data = await apiService.request('GET', url);
      return { data, error: null };
    } catch (error) {
      console.error('Erreur lors de la récupération des contributions d\'événements:', error);
      return { data: null, error };
    }
  }

  async getEventContribution(eventId: string) {
    try {
      console.log(`Récupération de la contribution pour l'événement avec l'ID: ${eventId}`);
      
      const data = await apiService.request('GET', `/events/${eventId}/contribution`);
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la récupération de la contribution pour l'événement avec l'ID ${eventId}:`, error);
      return { data: null, error };
    }
  }

  async createEventContribution(eventId: string, contribution: Omit<EventContribution, 'id' | 'event_id'>) {
    try {
      console.log(`Création d'une contribution pour l'événement avec l'ID: ${eventId}`, contribution);
      
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      const data = await apiService.request('POST', `/events/${eventId}/contribution`, {
        ...contribution,
        created_by: userId
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_contribution_create',
        userId,
        eventId,
        {
          target_amount: contribution.target_amount,
          deadline: contribution.deadline
        }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la création de la contribution pour l'événement avec l'ID ${eventId}:`, error);
      return { data: null, error };
    }
  }

  async updateEventContribution(eventId: string, contributionId: string, updates: Partial<EventContribution>) {
    try {
      console.log(`Mise à jour de la contribution avec l'ID: ${contributionId} pour l'événement avec l'ID: ${eventId}`, updates);
      
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      const data = await apiService.request('PUT', `/events/${eventId}/contribution/${contributionId}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_update', // Utiliser event_update car event_contribution_update n'existe pas dans AuditAction
        userId,
        contributionId,
        {
          target_amount: updates.target_amount,
          current_amount: updates.current_amount,
          status: updates.status
        }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la contribution avec l'ID ${contributionId}:`, error);
      return { data: null, error };
    }
  }

  async createEventContributionAssignments(eventId: string, contributionId: string, assignments: Omit<EventContributionAssignment, 'id' | 'event_id'>[]) {
    try {
      console.log(`Création d'assignations pour la contribution avec l'ID: ${contributionId}`, assignments);
      
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      const data = await apiService.request('POST', `/events/${eventId}/contribution/${contributionId}/assignments`, assignments);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_contribution_assignments_create',
        userId,
        contributionId,
        {
          count: assignments.length,
          total_target_amount: assignments.reduce((sum, a) => sum + a.target_amount, 0)
        }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la création des assignations pour la contribution avec l'ID ${contributionId}:`, error);
      return { data: null, error };
    }
  }

  async updateEventContributionAssignment(eventId: string, contributionId: string, assignmentId: string, updates: Partial<EventContributionAssignment>) {
    try {
      console.log(`Mise à jour de l'assignation avec l'ID: ${assignmentId}`, updates);
      
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      const data = await apiService.request('PUT', `/events/${eventId}/contribution/${contributionId}/assignments/${assignmentId}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_participant_update', // Utiliser event_participant_update car event_contribution_assignment_update n'existe pas dans AuditAction
        userId,
        assignmentId,
        {
          target_amount: updates.target_amount,
          current_amount: updates.current_amount
        }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'assignation avec l'ID ${assignmentId}:`, error);
      return { data: null, error };
    }
  }

  async recordPayment(eventId: string, contributionId: string, assignmentId: string, amount: number) {
    try {
      console.log(`Enregistrement d'un paiement de ${amount} pour l'assignation avec l'ID: ${assignmentId}`);
      
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      const data = await apiService.request('POST', `/events/${eventId}/contribution/${contributionId}/assignments/${assignmentId}/payment`, { amount });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'payment_record', // Utiliser payment_record car event_contribution_payment_record n'existe pas dans AuditAction
        userId,
        assignmentId,
        { amount }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de l'enregistrement du paiement pour l'assignation avec l'ID ${assignmentId}:`, error);
      return { data: null, error };
    }
  }
}

export const localEventContributionService = new EventContributionService();
