import { apiService } from '../lib/api';
import { logAuditEvent } from '../lib/audit';

export interface ProjectContribution {
  id: string;
  project_id: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  duration_months: number;
  status: 'active' | 'completed' | 'cancelled';
  project_contribution_assignments?: ProjectContributionAssignment[];
}

export interface ProjectContributionAssignment {
  id: string;
  user_id: string;
  project_id: string;
  target_amount: number;
  current_amount: number;
  monthly_amount: number;
  profiles?: {
    id: string;
    name: string;
    email: string;
  };
}

class LocalProjectContributionService {
  async getProjectContributions(year?: number) {
    try {
      console.log('Récupération des contributions aux projets pour l\'année:', year);
      
      let url = '/project-contributions';
      if (year) {
        url += `?year=${year}`;
      }
      
      const projects = await apiService.request('GET', url);
      console.log('Contributions aux projets récupérées:', projects);
      return projects;
    } catch (error) {
      console.error('Erreur dans getProjectContributions:', error);
      throw error;
    }
  }

  async createProjectContribution(contribution: Omit<ProjectContribution, 'id' | 'current_amount'>, userId: string) {
    try {
      console.log('Création d\'une contribution de projet:', contribution);
      
      const newContribution = await apiService.request('POST', '/project-contributions', {
        ...contribution,
        current_amount: 0
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_contribution_create',
        userId,
        newContribution.id,
        {
          project_id: contribution.project_id,
          target_amount: contribution.target_amount
        }
      );
      
      return newContribution;
    } catch (error) {
      console.error('Erreur lors de la création de la contribution de projet:', error);
      throw error;
    }
  }

  async updateProjectContribution(id: string, data: Partial<ProjectContribution>, userId: string) {
    try {
      console.log(`Mise à jour de la contribution de projet ${id}:`, data);
      
      const updatedContribution = await apiService.request('PUT', `/project-contributions/${id}`, data);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_contribution_update',
        userId,
        id,
        {
          changes: Object.keys(data).join(', ')
        }
      );
      
      return updatedContribution;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la contribution de projet ${id}:`, error);
      throw error;
    }
  }

  async deleteProjectContribution(id: string, userId: string) {
    try {
      console.log(`Suppression de la contribution de projet ${id}`);
      
      await apiService.request('DELETE', `/project-contributions/${id}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_contribution_delete',
        userId,
        id,
        {}
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression de la contribution de projet ${id}:`, error);
      throw error;
    }
  }

  async createAssignment(assignment: Omit<ProjectContributionAssignment, 'id' | 'current_amount'>, userId: string) {
    try {
      console.log('Création d\'une affectation de contribution:', assignment);
      
      const newAssignment = await apiService.request('POST', '/project-contribution-assignments', {
        ...assignment,
        current_amount: 0
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_contribution_assignment_create',
        userId,
        newAssignment.id,
        {
          user_id: assignment.user_id,
          project_id: assignment.project_id,
          target_amount: assignment.target_amount
        }
      );
      
      return newAssignment;
    } catch (error) {
      console.error('Erreur lors de la création de l\'affectation de contribution:', error);
      throw error;
    }
  }

  async updateAssignment(id: string, data: Partial<ProjectContributionAssignment>, userId: string) {
    try {
      console.log(`Mise à jour de l'affectation de contribution ${id}:`, data);
      
      const updatedAssignment = await apiService.request('PUT', `/project-contribution-assignments/${id}`, data);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_contribution_assignment_update',
        userId,
        id,
        {
          changes: Object.keys(data).join(', ')
        }
      );
      
      return updatedAssignment;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'affectation de contribution ${id}:`, error);
      throw error;
    }
  }

  async deleteAssignment(id: string, userId: string) {
    try {
      console.log(`Suppression de l'affectation de contribution ${id}`);
      
      await apiService.request('DELETE', `/project-contribution-assignments/${id}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_contribution_assignment_delete',
        userId,
        id,
        {}
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'affectation de contribution ${id}:`, error);
      throw error;
    }
  }

  async createProjectContributionAssignments(
    assignments: Omit<ProjectContributionAssignment, 'id' | 'current_amount'>[],
    userId: string
  ) {
    try {
      console.log('Création de plusieurs affectations de contribution:', assignments);
      
      const newAssignments = await apiService.request('POST', '/project-contribution-assignments/batch', 
        assignments.map(assignment => ({
          ...assignment,
          current_amount: 0
        }))
      );
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_contribution_assignments_create',
        userId,
        assignments[0].project_id,
        {
          count: assignments.length,
          total_amount: assignments.reduce((sum, a) => sum + a.target_amount, 0)
        }
      );
      
      return newAssignments;
    } catch (error) {
      console.error('Erreur lors de la création des affectations de contribution:', error);
      throw error;
    }
  }
  
  async getProjectContributionAssignments(projectId: string) {
    try {
      console.log(`Récupération des affectations de contribution pour le projet avec l'ID ${projectId}`);
      const assignments = await apiService.request('GET', `/projects/${projectId}/contribution-assignments`);
      return assignments;
    } catch (error) {
      console.error(`Erreur lors de la récupération des affectations de contribution pour le projet avec l'ID ${projectId}:`, error);
      return [];
    }
  }

  async recordPayment(projectId: string, userId: string, amount: number, paymentDate: string, notes?: string) {
    try {
      console.log(`Enregistrement d'un paiement de ${amount} pour le projet avec l'ID ${projectId} et l'utilisateur avec l'ID ${userId}`);
      
      const data = await apiService.request('POST', `/projects/${projectId}/payments`, {
        user_id: userId,
        amount,
        payment_date: paymentDate,
        notes
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'payment_record',
        userId,
        projectId,
        { amount, payment_date: paymentDate }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de l'enregistrement du paiement pour le projet avec l'ID ${projectId}:`, error);
      return { data: null, error };
    }
  }
}

export const localProjectContributionService = new LocalProjectContributionService();
