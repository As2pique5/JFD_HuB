import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db';

export interface Document {
  id: string;
  title: string;
  description?: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category_id?: string;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export class DocumentModel {
  private pool: Pool;

  constructor() {
    this.pool = db;
  }

  // ========== Méthodes pour les documents ==========

  async getAllDocuments(): Promise<Document[]> {
    const query = `
      SELECT d.*, c.name as category_name, u.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      LEFT JOIN profiles u ON d.uploaded_by = u.id
      ORDER BY d.created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getDocumentById(id: string): Promise<Document | null> {
    const query = `
      SELECT d.*, c.name as category_name, u.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      LEFT JOIN profiles u ON d.uploaded_by = u.id
      WHERE d.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0 ? result.rows[0] : null;
  }

  async getDocumentsByCategory(categoryId: string): Promise<Document[]> {
    const query = `
      SELECT d.*, c.name as category_name, u.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      LEFT JOIN profiles u ON d.uploaded_by = u.id
      WHERE d.category_id = $1
      ORDER BY d.created_at DESC
    `;
    const result = await this.pool.query(query, [categoryId]);
    return result.rows;
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    const query = `
      SELECT d.*, c.name as category_name, u.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      LEFT JOIN profiles u ON d.uploaded_by = u.id
      WHERE d.uploaded_by = $1
      ORDER BY d.created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async createDocument(documentData: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO documents (
        id, title, description, file_path, file_type, file_size, 
        category_id, uploaded_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      id,
      documentData.title,
      documentData.description || null,
      documentData.file_path,
      documentData.file_type,
      documentData.file_size,
      documentData.category_id || null,
      documentData.uploaded_by,
      now,
      now
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateDocument(id: string, documentData: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>>): Promise<Document | null> {
    // Vérifier si le document existe
    const document = await this.getDocumentById(id);
    if (!document) {
      return null;
    }
    
    // Construire la requête de mise à jour dynamiquement
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Ajouter chaque champ à mettre à jour
    if (documentData.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(documentData.title);
    }
    
    if (documentData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(documentData.description);
    }
    
    if (documentData.file_path !== undefined) {
      updateFields.push(`file_path = $${paramIndex++}`);
      values.push(documentData.file_path);
    }
    
    if (documentData.file_type !== undefined) {
      updateFields.push(`file_type = $${paramIndex++}`);
      values.push(documentData.file_type);
    }
    
    if (documentData.file_size !== undefined) {
      updateFields.push(`file_size = $${paramIndex++}`);
      values.push(documentData.file_size);
    }
    
    if (documentData.category_id !== undefined) {
      updateFields.push(`category_id = $${paramIndex++}`);
      values.push(documentData.category_id);
    }
    
    // Ajouter la date de mise à jour
    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    
    // Ajouter l'ID à la fin des valeurs pour la clause WHERE
    values.push(id);
    
    // Si aucun champ à mettre à jour, retourner le document existant
    if (updateFields.length === 1) { // Seulement updated_at
      return document;
    }
    
    const query = `
      UPDATE documents
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async deleteDocument(id: string): Promise<boolean> {
    const query = 'DELETE FROM documents WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ========== Méthodes pour les catégories de documents ==========

  async getAllCategories(): Promise<DocumentCategory[]> {
    const query = `
      SELECT c.*, u.full_name as created_by_name
      FROM document_categories c
      LEFT JOIN profiles u ON c.created_by = u.id
      ORDER BY c.name
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getCategoryById(id: string): Promise<DocumentCategory | null> {
    const query = `
      SELECT c.*, u.full_name as created_by_name
      FROM document_categories c
      LEFT JOIN profiles u ON c.created_by = u.id
      WHERE c.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0 ? result.rows[0] : null;
  }

  async createCategory(categoryData: Omit<DocumentCategory, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentCategory> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO document_categories (
        id, name, description, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      id,
      categoryData.name,
      categoryData.description || null,
      categoryData.created_by,
      now,
      now
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateCategory(id: string, categoryData: Partial<Omit<DocumentCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<DocumentCategory | null> {
    // Vérifier si la catégorie existe
    const category = await this.getCategoryById(id);
    if (!category) {
      return null;
    }
    
    // Construire la requête de mise à jour dynamiquement
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Ajouter chaque champ à mettre à jour
    if (categoryData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(categoryData.name);
    }
    
    if (categoryData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(categoryData.description);
    }
    
    // Ajouter la date de mise à jour
    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    
    // Ajouter l'ID à la fin des valeurs pour la clause WHERE
    values.push(id);
    
    // Si aucun champ à mettre à jour, retourner la catégorie existante
    if (updateFields.length === 1) { // Seulement updated_at
      return category;
    }
    
    const query = `
      UPDATE document_categories
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    // Vérifier si des documents sont associés à cette catégorie
    const documentsQuery = 'SELECT COUNT(*) FROM documents WHERE category_id = $1';
    const documentsResult = await this.pool.query(documentsQuery, [id]);
    
    if (parseInt(documentsResult.rows[0].count) > 0) {
      // Si des documents sont associés, mettre leur category_id à null
      await this.pool.query('UPDATE documents SET category_id = NULL WHERE category_id = $1', [id]);
    }
    
    // Supprimer la catégorie
    const query = 'DELETE FROM document_categories WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}
