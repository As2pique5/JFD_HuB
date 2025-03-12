import { Request, Response } from 'express';
import messageModel, { Message, MessageAttachment } from '../models/messageModel';
import { createAuditLog } from '../utils/audit';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export class MessageController {
  /**
   * Récupérer tous les messages
   */
  async getAllMessages(req: Request, res: Response): Promise<Response> {
    try {
      const messages = await messageModel.getAllMessages();
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
    }
  }

  /**
   * Récupérer un message par son ID
   */
  async getMessageById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      const message = await messageModel.getMessageById(id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message non trouvé' });
      }
      
      // Vérifier si l'utilisateur est autorisé à voir ce message
      const isRecipient = message.recipients.some(r => r.recipient_id === userId);
      const isSender = message.sender_id === userId;
      
      if (!isRecipient && !isSender) {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à voir ce message' });
      }
      
      // Si l'utilisateur est un destinataire, marquer le message comme lu
      if (isRecipient) {
        await messageModel.markMessageAsRead(id, userId);
      }
      
      return res.status(200).json(message);
    } catch (error) {
      console.error(`Erreur lors de la récupération du message ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du message' });
    }
  }

  /**
   * Récupérer les messages envoyés par l'utilisateur
   */
  async getSentMessages(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const messages = await messageModel.getSentMessages(userId);
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages envoyés:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des messages envoyés' });
    }
  }

  /**
   * Récupérer les messages reçus par l'utilisateur
   */
  async getReceivedMessages(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const messages = await messageModel.getReceivedMessages(userId);
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages reçus:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des messages reçus' });
    }
  }

  /**
   * Récupérer les messages supprimés par l'utilisateur
   */
  async getDeletedMessages(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const messages = await messageModel.getDeletedMessages(userId);
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages supprimés:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des messages supprimés' });
    }
  }

  /**
   * Récupérer un fil de discussion
   */
  async getMessageThread(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si l'utilisateur est autorisé à voir ce message
      const message = await messageModel.getMessageById(id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message non trouvé' });
      }
      
      const isRecipient = message.recipients.some(r => r.recipient_id === userId);
      const isSender = message.sender_id === userId;
      
      if (!isRecipient && !isSender) {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à voir ce fil de discussion' });
      }
      
      const thread = await messageModel.getMessageThread(id);
      return res.status(200).json(thread);
    } catch (error) {
      console.error(`Erreur lors de la récupération du fil de discussion ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du fil de discussion' });
    }
  }

  /**
   * Créer un nouveau message
   */
  async createMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const { subject, content, recipient_ids, parent_id } = req.body;
      
      // Validation des données
      if (!subject || !content || !recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
        return res.status(400).json({ message: 'Données incomplètes pour la création du message' });
      }
      
      let attachments: Omit<MessageAttachment, 'id' | 'message_id' | 'created_at' | 'updated_at'>[] = [];
      
      // Traitement des pièces jointes si présentes
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        const attachmentsDir = path.join(uploadDir, 'attachments');
        
        // Créer le dossier des pièces jointes s'il n'existe pas
        if (!fs.existsSync(path.join(__dirname, '../../', attachmentsDir))) {
          fs.mkdirSync(path.join(__dirname, '../../', attachmentsDir), { recursive: true });
        }
        
        for (const file of req.files as Express.Multer.File[]) {
          // Générer un nom de fichier unique
          const fileExtension = path.extname(file.originalname);
          const uniqueFilename = `${uuidv4()}${fileExtension}`;
          const filePath = path.join(attachmentsDir, uniqueFilename);
          
          // Déplacer le fichier téléchargé
          fs.renameSync(file.path, path.join(__dirname, '../../', filePath));
          
          attachments.push({
            file_name: file.originalname,
            file_path: filePath,
            file_size: file.size,
            file_type: file.mimetype
          });
        }
      }
      
      // Créer le message
      const newMessage = await messageModel.createMessage(
        {
          sender_id: userId,
          subject,
          content,
          is_read: true, // Le message est lu par l'expéditeur
          parent_id,
          has_attachments: attachments.length > 0
        },
        recipient_ids,
        attachments
      );
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'create',
        target_type: 'message',
        target_id: newMessage.id,
        details: `Message créé avec le sujet "${subject}" et envoyé à ${recipient_ids.length} destinataire(s)`
      });
      
      return res.status(201).json(newMessage);
    } catch (error) {
      console.error('Erreur lors de la création du message:', error);
      return res.status(500).json({ message: 'Erreur lors de la création du message' });
    }
  }

  /**
   * Marquer un message comme lu
   */
  async markAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si l'utilisateur est un destinataire du message
      const message = await messageModel.getMessageById(id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message non trouvé' });
      }
      
      const isRecipient = message.recipients.some(r => r.recipient_id === userId);
      
      if (!isRecipient) {
        return res.status(403).json({ message: 'Vous n\'êtes pas un destinataire de ce message' });
      }
      
      const updated = await messageModel.markMessageAsRead(id, userId);
      
      if (!updated) {
        return res.status(500).json({ message: 'Erreur lors du marquage du message comme lu' });
      }
      
      return res.status(200).json({ message: 'Message marqué comme lu' });
    } catch (error) {
      console.error(`Erreur lors du marquage du message ${req.params.id} comme lu:`, error);
      return res.status(500).json({ message: 'Erreur lors du marquage du message comme lu' });
    }
  }

  /**
   * Marquer un message comme supprimé
   */
  async markAsDeleted(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si l'utilisateur est un destinataire du message
      const message = await messageModel.getMessageById(id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message non trouvé' });
      }
      
      const isRecipient = message.recipients.some(r => r.recipient_id === userId);
      
      if (!isRecipient) {
        return res.status(403).json({ message: 'Vous n\'êtes pas un destinataire de ce message' });
      }
      
      const updated = await messageModel.markMessageAsDeleted(id, userId);
      
      if (!updated) {
        return res.status(500).json({ message: 'Erreur lors du marquage du message comme supprimé' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'delete',
        target_type: 'message',
        target_id: id,
        details: `Message "${message.subject}" marqué comme supprimé`
      });
      
      return res.status(200).json({ message: 'Message marqué comme supprimé' });
    } catch (error) {
      console.error(`Erreur lors du marquage du message ${req.params.id} comme supprimé:`, error);
      return res.status(500).json({ message: 'Erreur lors du marquage du message comme supprimé' });
    }
  }

  /**
   * Restaurer un message supprimé
   */
  async restoreMessage(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si l'utilisateur est un destinataire du message
      const message = await messageModel.getMessageById(id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message non trouvé' });
      }
      
      const isRecipient = message.recipients.some(r => r.recipient_id === userId);
      
      if (!isRecipient) {
        return res.status(403).json({ message: 'Vous n\'êtes pas un destinataire de ce message' });
      }
      
      const updated = await messageModel.restoreDeletedMessage(id, userId);
      
      if (!updated) {
        return res.status(500).json({ message: 'Erreur lors de la restauration du message' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'restore',
        target_type: 'message',
        target_id: id,
        details: `Message "${message.subject}" restauré`
      });
      
      return res.status(200).json({ message: 'Message restauré avec succès' });
    } catch (error) {
      console.error(`Erreur lors de la restauration du message ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la restauration du message' });
    }
  }

  /**
   * Supprimer définitivement un message
   */
  async deleteMessage(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si l'utilisateur est l'expéditeur du message
      const message = await messageModel.getMessageById(id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message non trouvé' });
      }
      
      if (message.sender_id !== userId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer définitivement ce message' });
      }
      
      // Supprimer les fichiers des pièces jointes
      for (const attachment of message.attachments) {
        const filePath = path.join(__dirname, '../../', attachment.file_path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      const deleted = await messageModel.deleteMessage(id);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Erreur lors de la suppression définitive du message' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'permanent_delete',
        target_type: 'message',
        target_id: id,
        details: `Message "${message.subject}" supprimé définitivement`
      });
      
      return res.status(200).json({ message: 'Message supprimé définitivement' });
    } catch (error) {
      console.error(`Erreur lors de la suppression définitive du message ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la suppression définitive du message' });
    }
  }

  /**
   * Télécharger une pièce jointe
   */
  async downloadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { messageId, attachmentId } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si l'utilisateur est autorisé à voir ce message
      const message = await messageModel.getMessageById(messageId);
      
      if (!message) {
        res.status(404).json({ message: 'Message non trouvé' });
        return;
      }
      
      const isRecipient = message.recipients.some(r => r.recipient_id === userId);
      const isSender = message.sender_id === userId;
      
      if (!isRecipient && !isSender) {
        res.status(403).json({ message: 'Vous n\'êtes pas autorisé à télécharger cette pièce jointe' });
        return;
      }
      
      // Trouver la pièce jointe
      const attachment = message.attachments.find(a => a.id === attachmentId);
      
      if (!attachment) {
        res.status(404).json({ message: 'Pièce jointe non trouvée' });
        return;
      }
      
      // Chemin complet du fichier
      const filePath = path.join(__dirname, '../../', attachment.file_path);
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ message: 'Fichier non trouvé sur le serveur' });
        return;
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'download',
        target_type: 'message_attachment',
        target_id: attachmentId,
        details: `Pièce jointe "${attachment.file_name}" téléchargée`
      });
      
      // Envoyer le fichier au client
      res.download(filePath, attachment.file_name, (err) => {
        if (err) {
          console.error('Erreur lors du téléchargement de la pièce jointe:', err);
          res.status(500).json({ message: 'Erreur lors du téléchargement de la pièce jointe' });
        }
      });
    } catch (error) {
      console.error(`Erreur lors du téléchargement de la pièce jointe:`, error);
      res.status(500).json({ message: 'Erreur lors du téléchargement de la pièce jointe' });
    }
  }

  /**
   * Compter les messages non lus
   */
  async countUnreadMessages(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const count = await messageModel.countUnreadMessages(userId);
      return res.status(200).json({ count });
    } catch (error) {
      console.error('Erreur lors du comptage des messages non lus:', error);
      return res.status(500).json({ message: 'Erreur lors du comptage des messages non lus' });
    }
  }

  /**
   * Rechercher des messages
   */
  async searchMessages(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Terme de recherche requis' });
      }
      
      const messages = await messageModel.searchMessages(userId, query);
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Erreur lors de la recherche de messages:', error);
      return res.status(500).json({ message: 'Erreur lors de la recherche de messages' });
    }
  }
}

export default new MessageController();
