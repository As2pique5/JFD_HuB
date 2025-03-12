import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db';

/**
 * Interface pour un projet familial
 */
interface Project {
  id: string;
  name: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  target_amount?: number;
  status: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface pour une phase de projet
 */
interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface pour un participant à un projet
 */
interface ProjectParticipant {
  id: string;
  project_id: string;
  user_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface pour une contribution à un projet
 */
interface ProjectContribution {
  id: string;
  project_id: string;
  user_id: string;
  amount: number;
  payment_date: Date;
  payment_method: string;
  status: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface pour une assignation de contribution à un projet
 */
interface ProjectContributionAssignment {
  id: string;
  project_id: string;
  user_id: string;
  amount: number;
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Modèle pour la gestion des projets familiaux
 */
class ProjectModel {
  private pool: Pool;

  constructor() {
    this.pool = db;
  }

  /**
   * Récupérer tous les projets
   */
  async getAllProjects(): Promise<Project[]> {
    const query = `
      SELECT * FROM projects
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Récupérer un projet par son ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    const query = `
      SELECT * FROM projects
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Créer un nouveau projet
   */
  async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO projects (
        id, name, description, start_date, end_date, 
        target_amount, status, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      projectData.name,
      projectData.description || null,
      projectData.start_date,
      projectData.end_date || null,
      projectData.target_amount || null,
      projectData.status,
      projectData.created_by,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Mettre à jour un projet
   */
  async updateProject(id: string, updateData: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Promise<Project | null> {
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

    // Ajouter l'ID du projet comme dernier paramètre
    values.push(id);

    // Si aucun champ à mettre à jour, retourner null
    if (updateFields.length === 1) {
      return null;
    }

    const query = `
      UPDATE projects
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter - 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Supprimer un projet
   */
  async deleteProject(id: string): Promise<boolean> {
    // Supprimer d'abord les données associées
    await this.pool.query('DELETE FROM project_contribution_assignments WHERE project_id = $1', [id]);
    await this.pool.query('DELETE FROM project_contributions WHERE project_id = $1', [id]);
    await this.pool.query('DELETE FROM project_participants WHERE project_id = $1', [id]);
    await this.pool.query('DELETE FROM project_phases WHERE project_id = $1', [id]);

    // Supprimer le projet
    const query = 'DELETE FROM projects WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Récupérer toutes les phases d'un projet
   */
  async getProjectPhases(projectId: string): Promise<ProjectPhase[]> {
    const query = `
      SELECT * FROM project_phases
      WHERE project_id = $1
      ORDER BY start_date ASC
    `;

    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Créer une nouvelle phase de projet
   */
  async createPhase(phaseData: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectPhase> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO project_phases (
        id, project_id, name, description, start_date, 
        end_date, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      id,
      phaseData.project_id,
      phaseData.name,
      phaseData.description || null,
      phaseData.start_date,
      phaseData.end_date || null,
      phaseData.status,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Mettre à jour une phase de projet
   */
  async updatePhase(id: string, updateData: Partial<Omit<ProjectPhase, 'id' | 'project_id' | 'created_at' | 'updated_at'>>): Promise<ProjectPhase | null> {
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

    // Ajouter l'ID de la phase comme dernier paramètre
    values.push(id);

    // Si aucun champ à mettre à jour, retourner null
    if (updateFields.length === 1) {
      return null;
    }

    const query = `
      UPDATE project_phases
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter - 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Supprimer une phase de projet
   */
  async deletePhase(id: string): Promise<boolean> {
    const query = 'DELETE FROM project_phases WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Récupérer tous les participants d'un projet
   */
  async getProjectParticipants(projectId: string): Promise<ProjectParticipant[]> {
    const query = `
      SELECT pp.*, p.email, p.first_name, p.last_name
      FROM project_participants pp
      JOIN profiles p ON pp.user_id = p.id
      WHERE pp.project_id = $1
      ORDER BY pp.created_at ASC
    `;

    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Ajouter un participant à un projet
   */
  async addParticipant(participantData: Omit<ProjectParticipant, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectParticipant> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO project_participants (
        id, project_id, user_id, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      id,
      participantData.project_id,
      participantData.user_id,
      participantData.status,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Mettre à jour le statut d'un participant
   */
  async updateParticipantStatus(id: string, status: string): Promise<ProjectParticipant | null> {
    const now = new Date();

    const query = `
      UPDATE project_participants
      SET status = $1, updated_at = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await this.pool.query(query, [status, now, id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Supprimer un participant d'un projet
   */
  async removeParticipant(id: string): Promise<boolean> {
    const query = 'DELETE FROM project_participants WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Récupérer toutes les contributions d'un projet
   */
  async getProjectContributions(projectId: string): Promise<ProjectContribution[]> {
    const query = `
      SELECT pc.*, p.email, p.first_name, p.last_name
      FROM project_contributions pc
      JOIN profiles p ON pc.user_id = p.id
      WHERE pc.project_id = $1
      ORDER BY pc.payment_date DESC
    `;

    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Ajouter une contribution à un projet
   */
  async addContribution(contributionData: Omit<ProjectContribution, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectContribution> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO project_contributions (
        id, project_id, user_id, amount, payment_date, 
        payment_method, status, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      contributionData.project_id,
      contributionData.user_id,
      contributionData.amount,
      contributionData.payment_date,
      contributionData.payment_method,
      contributionData.status,
      contributionData.notes || null,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Mettre à jour une contribution
   */
  async updateContribution(id: string, updateData: Partial<Omit<ProjectContribution, 'id' | 'project_id' | 'created_at' | 'updated_at'>>): Promise<ProjectContribution | null> {
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
      UPDATE project_contributions
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
    const query = 'DELETE FROM project_contributions WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Récupérer toutes les assignations de contributions d'un projet
   */
  async getContributionAssignments(projectId: string): Promise<ProjectContributionAssignment[]> {
    const query = `
      SELECT pca.*, p.email, p.first_name, p.last_name
      FROM project_contribution_assignments pca
      JOIN profiles p ON pca.user_id = p.id
      WHERE pca.project_id = $1
      ORDER BY pca.created_at DESC
    `;

    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Créer une assignation de contribution
   */
  async createAssignment(assignmentData: Omit<ProjectContributionAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectContributionAssignment> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO project_contribution_assignments (
        id, project_id, user_id, amount, due_date, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      id,
      assignmentData.project_id,
      assignmentData.user_id,
      assignmentData.amount,
      assignmentData.due_date || null,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Mettre à jour une assignation de contribution
   */
  async updateAssignment(id: string, updateData: Partial<Omit<ProjectContributionAssignment, 'id' | 'project_id' | 'created_at' | 'updated_at'>>): Promise<ProjectContributionAssignment | null> {
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

    // Ajouter l'ID de l'assignation comme dernier paramètre
    values.push(id);

    // Si aucun champ à mettre à jour, retourner null
    if (updateFields.length === 1) {
      return null;
    }

    const query = `
      UPDATE project_contribution_assignments
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter - 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Supprimer une assignation de contribution
   */
  async deleteAssignment(id: string): Promise<boolean> {
    const query = 'DELETE FROM project_contribution_assignments WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export default new ProjectModel();
