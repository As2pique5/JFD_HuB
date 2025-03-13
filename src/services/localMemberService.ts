import { apiService } from '../lib/api';
import { logAuditEvent, AuditAction } from '../lib/audit';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'intermediate' | 'standard';
  phone?: string;
  status: 'active' | 'inactive';
  avatar_url?: string;
  created_at: string;
}

class MemberService {
  async getMembers(filters?: {
    role?: string;
    status?: string;
    search?: string;
  }) {
    try {
      console.log('Récupération des membres avec les filtres:', filters);
      
      let endpoint = '/members';
      const queryParams = [];
      
      if (filters?.role && filters.role !== 'all') {
        queryParams.push(`role=${filters.role}`);
      }
      if (filters?.status && filters.status !== 'all') {
        queryParams.push(`status=${filters.status}`);
      }
      if (filters?.search) {
        queryParams.push(`search=${encodeURIComponent(filters.search)}`);
      }
      
      if (queryParams.length > 0) {
        endpoint += `?${queryParams.join('&')}`;
      }
      
      const members = await apiService.request('GET', endpoint);
      return members;
    } catch (error) {
      console.error('Erreur lors de la récupération des membres:', error);
      throw error;
    }
  }

  async getMember(id: string) {
    try {
      console.log(`Récupération du membre avec l'ID: ${id}`);
      const member = await apiService.request('GET', `/members/${id}`);
      return member;
    } catch (error) {
      console.error(`Erreur lors de la récupération du membre avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async createMember(member: Omit<Member, 'id' | 'created_at'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création d\'un nouveau membre:', member);
      const newMember = await apiService.request('POST', '/members', member);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_create' as AuditAction,
        userId,
        newMember.id,
        {
          name: member.name,
          role: member.role
        }
      );
      
      return newMember;
    } catch (error) {
      console.error('Erreur lors de la création du membre:', error);
      throw error;
    }
  }

  async updateMember(id: string, updates: Partial<Member>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour du membre avec l'ID ${id}:`, updates);
      const updatedMember = await apiService.request('PUT', `/members/${id}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_update' as AuditAction,
        userId,
        id,
        updates
      );
      
      return updatedMember;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du membre avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async deleteMember(id: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Suppression du membre avec l'ID: ${id}`);
      await apiService.request('DELETE', `/members/${id}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_delete' as AuditAction,
        userId,
        id,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression du membre avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async updateMemberStatus(id: string, status: 'active' | 'inactive') {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour du statut du membre avec l'ID ${id} à ${status}`);
      const updatedMember = await apiService.request('PATCH', `/members/${id}/status`, { status });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'status_change' as AuditAction,
        userId,
        id,
        { status }
      );
      
      return updatedMember;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du statut du membre avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async updateMemberRole(id: string, role: 'super_admin' | 'intermediate' | 'standard') {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour du rôle du membre avec l'ID ${id} à ${role}`);
      const updatedMember = await apiService.request('PATCH', `/members/${id}/role`, { role });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'role_change' as AuditAction,
        userId,
        id,
        { role }
      );
      
      return updatedMember;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du rôle du membre avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async uploadMemberAvatar(id: string, file: File) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Upload de l'avatar pour le membre avec l'ID ${id}`);
      
      // Créer un FormData pour l'upload du fichier
      const formData = new FormData();
      formData.append('avatar', file);
      
      // Appeler l'API pour l'upload de l'avatar
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/members/${id}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jfdhub_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload de l\'avatar');
      }
      
      const data = await response.json();
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_avatar_upload' as AuditAction,
        userId,
        id,
        { details: `Avatar téléversé pour le membre avec l'ID: ${id}` }
      );
      
      return data;
    } catch (error) {
      console.error(`Erreur lors de l'upload de l'avatar pour le membre avec l'ID ${id}:`, error);
      throw error;
    }
  }
}

export const localMemberService = new MemberService();
