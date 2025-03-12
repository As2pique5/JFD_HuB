import { supabase } from '../lib/supabase';
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
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
}

class ProjectService {
  async getProjects(filters?: {
    status?: string;
    search?: string;
    requiresContribution?: boolean;
  }) {
    try {
      let query = supabase
        .from('projects')
        .select(`
          *,
          manager:profiles!projects_manager_id_fkey (
            id,
            name,
            email
          ),
          project_phases (
            id,
            name,
            status,
            progress
          ),
          project_participants (
            id,
            user_id,
            profiles:user_id (
              id,
              name,
              email
            )
          ),
          project_contributions (
            id,
            target_amount,
            current_amount,
            start_date,
            duration_months
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'spent' | 'progress'>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...project,
          spent: 0,
          progress: 0,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('project_create', userId, data.id, {
        title: project.title,
        budget: project.budget,
      });

      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: string, updates: Partial<Project>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('project_update', userId, id, updates);

      return data;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(id: string, userId: string) {
    try {
      // First check if the project exists
      const { data: project, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!project) throw new Error('Project not found');

      // Delete the project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Log the deletion
      await logAuditEvent('project_delete', userId, id, {
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  async createProjectPhase(phase: Omit<ProjectPhase, 'id'>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('project_phases')
        .insert(phase)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('project_phase_create', userId, phase.project_id, {
        name: phase.name,
      });

      return data;
    } catch (error) {
      console.error('Error creating project phase:', error);
      throw error;
    }
  }

  async updateProjectPhase(id: string, updates: Partial<ProjectPhase>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('project_phases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('project_phase_update', userId, id, updates);

      return data;
    } catch (error) {
      console.error('Error updating project phase:', error);
      throw error;
    }
  }

  async addProjectParticipant(projectId: string, userId: string, creatorId: string) {
    try {
      const { data, error } = await supabase
        .from('project_participants')
        .insert({
          project_id: projectId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('project_participant_add', creatorId, projectId, {
        user_id: userId,
      });

      return data;
    } catch (error) {
      console.error('Error adding project participant:', error);
      throw error;
    }
  }

  async removeProjectParticipant(projectId: string, userId: string, removerId: string) {
    try {
      const { error } = await supabase
        .from('project_participants')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      await logAuditEvent('project_participant_remove', removerId, projectId, {
        user_id: userId,
      });
    } catch (error) {
      console.error('Error removing project participant:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();