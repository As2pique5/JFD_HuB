import { apiService } from '../lib/api';
import { logAuditEvent } from '../lib/audit';

export interface Document {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

class DocumentService {
  async getCategories() {
    try {
      console.log('Récupération des catégories de documents...');
      const categories = await apiService.request('GET', '/documents/categories');
      console.log('Catégories récupérées:', categories);
      return categories;
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories de documents:', error);
      throw error;
    }
  }

  async getDocuments(filters?: {
    categoryId?: string;
    search?: string;
  }) {
    try {
      console.log('Récupération des documents avec filtres:', filters);
      
      let url = '/documents';
      const queryParams = [];
      
      if (filters?.categoryId) {
        queryParams.push(`categoryId=${filters.categoryId}`);
      }
      
      if (filters?.search) {
        queryParams.push(`search=${encodeURIComponent(filters.search)}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const documents = await apiService.request('GET', url);
      console.log('Documents récupérés:', documents);
      return documents;
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error);
      throw error;
    }
  }

  async createCategory(category: Omit<DocumentCategory, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création d\'une nouvelle catégorie de documents:', category);
      const newCategory = await apiService.request('POST', '/documents/categories', {
        ...category,
        created_by: userId,
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'document_category_create',
        userId,
        newCategory.id,
        {
          name: category.name,
        }
      );
      
      return newCategory;
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie de documents:', error);
      throw error;
    }
  }

  async updateCategory(id: string, updates: Partial<DocumentCategory>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour de la catégorie de documents avec l'ID ${id}:`, updates);
      const updatedCategory = await apiService.request('PUT', `/documents/categories/${id}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'document_category_update',
        userId,
        id,
        {
          name: updates.name,
          description: updates.description,
        }
      );
      
      return updatedCategory;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la catégorie de documents avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async deleteCategory(id: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Suppression de la catégorie de documents avec l'ID: ${id}`);
      await apiService.request('DELETE', `/documents/categories/${id}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'document_category_delete',
        userId,
        id,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression de la catégorie de documents avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async uploadDocument(
    file: File,
    metadata: {
      name: string;
      description?: string;
      categoryId?: string;
    }
  ) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Upload d\'un nouveau document:', { file, metadata });
      
      // Créer un FormData pour l'upload du fichier
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', metadata.name);
      
      if (metadata.description) {
        formData.append('description', metadata.description);
      }
      
      if (metadata.categoryId) {
        formData.append('categoryId', metadata.categoryId);
      }
      
      // Appeler l'API pour l'upload du document
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jfdhub_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload du document');
      }
      
      const data = await response.json();
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'document_upload',
        userId,
        data.id,
        {
          name: metadata.name,
          category_id: metadata.categoryId,
          file_size: file.size,
        }
      );
      
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'upload du document:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Suppression du document avec l'ID: ${documentId}`);
      await apiService.request('DELETE', `/documents/${documentId}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'document_delete',
        userId,
        documentId,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression du document avec l'ID ${documentId}:`, error);
      throw error;
    }
  }

  async updateDocument(
    documentId: string,
    updates: Partial<Pick<Document, 'name' | 'description' | 'category_id'>>
  ) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Mise à jour du document avec l'ID ${documentId}:`, updates);
      const updatedDocument = await apiService.request('PUT', `/documents/${documentId}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'document_update',
        userId,
        documentId,
        {
          name: updates.name,
          description: updates.description,
          category_id: updates.category_id,
        }
      );
      
      return updatedDocument;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du document avec l'ID ${documentId}:`, error);
      throw error;
    }
  }

  async downloadDocument(documentId: string) {
    try {
      console.log(`Téléchargement du document avec l'ID: ${documentId}`);
      
      // Créer l'URL de téléchargement
      const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documents/${documentId}/download`;
      
      // Ouvrir l'URL dans un nouvel onglet pour le téléchargement
      window.open(downloadUrl, '_blank');
      
      // Journaliser l'événement d'audit
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      await logAuditEvent(
        'document_download',
        userId,
        documentId,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors du téléchargement du document avec l'ID ${documentId}:`, error);
      throw error;
    }
  }
}

export const localDocumentService = new DocumentService();
