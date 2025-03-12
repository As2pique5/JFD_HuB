import { supabase } from './supabase';

export type AuditAction = 
  | 'member_create'
  | 'member_update'
  | 'member_delete'
  | 'password_reset'
  | 'role_change'
  | 'status_change';

export interface AuditLog {
  action: AuditAction;
  userId: string;
  targetId?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export async function logAuditEvent(
  action: AuditAction,
  userId: string,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action,
        user_id: userId,
        target_id: targetId,
        details,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (err) {
    console.error('Error logging audit event:', err);
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
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.targetId) {
      query = query.eq('target_id', filters.targetId);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return {
      logs: data,
      total: count || 0,
      page,
      limit
    };
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    throw err;
  }
}