import pool from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface MonthlyContributionSession {
  id: string;
  name: string;
  description?: string;
  start_date: Date;
  monthly_target_amount: number;
  duration_months: number;
  payment_deadline_day: number;
  status: 'active' | 'completed' | 'cancelled';
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface MonthlyContributionAssignment {
  id: string;
  session_id: string;
  user_id: string;
  monthly_amount: number;
  created_at: Date;
  updated_at: Date;
}

class MonthlyContributionModel {
  /**
   * Récupérer toutes les sessions de cotisations mensuelles
   */
  async getAllSessions(): Promise<MonthlyContributionSession[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM monthly_contribution_sessions ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la récupération des sessions de cotisations:', error);
      throw error;
    }
  }

  /**
   * Récupérer une session de cotisations mensuelles par son ID
   */
  async getSessionById(id: string): Promise<MonthlyContributionSession | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM monthly_contribution_sessions WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Erreur lors de la récupération de la session de cotisations ${id}:`, error);
      throw error;
    }
  }

  /**
   * Créer une nouvelle session de cotisations mensuelles
   */
  async createSession(sessionData: Omit<MonthlyContributionSession, 'id' | 'created_at' | 'updated_at'>): Promise<MonthlyContributionSession> {
    try {
      const id = uuidv4();
      const { name, description, start_date, monthly_target_amount, duration_months, payment_deadline_day, status, created_by } = sessionData;
      
      const result = await pool.query(
        `INSERT INTO monthly_contribution_sessions 
         (id, name, description, start_date, monthly_target_amount, duration_months, payment_deadline_day, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [id, name, description, start_date, monthly_target_amount, duration_months, payment_deadline_day, status, created_by]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la création de la session de cotisations:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une session de cotisations mensuelles
   */
  async updateSession(id: string, sessionData: Partial<Omit<MonthlyContributionSession, 'id' | 'created_at' | 'updated_at'>>): Promise<MonthlyContributionSession | null> {
    try {
      // Vérifier si la session existe
      const existingSession = await this.getSessionById(id);
      if (!existingSession) {
        return null;
      }
      
      // Construire la requête de mise à jour dynamiquement
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      Object.entries(sessionData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });
      
      if (updates.length === 0) {
        return existingSession;
      }
      
      values.push(id);
      
      const result = await pool.query(
        `UPDATE monthly_contribution_sessions 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la session de cotisations ${id}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer une session de cotisations mensuelles
   */
  async deleteSession(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM monthly_contribution_sessions WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Erreur lors de la suppression de la session de cotisations ${id}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les assignations pour une session
   */
  async getAssignmentsBySessionId(sessionId: string): Promise<MonthlyContributionAssignment[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM monthly_contribution_assignments WHERE session_id = $1',
        [sessionId]
      );
      
      return result.rows;
    } catch (error) {
      console.error(`Erreur lors de la récupération des assignations pour la session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Créer une nouvelle assignation de cotisation mensuelle
   */
  async createAssignment(assignmentData: Omit<MonthlyContributionAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<MonthlyContributionAssignment> {
    try {
      const id = uuidv4();
      const { session_id, user_id, monthly_amount } = assignmentData;
      
      const result = await pool.query(
        `INSERT INTO monthly_contribution_assignments 
         (id, session_id, user_id, monthly_amount)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, session_id, user_id, monthly_amount]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la création de l\'assignation de cotisation:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une assignation de cotisation mensuelle
   */
  async updateAssignment(id: string, assignmentData: Partial<Omit<MonthlyContributionAssignment, 'id' | 'created_at' | 'updated_at'>>): Promise<MonthlyContributionAssignment | null> {
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
          'SELECT * FROM monthly_contribution_assignments WHERE id = $1',
          [id]
        );
        return existingAssignment.rows[0] || null;
      }
      
      values.push(id);
      
      const result = await pool.query(
        `UPDATE monthly_contribution_assignments 
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
      console.error(`Erreur lors de la mise à jour de l'assignation de cotisation ${id}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer une assignation de cotisation mensuelle
   */
  async deleteAssignment(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM monthly_contribution_assignments WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'assignation de cotisation ${id}:`, error);
      throw error;
    }
  }
}

export default new MonthlyContributionModel();
