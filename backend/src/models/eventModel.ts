import pool from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  start_date: Date;
  end_date?: Date;
  target_amount?: number;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: 'invited' | 'confirmed' | 'declined';
  created_at: Date;
  updated_at: Date;
}

export interface EventContribution {
  id: string;
  event_id: string;
  user_id: string;
  amount: number;
  payment_date: Date;
  payment_method: string;
  status: 'pending' | 'completed' | 'refunded';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EventContributionAssignment {
  id: string;
  event_id: string;
  user_id: string;
  amount: number;
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
}

class EventModel {
  /**
   * Récupérer tous les événements
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM events ORDER BY start_date DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      throw error;
    }
  }

  /**
   * Récupérer un événement par son ID
   */
  async getEventById(id: string): Promise<Event | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM events WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'événement ${id}:`, error);
      throw error;
    }
  }

  /**
   * Créer un nouvel événement
   */
  async createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    try {
      const id = uuidv4();
      const { 
        name, 
        description, 
        location, 
        start_date, 
        end_date, 
        target_amount, 
        status, 
        created_by 
      } = eventData;
      
      const result = await pool.query(
        `INSERT INTO events 
         (id, name, description, location, start_date, end_date, target_amount, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [id, name, description, location, start_date, end_date, target_amount, status, created_by]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un événement
   */
  async updateEvent(id: string, eventData: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>>): Promise<Event | null> {
    try {
      // Vérifier si l'événement existe
      const existingEvent = await this.getEventById(id);
      if (!existingEvent) {
        return null;
      }
      
      // Construire la requête de mise à jour dynamiquement
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      Object.entries(eventData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });
      
      if (updates.length === 0) {
        return existingEvent;
      }
      
      values.push(id);
      
      const result = await pool.query(
        `UPDATE events 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'événement ${id}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un événement
   */
  async deleteEvent(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM events WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'événement ${id}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer tous les participants d'un événement
   */
  async getEventParticipants(eventId: string): Promise<EventParticipant[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM event_participants WHERE event_id = $1',
        [eventId]
      );
      
      return result.rows;
    } catch (error) {
      console.error(`Erreur lors de la récupération des participants de l'événement ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Ajouter un participant à un événement
   */
  async addParticipant(participantData: Omit<EventParticipant, 'id' | 'created_at' | 'updated_at'>): Promise<EventParticipant> {
    try {
      const id = uuidv4();
      const { event_id, user_id, status } = participantData;
      
      const result = await pool.query(
        `INSERT INTO event_participants 
         (id, event_id, user_id, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, event_id, user_id, status]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de l\'ajout du participant:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un participant
   */
  async updateParticipantStatus(id: string, status: 'invited' | 'confirmed' | 'declined'): Promise<EventParticipant | null> {
    try {
      const result = await pool.query(
        `UPDATE event_participants 
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du statut du participant ${id}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un participant d'un événement
   */
  async removeParticipant(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM event_participants WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Erreur lors de la suppression du participant ${id}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les contributions d'un événement
   */
  async getEventContributions(eventId: string): Promise<EventContribution[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM event_contributions WHERE event_id = $1 ORDER BY payment_date DESC',
        [eventId]
      );
      
      return result.rows;
    } catch (error) {
      console.error(`Erreur lors de la récupération des contributions de l'événement ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Ajouter une contribution à un événement
   */
  async addContribution(contributionData: Omit<EventContribution, 'id' | 'created_at' | 'updated_at'>): Promise<EventContribution> {
    try {
      const id = uuidv4();
      const { 
        event_id, 
        user_id, 
        amount, 
        payment_date, 
        payment_method, 
        status, 
        notes 
      } = contributionData;
      
      const result = await pool.query(
        `INSERT INTO event_contributions 
         (id, event_id, user_id, amount, payment_date, payment_method, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, event_id, user_id, amount, payment_date, payment_method, status, notes]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la contribution:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une contribution
   */
  async updateContribution(id: string, contributionData: Partial<Omit<EventContribution, 'id' | 'created_at' | 'updated_at'>>): Promise<EventContribution | null> {
    try {
      // Construire la requête de mise à jour dynamiquement
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      Object.entries(contributionData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });
      
      if (updates.length === 0) {
        const existingContribution = await pool.query(
          'SELECT * FROM event_contributions WHERE id = $1',
          [id]
        );
        return existingContribution.rows[0] || null;
      }
      
      values.push(id);
      
      const result = await pool.query(
        `UPDATE event_contributions 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la contribution ${id}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer une contribution
   */
  async deleteContribution(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM event_contributions WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Erreur lors de la suppression de la contribution ${id}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les assignations de contributions d'un événement
   */
  async getContributionAssignments(eventId: string): Promise<EventContributionAssignment[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM event_contribution_assignments WHERE event_id = $1',
        [eventId]
      );
      
      return result.rows;
    } catch (error) {
      console.error(`Erreur lors de la récupération des assignations de l'événement ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Créer une assignation de contribution
   */
  async createAssignment(assignmentData: Omit<EventContributionAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<EventContributionAssignment> {
    try {
      const id = uuidv4();
      const { event_id, user_id, amount, due_date } = assignmentData;
      
      const result = await pool.query(
        `INSERT INTO event_contribution_assignments 
         (id, event_id, user_id, amount, due_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, event_id, user_id, amount, due_date]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la création de l\'assignation:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une assignation de contribution
   */
  async updateAssignment(id: string, assignmentData: Partial<Omit<EventContributionAssignment, 'id' | 'created_at' | 'updated_at'>>): Promise<EventContributionAssignment | null> {
    try {
      // Construire la requête de mise à jour dynamiquement
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      Object.entries(assignmentData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });
      
      if (updates.length === 0) {
        const existingAssignment = await pool.query(
          'SELECT * FROM event_contribution_assignments WHERE id = $1',
          [id]
        );
        return existingAssignment.rows[0] || null;
      }
      
      values.push(id);
      
      const result = await pool.query(
        `UPDATE event_contribution_assignments 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'assignation ${id}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer une assignation de contribution
   */
  async deleteAssignment(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM event_contribution_assignments WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'assignation ${id}:`, error);
      throw error;
    }
  }
}

export default new EventModel();
