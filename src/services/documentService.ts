import { supabase } from '../lib/supabase';
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
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching document categories:', error);
      throw error;
    }
  }

  async getDocuments(filters?: {
    categoryId?: string;
    search?: string;
  }) {
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          category:document_categories (
            id,
            name,
            description,
            icon
          ),
          uploader:profiles!documents_uploaded_by_fkey (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }

  async createCategory(category: Omit<DocumentCategory, 'id' | 'created_at' | 'updated_at'>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .insert({
          ...category,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('document_category_create', userId, data.id, {
        name: category.name,
      });

      return data;
    } catch (error) {
      console.error('Error creating document category:', error);
      throw error;
    }
  }

  async uploadDocument(
    file: File,
    metadata: {
      name: string;
      description?: string;
      categoryId?: string;
    },
    userId: string
  ) {
    try {
      // Generate a unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          name: metadata.name,
          description: metadata.description,
          category_id: metadata.categoryId,
          file_path: publicUrl,
          file_type: fileExt || 'unknown',
          file_size: file.size,
          uploaded_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await logAuditEvent('document_upload', userId, data.id, {
        name: metadata.name,
        category_id: metadata.categoryId,
        file_size: file.size,
      });

      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string, userId: string) {
    try {
      // Get the document to get its file path
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const filePath = document.file_path.split('/').slice(-2).join('/');
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      await logAuditEvent('document_delete', userId, documentId);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async updateDocument(
    documentId: string,
    updates: Partial<Document>,
    userId: string
  ) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('document_update', userId, documentId, updates);

      return data;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();