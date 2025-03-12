import { Request, Response } from 'express';
import { DocumentModel } from '../models/documentModel';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createAuditLog } from '../utils/audit';

export class DocumentController {
  private documentModel: DocumentModel;
  private uploadDir: string;

  constructor() {
    this.documentModel = new DocumentModel();
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
  }

  // ========== Méthodes pour les documents ==========

  async getAllDocuments(req: Request, res: Response): Promise<Response> {
    try {
      const documents = await this.documentModel.getAllDocuments();
      return res.status(200).json(documents);
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des documents' });
    }
  }

  async getDocumentById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const document = await this.documentModel.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document non trouvé' });
      }
      
      return res.status(200).json(document);
    } catch (error) {
      console.error('Erreur lors de la récupération du document:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du document' });
    }
  }

  async getDocumentsByCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { categoryId } = req.params;
      const documents = await this.documentModel.getDocumentsByCategory(categoryId);
      return res.status(200).json(documents);
    } catch (error) {
      console.error('Erreur lors de la récupération des documents par catégorie:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des documents par catégorie' });
    }
  }

  async getDocumentsByUser(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const documents = await this.documentModel.getDocumentsByUser(userId);
      return res.status(200).json(documents);
    } catch (error) {
      console.error('Erreur lors de la récupération des documents par utilisateur:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des documents par utilisateur' });
    }
  }

  async uploadDocument(req: Request, res: Response): Promise<Response> {
    try {
      // Vérifier si un fichier a été téléchargé
      if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier n\'a été téléchargé' });
      }
      
      const { title, description, category_id } = req.body;
      const userId = (req as any).user.id; // Récupérer l'ID de l'utilisateur à partir du token JWT
      
      // Générer un nom de fichier unique pour éviter les collisions
      const fileExtension = path.extname(req.file.originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      
      // Chemin où le fichier sera stocké
      const filePath = path.join(this.uploadDir, uniqueFilename);
      
      // Déplacer le fichier téléchargé vers le dossier de destination
      fs.renameSync(req.file.path, path.join(__dirname, '../../', filePath));
      
      // Créer l'entrée dans la base de données
      const newDocument = await this.documentModel.createDocument({
        title,
        description,
        file_path: filePath,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        category_id: category_id || undefined,
        uploaded_by: userId
      });
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'create',
        target_type: 'document',
        target_id: newDocument.id,
        details: `Document "${title}" téléchargé`
      });
      
      return res.status(201).json(newDocument);
    } catch (error) {
      console.error('Erreur lors du téléchargement du document:', error);
      return res.status(500).json({ message: 'Erreur lors du téléchargement du document' });
    }
  }

  async updateDocument(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { title, description, category_id } = req.body;
      const userId = (req as any).user.id;
      
      // Vérifier si le document existe
      const existingDocument = await this.documentModel.getDocumentById(id);
      if (!existingDocument) {
        return res.status(404).json({ message: 'Document non trouvé' });
      }
      
      // Préparer les données à mettre à jour
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category_id !== undefined) updateData.category_id = category_id || null;
      
      // Si un nouveau fichier est téléchargé
      if (req.file) {
        // Supprimer l'ancien fichier
        const oldFilePath = path.join(__dirname, '../../', existingDocument.file_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
        
        // Générer un nom de fichier unique pour le nouveau fichier
        const fileExtension = path.extname(req.file.originalname);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(this.uploadDir, uniqueFilename);
        
        // Déplacer le nouveau fichier
        fs.renameSync(req.file.path, path.join(__dirname, '../../', filePath));
        
        // Mettre à jour les informations du fichier
        updateData.file_path = filePath;
        updateData.file_type = req.file.mimetype;
        updateData.file_size = req.file.size;
      }
      
      // Mettre à jour le document dans la base de données
      const updatedDocument = await this.documentModel.updateDocument(id, updateData);
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'update',
        target_type: 'document',
        target_id: id,
        details: `Document "${existingDocument.title}" mis à jour`
      });
      
      return res.status(200).json(updatedDocument);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du document:', error);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du document' });
    }
  }

  async deleteDocument(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si le document existe
      const document = await this.documentModel.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: 'Document non trouvé' });
      }
      
      // Supprimer le fichier physique
      const filePath = path.join(__dirname, '../../', document.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Supprimer l'entrée dans la base de données
      const deleted = await this.documentModel.deleteDocument(id);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Erreur lors de la suppression du document' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'delete',
        target_type: 'document',
        target_id: id,
        details: `Document "${document.title}" supprimé`
      });
      
      return res.status(200).json({ message: 'Document supprimé avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression du document:', error);
      return res.status(500).json({ message: 'Erreur lors de la suppression du document' });
    }
  }

  async downloadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Récupérer les informations du document
      const document = await this.documentModel.getDocumentById(id);
      if (!document) {
        res.status(404).json({ message: 'Document non trouvé' });
        return;
      }
      
      // Chemin complet du fichier
      const filePath = path.join(__dirname, '../../', document.file_path);
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ message: 'Fichier non trouvé sur le serveur' });
        return;
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'download',
        target_type: 'document',
        target_id: id,
        details: `Document "${document.title}" téléchargé par l'utilisateur`
      });
      
      // Envoyer le fichier au client
      res.download(filePath, document.title + path.extname(document.file_path), (err) => {
        if (err) {
          console.error('Erreur lors du téléchargement du fichier:', err);
          res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
        }
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement du document:', error);
      res.status(500).json({ message: 'Erreur lors du téléchargement du document' });
    }
  }

  // ========== Méthodes pour les catégories de documents ==========

  async getAllCategories(req: Request, res: Response): Promise<Response> {
    try {
      const categories = await this.documentModel.getAllCategories();
      return res.status(200).json(categories);
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
    }
  }

  async getCategoryById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const category = await this.documentModel.getCategoryById(id);
      
      if (!category) {
        return res.status(404).json({ message: 'Catégorie non trouvée' });
      }
      
      return res.status(200).json(category);
    } catch (error) {
      console.error('Erreur lors de la récupération de la catégorie:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération de la catégorie' });
    }
  }

  async createCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { name, description } = req.body;
      const userId = (req as any).user.id;
      
      if (!name) {
        return res.status(400).json({ message: 'Le nom de la catégorie est requis' });
      }
      
      const newCategory = await this.documentModel.createCategory({
        name,
        description,
        created_by: userId
      });
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'create',
        target_type: 'document_category',
        target_id: newCategory.id,
        details: `Catégorie de document "${name}" créée`
      });
      
      return res.status(201).json(newCategory);
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      return res.status(500).json({ message: 'Erreur lors de la création de la catégorie' });
    }
  }

  async updateCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const userId = (req as any).user.id;
      
      // Vérifier si la catégorie existe
      const existingCategory = await this.documentModel.getCategoryById(id);
      if (!existingCategory) {
        return res.status(404).json({ message: 'Catégorie non trouvée' });
      }
      
      // Préparer les données à mettre à jour
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      
      // Mettre à jour la catégorie dans la base de données
      const updatedCategory = await this.documentModel.updateCategory(id, updateData);
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'update',
        target_type: 'document_category',
        target_id: id,
        details: `Catégorie de document "${existingCategory.name}" mise à jour`
      });
      
      return res.status(200).json(updatedCategory);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour de la catégorie' });
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si la catégorie existe
      const category = await this.documentModel.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: 'Catégorie non trouvée' });
      }
      
      // Supprimer la catégorie
      const deleted = await this.documentModel.deleteCategory(id);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'delete',
        target_type: 'document_category',
        target_id: id,
        details: `Catégorie de document "${category.name}" supprimée`
      });
      
      return res.status(200).json({ message: 'Catégorie supprimée avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      return res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
    }
  }
}
