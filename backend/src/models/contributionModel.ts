import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db';

/**
 * Interface pour une contribution financière
 */
export interface Contribution {
  id: string;
  user_id: string;
  amount: number;
  payment_date: Date;
  payment_method: string;
  status: 'pending' | 'completed' | 'refunded' | 'cancelled';
  source_type: 'monthly' | 'event' | 'project' | 'other';
  source_id?: string;
  notes?: string;
  receipt_url?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface pour un résumé financier
 */
export interface FinancialSummary {
  total_contributions: number;
  total_pending: number;
  total_completed: number;
  total_refunded: number;
  total_cancelled: number;
  monthly_contributions: number;
  event_contributions: number;
  project_contributions: number;
  other_contributions: number;
}

/**
 * Interface pour un bilan financier par période
 */
export interface FinancialPeriodSummary {
  period: string; // 'YYYY-MM' format pour les mois, 'YYYY' pour les années
  total_amount: number;
  completed_amount: number;
  pending_amount: number;
}

/**
 * Modèle pour la gestion des contributions financières
 */
export class ContributionModel {
  private pool: Pool;

  constructor() {
    this.pool = db;
  }

  /**
   * Récupérer toutes les contributions
   */
  async getAllContributions(): Promise<Contribution[]> {
    const query = `
      SELECT c.*, p.full_name as user_name
      FROM contributions c
      LEFT JOIN profiles p ON c.user_id = p.id
      ORDER BY c.payment_date DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Récupérer une contribution par son ID
   */
  async getContributionById(id: string): Promise<Contribution | null> {
    const query = `
      SELECT c.*, p.full_name as user_name
      FROM contributions c
      LEFT JOIN profiles p ON c.user_id = p.id
      WHERE c.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0 ? result.rows[0] : null;
  }

  /**
   * Récupérer les contributions d'un utilisateur
   */
  async getContributionsByUserId(userId: string): Promise<Contribution[]> {
    const query = `
      SELECT c.*, p.full_name as user_name
      FROM contributions c
      LEFT JOIN profiles p ON c.user_id = p.id
      WHERE c.user_id = $1
      ORDER BY c.payment_date DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Récupérer les contributions par source (mensuelle, événement, projet)
   */
  async getContributionsBySource(sourceType: string, sourceId?: string): Promise<Contribution[]> {
    let query = `
      SELECT c.*, p.full_name as user_name
      FROM contributions c
      LEFT JOIN profiles p ON c.user_id = p.id
      WHERE c.source_type = $1
    `;
    
    const params: any[] = [sourceType];
    
    if (sourceId) {
      query += ` AND c.source_id = $2`;
      params.push(sourceId);
    }
    
    query += ` ORDER BY c.payment_date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Créer une nouvelle contribution
   */
  async createContribution(contributionData: Omit<Contribution, 'id' | 'created_at' | 'updated_at'>): Promise<Contribution> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO contributions (
        id, user_id, amount, payment_date, payment_method, status,
        source_type, source_id, notes, receipt_url, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      id,
      contributionData.user_id,
      contributionData.amount,
      contributionData.payment_date,
      contributionData.payment_method,
      contributionData.status,
      contributionData.source_type,
      contributionData.source_id || null,
      contributionData.notes || null,
      contributionData.receipt_url || null,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Mettre à jour une contribution
   */
  async updateContribution(id: string, updateData: Partial<Omit<Contribution, 'id' | 'created_at' | 'updated_at'>>): Promise<Contribution | null> {
    // Construire les parties de la requête de mise à jour
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    // Ajouter chaque champ à mettre à jour
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    });

    // Ajouter la date de mise à jour
    updateFields.push(`updated_at = $${paramCounter}`);
    values.push(new Date());
    paramCounter++;

    // Ajouter l'ID de la contribution comme dernier paramètre
    values.push(id);

    // Si aucun champ à mettre à jour, retourner null
    if (updateFields.length === 1) {
      return null;
    }

    const query = `
      UPDATE contributions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter - 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Supprimer une contribution
   */
  async deleteContribution(id: string): Promise<boolean> {
    const query = 'DELETE FROM contributions WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Obtenir un résumé financier global
   */
  async getFinancialSummary(): Promise<FinancialSummary> {
    const query = `
      SELECT
        COALESCE(SUM(amount), 0) as total_contributions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_completed,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as total_refunded,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END), 0) as total_cancelled,
        COALESCE(SUM(CASE WHEN source_type = 'monthly' THEN amount ELSE 0 END), 0) as monthly_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'event' THEN amount ELSE 0 END), 0) as event_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'project' THEN amount ELSE 0 END), 0) as project_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'other' THEN amount ELSE 0 END), 0) as other_contributions
      FROM contributions
      WHERE status != 'cancelled'
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  /**
   * Obtenir un résumé financier pour un utilisateur spécifique
   */
  async getUserFinancialSummary(userId: string): Promise<FinancialSummary> {
    const query = `
      SELECT
        COALESCE(SUM(amount), 0) as total_contributions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_completed,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as total_refunded,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END), 0) as total_cancelled,
        COALESCE(SUM(CASE WHEN source_type = 'monthly' THEN amount ELSE 0 END), 0) as monthly_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'event' THEN amount ELSE 0 END), 0) as event_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'project' THEN amount ELSE 0 END), 0) as project_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'other' THEN amount ELSE 0 END), 0) as other_contributions
      FROM contributions
      WHERE user_id = $1 AND status != 'cancelled'
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Obtenir un résumé financier par mois
   */
  async getMonthlyFinancialSummary(year?: number): Promise<FinancialPeriodSummary[]> {
    let query = `
      SELECT
        TO_CHAR(payment_date, 'YYYY-MM') as period,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM contributions
      WHERE status != 'cancelled'
    `;
    
    const params: any[] = [];
    
    if (year) {
      query += ` AND EXTRACT(YEAR FROM payment_date) = $1`;
      params.push(year);
    }
    
    query += `
      GROUP BY period
      ORDER BY period DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Obtenir un résumé financier par année
   */
  async getYearlyFinancialSummary(): Promise<FinancialPeriodSummary[]> {
    const query = `
      SELECT
        TO_CHAR(payment_date, 'YYYY') as period,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM contributions
      WHERE status != 'cancelled'
      GROUP BY period
      ORDER BY period DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Obtenir les statistiques de paiement par méthode
   */
  async getPaymentMethodStats(): Promise<any[]> {
    const query = `
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM contributions
      WHERE status = 'completed'
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Obtenir les top contributeurs
   */
  async getTopContributors(limit: number = 10): Promise<any[]> {
    const query = `
      SELECT
        c.user_id,
        p.full_name,
        COUNT(*) as contribution_count,
        COALESCE(SUM(c.amount), 0) as total_amount
      FROM contributions c
      JOIN profiles p ON c.user_id = p.id
      WHERE c.status = 'completed'
      GROUP BY c.user_id, p.full_name
      ORDER BY total_amount DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }
}

export default new ContributionModel();
