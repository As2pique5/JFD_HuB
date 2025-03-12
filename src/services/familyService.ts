import { supabase } from '../lib/supabase';
import { logAuditEvent } from '../lib/audit';

export interface FamilyMember {
  id: string;
  name: string;
  birth_date?: string;
  bio?: string;
  avatar_url?: string;
  user_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyRelationship {
  id: string;
  from_member_id: string;
  to_member_id: string;
  relationship_type: 'parent' | 'child' | 'spouse' | 'sibling';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

class FamilyService {
  async getFamilyMembers() {
    try {
      console.log('Fetching family members...');
      
      // Get all members from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role, status, birth_date, bio, avatar_url')
        .order('name');

      if (profilesError) throw profilesError;

      // Convert profiles to family members
      const members = profiles?.map(profile => ({
        id: profile.id,
        name: profile.name,
        birth_date: profile.birth_date,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        user: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          status: profile.status
        }
      })) || [];

      return members;
    } catch (error) {
      console.error('Error fetching family members:', error);
      throw error;
    }
  }

  async getFamilyRelationships() {
    try {
      console.log('Fetching family relationships...');
      
      const { data: relationships, error } = await supabase
        .from('family_relationships')
        .select(`
          *,
          from_member:profiles!family_relationships_from_member_id_fkey (
            id,
            name,
            birth_date,
            avatar_url
          ),
          to_member:profiles!family_relationships_to_member_id_fkey (
            id,
            name,
            birth_date,
            avatar_url
          )
        `);

      if (error) throw error;

      return relationships;
    } catch (error) {
      console.error('Error fetching family relationships:', error);
      throw error;
    }
  }

  async createFamilyRelationship(
    relationship: Omit<FamilyRelationship, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ) {
    try {
      console.log('Creating family relationship:', relationship);
      
      const { data, error } = await supabase
        .from('family_relationships')
        .insert({
          ...relationship,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Created relationship:', data);

      await logAuditEvent('family_relationship_create', userId, data.id, {
        from_member_id: relationship.from_member_id,
        to_member_id: relationship.to_member_id,
        type: relationship.relationship_type,
      });

      return data;
    } catch (error) {
      console.error('Error creating family relationship:', error);
      throw error;
    }
  }

  async updateFamilyRelationship(
    id: string,
    updates: Partial<FamilyRelationship>,
    userId: string
  ) {
    try {
      console.log('Updating family relationship:', { id, updates });
      
      const { data, error } = await supabase
        .from('family_relationships')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('Updated relationship:', data);

      await logAuditEvent('family_relationship_update', userId, id, updates);

      return data;
    } catch (error) {
      console.error('Error updating family relationship:', error);
      throw error;
    }
  }

  async deleteFamilyRelationship(id: string) {
    try {
      console.log('Deleting family relationship:', id);
      
      const { error } = await supabase
        .from('family_relationships')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('Deleted relationship:', id);
    } catch (error) {
      console.error('Error deleting family relationship:', error);
      throw error;
    }
  }

  async validateAndFixRelationships(userId: string) {
    try {
      console.log('Validating and fixing family relationships...');
      
      const { data, error } = await supabase
        .rpc('trigger_relationship_validation');

      if (error) throw error;

      // Log the validation event
      await logAuditEvent('family_relationships_validate', userId, null, {
        changes_made: data
      });

      console.log('Validation results:', data);
      return data;
    } catch (error) {
      console.error('Error validating relationships:', error);
      throw error;
    }
  }
}

export const familyService = new FamilyService();