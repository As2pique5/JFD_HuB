import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db';

export interface Message {
  id: string;
  sender_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: Date;
  updated_at: Date;
  parent_id?: string;
  has_attachments: boolean;
}

export interface MessageRecipient {
  id: string;
  message_id: string;
  recipient_id: string;
  is_read: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: Date;
  updated_at: Date;
}

export interface MessageThread {
  messages: Message[];
  recipients: MessageRecipient[];
  attachments: MessageAttachment[];
}

export interface MessageSummary {
  id: string;
  sender_id: string;
  sender_name: string;
  subject: string;
  preview: string;
  is_read: boolean;
  created_at: Date;
  recipient_count: number;
  has_attachments: boolean;
}

export interface MessageWithDetails extends Message {
  sender_name: string;
  recipients: {
    id: string;
    recipient_id: string;
    recipient_name: string;
    is_read: boolean;
  }[];
  attachments: MessageAttachment[];
}

class MessageModel {
  private pool: Pool;

  constructor() {
    this.pool = db;
  }

  /**
   * Récupérer tous les messages
   */
  async getAllMessages(): Promise<Message[]> {
    const query = `
      SELECT * FROM messages
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Récupérer un message par son ID
   */
  async getMessageById(id: string): Promise<MessageWithDetails | null> {
    // Récupérer le message
    const messageQuery = `
      SELECT m.*, p.display_name as sender_name
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      WHERE m.id = $1
    `;
    const messageResult = await this.pool.query(messageQuery, [id]);
    
    if (messageResult.rows.length === 0) {
      return null;
    }
    
    const message = messageResult.rows[0] as MessageWithDetails;
    
    // Récupérer les destinataires
    const recipientsQuery = `
      SELECT mr.*, p.display_name as recipient_name
      FROM message_recipients mr
      JOIN profiles p ON mr.recipient_id = p.id
      WHERE mr.message_id = $1
    `;
    const recipientsResult = await this.pool.query(recipientsQuery, [id]);
    
    message.recipients = recipientsResult.rows.map(row => ({
      id: row.id,
      recipient_id: row.recipient_id,
      recipient_name: row.recipient_name,
      is_read: row.is_read
    }));
    
    // Récupérer les pièces jointes
    const attachmentsQuery = `
      SELECT * FROM message_attachments
      WHERE message_id = $1
    `;
    const attachmentsResult = await this.pool.query(attachmentsQuery, [id]);
    
    message.attachments = attachmentsResult.rows;
    
    return message;
  }

  /**
   * Récupérer les messages envoyés par un utilisateur
   */
  async getSentMessages(userId: string): Promise<MessageSummary[]> {
    const query = `
      SELECT 
        m.id, 
        m.sender_id, 
        p.display_name as sender_name,
        m.subject, 
        SUBSTRING(m.content, 1, 100) as preview,
        m.is_read, 
        m.created_at,
        m.has_attachments,
        COUNT(mr.id) as recipient_count
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      LEFT JOIN message_recipients mr ON m.id = mr.message_id
      WHERE m.sender_id = $1
      GROUP BY m.id, p.display_name
      ORDER BY m.created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Récupérer les messages reçus par un utilisateur
   */
  async getReceivedMessages(userId: string): Promise<MessageSummary[]> {
    const query = `
      SELECT 
        m.id, 
        m.sender_id, 
        p.display_name as sender_name,
        m.subject, 
        SUBSTRING(m.content, 1, 100) as preview,
        mr.is_read, 
        m.created_at,
        m.has_attachments,
        COUNT(mr2.id) as recipient_count
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      JOIN message_recipients mr ON m.id = mr.message_id AND mr.recipient_id = $1 AND mr.is_deleted = false
      LEFT JOIN message_recipients mr2 ON m.id = mr2.message_id
      GROUP BY m.id, p.display_name, mr.is_read
      ORDER BY m.created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Récupérer les messages supprimés par un utilisateur
   */
  async getDeletedMessages(userId: string): Promise<MessageSummary[]> {
    const query = `
      SELECT 
        m.id, 
        m.sender_id, 
        p.display_name as sender_name,
        m.subject, 
        SUBSTRING(m.content, 1, 100) as preview,
        mr.is_read, 
        m.created_at,
        m.has_attachments,
        COUNT(mr2.id) as recipient_count
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      JOIN message_recipients mr ON m.id = mr.message_id AND mr.recipient_id = $1 AND mr.is_deleted = true
      LEFT JOIN message_recipients mr2 ON m.id = mr2.message_id
      GROUP BY m.id, p.display_name, mr.is_read
      ORDER BY m.created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Récupérer un fil de discussion
   */
  async getMessageThread(messageId: string): Promise<MessageThread> {
    // Récupérer le message principal
    const mainMessageQuery = `
      SELECT * FROM messages
      WHERE id = $1
    `;
    const mainMessageResult = await this.pool.query(mainMessageQuery, [messageId]);
    
    if (mainMessageResult.rows.length === 0) {
      throw new Error('Message non trouvé');
    }
    
    const mainMessage = mainMessageResult.rows[0] as Message;
    
    // Récupérer tous les messages du fil (parent et enfants)
    let threadMessages: Message[] = [mainMessage];
    
    // Si c'est un message enfant, récupérer le parent
    if (mainMessage.parent_id) {
      const parentQuery = `
        SELECT * FROM messages
        WHERE id = $1
      `;
      const parentResult = await this.pool.query(parentQuery, [mainMessage.parent_id]);
      
      if (parentResult.rows.length > 0) {
        threadMessages.unshift(parentResult.rows[0]);
      }
    }
    
    // Récupérer les messages enfants
    const childrenQuery = `
      SELECT * FROM messages
      WHERE parent_id = $1
      ORDER BY created_at ASC
    `;
    const childrenResult = await this.pool.query(childrenQuery, [messageId]);
    
    threadMessages = [...threadMessages, ...childrenResult.rows];
    
    // Récupérer tous les destinataires pour ces messages
    const messageIds = threadMessages.map(m => m.id);
    const recipientsQuery = `
      SELECT * FROM message_recipients
      WHERE message_id = ANY($1)
    `;
    const recipientsResult = await this.pool.query(recipientsQuery, [messageIds]);
    
    // Récupérer toutes les pièces jointes pour ces messages
    const attachmentsQuery = `
      SELECT * FROM message_attachments
      WHERE message_id = ANY($1)
    `;
    const attachmentsResult = await this.pool.query(attachmentsQuery, [messageIds]);
    
    return {
      messages: threadMessages,
      recipients: recipientsResult.rows,
      attachments: attachmentsResult.rows
    };
  }

  /**
   * Créer un nouveau message
   */
  async createMessage(
    messageData: Omit<Message, 'id' | 'created_at' | 'updated_at'>,
    recipientIds: string[],
    attachments?: Omit<MessageAttachment, 'id' | 'message_id' | 'created_at' | 'updated_at'>[]
  ): Promise<Message> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insérer le message
      const messageId = uuidv4();
      const messageQuery = `
        INSERT INTO messages (
          id, sender_id, subject, content, is_read, parent_id, has_attachments, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;
      
      const hasAttachments = attachments && attachments.length > 0;
      
      const messageResult = await client.query(messageQuery, [
        messageId,
        messageData.sender_id,
        messageData.subject,
        messageData.content,
        messageData.is_read,
        messageData.parent_id || null,
        hasAttachments
      ]);
      
      const message = messageResult.rows[0];
      
      // Insérer les destinataires
      for (const recipientId of recipientIds) {
        const recipientQuery = `
          INSERT INTO message_recipients (
            id, message_id, recipient_id, is_read, is_deleted, created_at, updated_at
          )
          VALUES ($1, $2, $3, false, false, NOW(), NOW())
        `;
        await client.query(recipientQuery, [uuidv4(), messageId, recipientId]);
      }
      
      // Insérer les pièces jointes si présentes
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          const attachmentQuery = `
            INSERT INTO message_attachments (
              id, message_id, file_name, file_path, file_size, file_type, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          `;
          await client.query(attachmentQuery, [
            uuidv4(),
            messageId,
            attachment.file_name,
            attachment.file_path,
            attachment.file_size,
            attachment.file_type
          ]);
        }
      }
      
      await client.query('COMMIT');
      return message;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Marquer un message comme lu
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE message_recipients
      SET is_read = true, updated_at = NOW()
      WHERE message_id = $1 AND recipient_id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [messageId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Marquer un message comme supprimé
   */
  async markMessageAsDeleted(messageId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE message_recipients
      SET is_deleted = true, updated_at = NOW()
      WHERE message_id = $1 AND recipient_id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [messageId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Restaurer un message supprimé
   */
  async restoreDeletedMessage(messageId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE message_recipients
      SET is_deleted = false, updated_at = NOW()
      WHERE message_id = $1 AND recipient_id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [messageId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Supprimer définitivement un message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Supprimer les pièces jointes
      const attachmentsQuery = `
        DELETE FROM message_attachments
        WHERE message_id = $1
      `;
      await client.query(attachmentsQuery, [messageId]);
      
      // Supprimer les destinataires
      const recipientsQuery = `
        DELETE FROM message_recipients
        WHERE message_id = $1
      `;
      await client.query(recipientsQuery, [messageId]);
      
      // Supprimer le message
      const messageQuery = `
        DELETE FROM messages
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(messageQuery, [messageId]);
      
      await client.query('COMMIT');
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Compter les messages non lus pour un utilisateur
   */
  async countUnreadMessages(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM message_recipients
      WHERE recipient_id = $1 AND is_read = false AND is_deleted = false
    `;
    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Rechercher des messages
   */
  async searchMessages(userId: string, searchTerm: string): Promise<MessageSummary[]> {
    const query = `
      SELECT 
        m.id, 
        m.sender_id, 
        p.display_name as sender_name,
        m.subject, 
        SUBSTRING(m.content, 1, 100) as preview,
        mr.is_read, 
        m.created_at,
        m.has_attachments,
        COUNT(mr2.id) as recipient_count
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      JOIN message_recipients mr ON m.id = mr.message_id 
        AND mr.recipient_id = $1 
        AND mr.is_deleted = false
      LEFT JOIN message_recipients mr2 ON m.id = mr2.message_id
      WHERE 
        (m.subject ILIKE $2 OR m.content ILIKE $2)
      GROUP BY m.id, p.display_name, mr.is_read
      ORDER BY m.created_at DESC
    `;
    const result = await this.pool.query(query, [userId, `%${searchTerm}%`]);
    return result.rows;
  }
}

export default new MessageModel();
