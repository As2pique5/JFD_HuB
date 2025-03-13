import { apiService } from './api';

export type AuditAction = 
  // Membres de la famille
  | 'member_create'
  | 'member_update'
  | 'member_delete'
  | 'password_reset'
  | 'role_change'
  | 'status_change'
  
  // Cotisations mensuelles
  | 'session_create'
  | 'session_update'
  | 'assignments_create'
  | 'payment_record'
  | 'payment_receipt_upload'
  
  // Événements
  | 'event_create'
  | 'event_update'
  | 'event_delete'
  | 'event_contribution_create'
  | 'event_contribution_assignments_create'
  | 'event_participant_add'
  | 'event_participant_update'
  | 'event_image_upload'
  
  // Projets
  | 'project_create'
  | 'project_update'
  | 'project_delete'
  | 'project_phase_create'
  | 'project_phase_update'
  | 'project_phase_delete'
  | 'project_participant_add'
  | 'project_participant_remove'
  | 'project_contribution_create'
  | 'project_contribution_update'
  | 'project_contribution_assignments_create'
  | 'project_payment_record'
  | 'project_image_upload'
  
  // Documents
  | 'document_category_create'
  | 'document_category_update'
  | 'document_category_delete'
  | 'document_upload'
  | 'document_update'
  | 'document_delete'
  | 'document_download'
  
  // Messages
  | 'message_send'
  | 'message_delete'
  | 'message_attachment_upload'
  | 'message_attachment_download';

export interface AuditLog {
  id: string;
  action: AuditAction;
  user_id: string;
  target_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export async function logAuditEvent(
  action: AuditAction,
  userId: string,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    console.log(`Journalisation d'un événement d'audit: ${action}`);
    await apiService.request('POST', '/audit/logs', {
      action,
      user_id: userId,
      target_id: targetId,
      details,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erreur lors de la journalisation de l\'événement d\'audit:', err);
  }
}

export async function getAuditLogs(
  filters?: {
    action?: AuditAction;
    userId?: string;
    targetId?: string;
    startDate?: string;
    endDate?: string;
  },
  page = 1,
  limit = 10
) {
  try {
    console.log('Récupération des journaux d\'audit avec filtres:', filters);
    
    let url = '/audit/logs';
    const queryParams = [];
    
    if (filters?.action) {
      queryParams.push(`action=${filters.action}`);
    }
    if (filters?.userId) {
      queryParams.push(`userId=${filters.userId}`);
    }
    if (filters?.targetId) {
      queryParams.push(`targetId=${filters.targetId}`);
    }
    if (filters?.startDate) {
      queryParams.push(`startDate=${filters.startDate}`);
    }
    if (filters?.endDate) {
      queryParams.push(`endDate=${filters.endDate}`);
    }
    
    queryParams.push(`page=${page}`);
    queryParams.push(`limit=${limit}`);
    
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
    
    const response = await apiService.request('GET', url);
    
    return {
      logs: response.logs,
      total: response.total,
      page: response.page,
      limit: response.limit
    };
  } catch (err) {
    console.error('Erreur lors de la récupération des journaux d\'audit:', err);
    throw err;
  }
}
