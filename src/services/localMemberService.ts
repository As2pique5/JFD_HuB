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
      
      const data = await apiService.request('GET', endpoint);
      return { data, error: null };
    } catch (error) {
      console.error('Erreur lors de la récupération des membres:', error);
      return { data: null, error };
    }
  }

  async getMember(id: string) {
    try {
      console.log(`Récupération du membre avec l'ID: ${id}`);
      const data = await apiService.request('GET', `/members/${id}`);
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la récupération du membre avec l'ID ${id}:`, error);
      return { data: null, error };
    }
  }

  async createMember(member: Omit<Member, 'id' | 'created_at'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création d\'un nouveau membre:', member);
      const data = await apiService.request('POST', '/members', member);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_create' as AuditAction,
        userId,
        data.id,
        {
          name: member.name,
          role: member.role
        }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error('Erreur lors de la création du membre:', error);
      return { data: null, error };
    }
  }

  async updateMember(id: string, updates: Partial<Member>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour du membre avec l'ID ${id}:`, updates);
      const data = await apiService.request('PUT', `/members/${id}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_update' as AuditAction,
        userId,
        id,
        updates
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du membre avec l'ID ${id}:`, error);
      return { data: null, error };
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
      
      return { data: true, error: null };
    } catch (error) {
      console.error(`Erreur lors de la suppression du membre avec l'ID ${id}:`, error);
      return { data: false, error };
    }
  }

  async updateMemberStatus(id: string, status: 'active' | 'inactive') {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour du statut du membre avec l'ID ${id} à ${status}`);
      const data = await apiService.request('PATCH', `/members/${id}/status`, { status });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'status_change' as AuditAction,
        userId,
        id,
        { status }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du statut du membre avec l'ID ${id}:`, error);
      return { data: null, error };
    }
  }

  async updateMemberRole(id: string, role: 'super_admin' | 'intermediate' | 'standard') {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour du rôle du membre avec l'ID ${id} à ${role}`);
      const data = await apiService.request('PATCH', `/members/${id}/role`, { role });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'role_change' as AuditAction,
        userId,
        id,
        { role }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du rôle du membre avec l'ID ${id}:`, error);
      return { data: null, error };
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
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de l'upload de l'avatar pour le membre avec l'ID ${id}:`, error);
      return { data: null, error };
    }
  }

  async resetMemberPassword(id: string, newPassword: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Réinitialisation du mot de passe pour le membre avec l'ID ${id}`);
      
      const data = await apiService.request('POST', `/members/${id}/reset-password`, { password: newPassword });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'password_reset' as AuditAction,
        userId,
        id,
        { timestamp: new Date().toISOString() }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la réinitialisation du mot de passe pour le membre avec l'ID ${id}:`, error);
      return { data: null, error };
    }
  }

  async getMemberAuditLogs(memberId: string, page = 1, limit = 10) {
    try {
      console.log(`Récupération des journaux d'audit pour le membre avec l'ID ${memberId}`);
      
      const data = await apiService.request('GET', `/audit-logs?targetId=${memberId}&page=${page}&limit=${limit}`);
      
      return { data, error: null };
    } catch (error) {
      console.error(`Erreur lors de la récupération des journaux d'audit pour le membre avec l'ID ${memberId}:`, error);
      return { data: null, error };
    }
  }
}

export const localMemberService = new MemberService();
