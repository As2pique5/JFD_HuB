import { supabase } from '../lib/supabase';
import { logAuditEvent } from '../lib/audit';

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
      let query = supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      if (filters?.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  }

  async getMember(id: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching member:', error);
      throw error;
    }
  }

  async createMember(member: Omit<Member, 'id' | 'created_at'>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(member)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('member_create', userId, data.id, {
        name: member.name,
        role: member.role,
      });

      return data;
    } catch (error) {
      console.error('Error creating member:', error);
      throw error;
    }
  }

  async updateMember(id: string, updates: Partial<Member>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('member_update', userId, id, updates);

      return data;
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }

  async deleteMember(id: string, userId: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent('member_delete', userId, id);
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  }

  async updateMemberStatus(id: string, status: 'active' | 'inactive', userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('status_change', userId, id, { status });

      return data;
    } catch (error) {
      console.error('Error updating member status:', error);
      throw error;
    }
  }

  async updateMemberRole(id: string, role: 'super_admin' | 'intermediate' | 'standard', userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('role_change', userId, id, { role });

      return data;
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }
}

export const memberService = new MemberService();