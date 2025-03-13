import { apiService } from '../lib/api';
import { logAuditEvent, AuditAction } from '../lib/audit';

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
  image_url?: string;
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

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: 'confirmed' | 'declined' | 'pending';
  notes?: string;
}

class EventService {
  async getEvents(filters?: {
    status?: string;
    type?: string;
    search?: string;
    requiresContribution?: boolean;
  }) {
    try {
      console.log('Récupération des événements avec filtres:', filters);
      
      let url = '/events';
      const queryParams = [];
      
      if (filters?.status) {
        queryParams.push(`status=${filters.status}`);
      }
      
      if (filters?.type) {
        queryParams.push(`type=${filters.type}`);
      }
      
      if (filters?.search) {
        queryParams.push(`search=${encodeURIComponent(filters.search)}`);
      }
      
      if (filters?.requiresContribution !== undefined) {
        queryParams.push(`requiresContribution=${filters.requiresContribution}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const events = await apiService.request('GET', url);
      console.log('Événements récupérés:', events);
      return { data: events, error: null };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return { data: null, error };
    }
  }

  async getEventById(id: string) {
    try {
      console.log(`Récupération de l'événement avec l'ID: ${id}`);
      const event = await apiService.request('GET', `/events/${id}`);
      return { data: event, error: null };
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'événement avec l'ID ${id}:`, error);
      return { data: null, error };
    }
  }

  async createEvent(event: Omit<Event, 'id' | 'created_by'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création d\'un nouvel événement:', event);
      const newEvent = await apiService.request('POST', '/events', {
        ...event,
        created_by: userId
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_create' as AuditAction,
        userId,
        newEvent.id,
        { 
          title: event.title,
          type: event.type,
          start_date: event.start_date
        }
      );
      
      return newEvent;
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error);
      throw error;
    }
  }

  async updateEvent(id: string, updates: Partial<Event>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour de l'événement avec l'ID ${id}:`, updates);
      const updatedEvent = await apiService.request('PUT', `/events/${id}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_update' as AuditAction,
        userId,
        id,
        { 
          title: updates.title,
          status: updates.status,
          details: `Événement mis à jour: ${updates.title || id}`
        }
      );
      
      return updatedEvent;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'événement avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async deleteEvent(id: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Suppression de l'événement avec l'ID: ${id}`);
      await apiService.request('DELETE', `/events/${id}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_delete' as AuditAction,
        userId,
        id,
        { details: `Événement supprimé avec l'ID: ${id}` }
      );
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'événement avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async createEventContribution(contribution: Omit<EventContribution, 'id' | 'current_amount'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création d\'une nouvelle contribution pour événement:', contribution);
      const newContribution = await apiService.request('POST', '/events/contributions', {
        ...contribution,
        current_amount: 0,
        created_by: userId
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_contribution_create' as AuditAction,
        userId,
        newContribution.id,
        {
          event_id: contribution.event_id,
          target_amount: contribution.target_amount
        }
      );
      
      return newContribution;
    } catch (error) {
      console.error('Erreur lors de la création de la contribution pour événement:', error);
      throw error;
    }
  }

  async createEventContributionAssignments(
    assignments: Omit<EventContributionAssignment, 'id' | 'current_amount'>[]
  ) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création des assignations de contribution pour événement:', assignments);
      const newAssignments = await apiService.request('POST', '/events/contribution-assignments', 
        assignments.map(assignment => ({
          ...assignment,
          current_amount: 0
        }))
      );
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_contribution_assignments_create' as AuditAction,
        userId,
        assignments[0].event_id,
        {
          count: assignments.length,
          total_amount: assignments.reduce((sum, a) => sum + a.target_amount, 0)
        }
      );
      
      return newAssignments;
    } catch (error) {
      console.error('Erreur lors de la création des assignations de contribution pour événement:', error);
      throw error;
    }
  }

  async addEventParticipant(participant: Omit<EventParticipant, 'id'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Ajout d\'un participant à l\'événement:', participant);
      const newParticipant = await apiService.request('POST', '/events/participants', participant);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_participant_add' as AuditAction,
        userId,
        participant.event_id,
        {
          user_id: participant.user_id,
          status: participant.status
        }
      );
      
      return newParticipant;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du participant à l\'événement:', error);
      throw error;
    }
  }

  async updateEventParticipantStatus(participantId: string, status: 'confirmed' | 'declined' | 'pending', notes?: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour du statut du participant avec l'ID ${participantId}:`, { status, notes });
      const updatedParticipant = await apiService.request('PUT', `/events/participants/${participantId}`, { 
        status,
        notes
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'event_participant_update' as AuditAction,
        userId,
        participantId,
        {
          status,
          notes
        }
      );
      
      return updatedParticipant;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du statut du participant avec l'ID ${participantId}:`, error);
      throw error;
    }
  }

  async uploadEventImage(eventId: string, file: File) {
    try {
      console.log(`Upload de l'image pour l'événement avec l'ID ${eventId}`);
      
      // Créer un FormData pour l'upload du fichier
      const formData = new FormData();
      formData.append('image', file);
      
      // Appeler l'API pour l'upload de l'image
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/events/${eventId}/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jfdhub_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload de l\'image');
      }
      
      const data = await response.json();
      
      // Journaliser l'événement d'audit
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      await logAuditEvent(
        'event_image_upload' as AuditAction,
        userId,
        eventId,
        { details: `Image téléversée pour l'événement avec l'ID: ${eventId}` }
      );
      
      return data;
    } catch (error) {
      console.error(`Erreur lors de l'upload de l'image pour l'événement avec l'ID ${eventId}:`, error);
      throw error;
    }
  }
}

export const localEventService = new EventService();
