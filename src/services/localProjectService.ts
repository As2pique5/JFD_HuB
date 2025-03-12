import { apiService } from '../lib/api';
import { logAuditEvent } from '../lib/audit';

export interface Project {
  id: string;
  title: string;
  description?: string;
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  manager_id?: string;
  created_by?: string;
  image_url?: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface ProjectParticipant {
  id: string;
  project_id: string;
  user_id: string;
  role: 'manager' | 'contributor' | 'observer';
  joined_at: string;
}

export interface ProjectContribution {
  id: string;
  project_id: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  duration_months: number;
  status: 'active' | 'completed' | 'cancelled';
}

class ProjectService {
  async getProjects(filters?: {
    status?: string;
    search?: string;
    requiresContribution?: boolean;
  }) {
    try {
      console.log('Récupération des projets avec filtres:', filters);
      
      let url = '/projects';
      const queryParams = [];
      
      if (filters?.status) {
        queryParams.push(`status=${filters.status}`);
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
      
      const projects = await apiService.request('GET', url);
      console.log('Projets récupérés:', projects);
      return projects;
    } catch (error) {
      console.error('Erreur lors de la récupération des projets:', error);
      throw error;
    }
  }

  async getProjectById(id: string) {
    try {
      console.log(`Récupération du projet avec l'ID: ${id}`);
      const project = await apiService.request('GET', `/projects/${id}`);
      return project;
    } catch (error) {
      console.error(`Erreur lors de la récupération du projet avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'spent' | 'progress'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création d\'un nouveau projet:', project);
      const newProject = await apiService.request('POST', '/projects', {
        ...project,
        spent: 0,
        progress: 0,
        created_by: userId,
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_create',
        userId,
        newProject.id,
        {
          title: project.title,
          budget: project.budget,
        }
      );
      
      return newProject;
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      throw error;
    }
  }

  async updateProject(id: string, updates: Partial<Project>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour du projet avec l'ID ${id}:`, updates);
      const updatedProject = await apiService.request('PUT', `/projects/${id}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_update',
        userId,
        id,
        updates
      );
      
      return updatedProject;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du projet avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async deleteProject(id: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Suppression du projet avec l'ID: ${id}`);
      await apiService.request('DELETE', `/projects/${id}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_delete',
        userId,
        id,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression du projet avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async createProjectPhase(phase: Omit<ProjectPhase, 'id'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création d\'une nouvelle phase de projet:', phase);
      const newPhase = await apiService.request('POST', '/projects/phases', phase);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_phase_create',
        userId,
        phase.project_id,
        {
          name: phase.name,
        }
      );
      
      return newPhase;
    } catch (error) {
      console.error('Erreur lors de la création de la phase de projet:', error);
      throw error;
    }
  }

  async updateProjectPhase(id: string, updates: Partial<ProjectPhase>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour de la phase de projet avec l'ID ${id}:`, updates);
      const updatedPhase = await apiService.request('PUT', `/projects/phases/${id}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_phase_update',
        userId,
        id,
        updates
      );
      
      return updatedPhase;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la phase de projet avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async deleteProjectPhase(id: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Suppression de la phase de projet avec l'ID: ${id}`);
      await apiService.request('DELETE', `/projects/phases/${id}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_phase_delete',
        userId,
        id,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression de la phase de projet avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async addProjectParticipant(participant: Omit<ProjectParticipant, 'id' | 'joined_at'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Ajout d\'un participant au projet:', participant);
      const newParticipant = await apiService.request('POST', '/projects/participants', {
        ...participant,
        joined_at: new Date().toISOString()
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_participant_add',
        userId,
        participant.project_id,
        {
          user_id: participant.user_id,
          role: participant.role
        }
      );
      
      return newParticipant;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du participant au projet:', error);
      throw error;
    }
  }

  async removeProjectParticipant(id: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Suppression du participant au projet avec l'ID: ${id}`);
      await apiService.request('DELETE', `/projects/participants/${id}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_participant_remove',
        userId,
        id,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression du participant au projet avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async createProjectContribution(contribution: Omit<ProjectContribution, 'id' | 'current_amount'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création d\'une nouvelle contribution pour projet:', contribution);
      const newContribution = await apiService.request('POST', '/projects/contributions', {
        ...contribution,
        current_amount: 0
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_contribution_create',
        userId,
        contribution.project_id,
        {
          target_amount: contribution.target_amount,
          duration_months: contribution.duration_months
        }
      );
      
      return newContribution;
    } catch (error) {
      console.error('Erreur lors de la création de la contribution pour projet:', error);
      throw error;
    }
  }

  async updateProjectContribution(id: string, updates: Partial<ProjectContribution>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour de la contribution pour projet avec l'ID ${id}:`, updates);
      const updatedContribution = await apiService.request('PUT', `/projects/contributions/${id}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'project_contribution_update',
        userId,
        id,
        updates
      );
      
      return updatedContribution;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la contribution pour projet avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async uploadProjectImage(projectId: string, file: File) {
    try {
      console.log(`Upload de l'image pour le projet avec l'ID ${projectId}`);
      
      // Créer un FormData pour l'upload du fichier
      const formData = new FormData();
      formData.append('image', file);
      
      // Appeler l'API pour l'upload de l'image
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/image`, {
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
        'project_image_upload',
        userId,
        projectId,
        { details: `Image téléversée pour le projet avec l'ID: ${projectId}` }
      );
      
      return data;
    } catch (error) {
      console.error(`Erreur lors de l'upload de l'image pour le projet avec l'ID ${projectId}:`, error);
      throw error;
    }
  }
}

export const localProjectService = new ProjectService();
