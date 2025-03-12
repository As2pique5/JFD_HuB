import { apiService } from '../lib/api';
import { logAuditEvent } from '../lib/audit';

export interface FamilyMember {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  is_alive?: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyRelationship {
  id: string;
  from_member_id: string;
  to_member_id: string;
  relationship_type: 'parent' | 'child' | 'spouse' | 'sibling';
  relationship_details?: string;
  created_at: string;
  updated_at: string;
}

class FamilyService {
  async getFamilyMembers() {
    try {
      console.log('Récupération des membres de la famille...');
      const members = await apiService.getFamilyMembers();
      return members;
    } catch (error) {
      console.error('Erreur lors de la récupération des membres de la famille:', error);
      throw error;
    }
  }

  async getFamilyMemberById(id: string) {
    try {
      console.log(`Récupération du membre de la famille avec l'ID: ${id}`);
      const member = await apiService.getFamilyMemberById(id);
      return member;
    } catch (error) {
      console.error(`Erreur lors de la récupération du membre de la famille avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async createFamilyMember(data: Partial<FamilyMember>) {
    try {
      console.log('Création d\'un nouveau membre de la famille:', data);
      const member = await apiService.createFamilyMember(data);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_create',
        localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system',
        member.id,
        { details: `Nouveau membre de la famille créé: ${member.first_name} ${member.last_name}` }
      );
      
      return member;
    } catch (error) {
      console.error('Erreur lors de la création du membre de la famille:', error);
      throw error;
    }
  }

  async updateFamilyMember(id: string, data: Partial<FamilyMember>) {
    try {
      console.log(`Mise à jour du membre de la famille avec l'ID ${id}:`, data);
      const member = await apiService.updateFamilyMember(id, data);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_update',
        localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system',
        id,
        { details: `Membre de la famille mis à jour: ${member.first_name} ${member.last_name}` }
      );
      
      return member;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du membre de la famille avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async deleteFamilyMember(id: string) {
    try {
      console.log(`Suppression du membre de la famille avec l'ID: ${id}`);
      const result = await apiService.deleteFamilyMember(id);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_delete',
        localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system',
        id,
        { details: `Membre de la famille supprimé avec l'ID: ${id}` }
      );
      
      return result;
    } catch (error) {
      console.error(`Erreur lors de la suppression du membre de la famille avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async getFamilyRelationships() {
    try {
      console.log('Récupération des relations familiales...');
      const relationships = await apiService.getFamilyRelationships();
      return relationships;
    } catch (error) {
      console.error('Erreur lors de la récupération des relations familiales:', error);
      throw error;
    }
  }

  async createFamilyRelationship(data: Partial<FamilyRelationship>) {
    try {
      console.log('Création d\'une nouvelle relation familiale:', data);
      const relationship = await apiService.createFamilyRelationship(data);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_create',
        localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system',
        relationship.id,
        { 
          details: `Nouvelle relation familiale créée entre ${relationship.from_member_id} et ${relationship.to_member_id}`,
          type: 'family_relationship'
        }
      );
      
      return relationship;
    } catch (error) {
      console.error('Erreur lors de la création de la relation familiale:', error);
      throw error;
    }
  }

  async getFamilyTree() {
    try {
      console.log('Récupération de l\'arbre généalogique...');
      const tree = await apiService.getFamilyTree();
      return tree;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'arbre généalogique:', error);
      throw error;
    }
  }

  async uploadFamilyMemberPhoto(id: string, file: File) {
    try {
      console.log(`Upload de la photo pour le membre de la famille avec l'ID ${id}`);
      
      // Créer un FormData pour l'upload du fichier
      const formData = new FormData();
      formData.append('photo', file);
      
      // Appeler l'API pour l'upload de la photo
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/family/members/${id}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jfdhub_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload de la photo');
      }
      
      const data = await response.json();
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'member_update',
        localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system',
        id,
        { details: `Photo mise à jour pour le membre de la famille avec l'ID: ${id}` }
      );
      
      return data;
    } catch (error) {
      console.error(`Erreur lors de l'upload de la photo pour le membre de la famille avec l'ID ${id}:`, error);
      throw error;
    }
  }
}

export const localFamilyService = new FamilyService();
