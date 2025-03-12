import { apiService } from '../lib/api';
import { logAuditEvent } from '../lib/audit';

export interface Message {
  id: string;
  sender_id: string;
  subject?: string;
  content: string;
  is_group_message: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageRecipient {
  id: string;
  message_id: string;
  recipient_id: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

class MessageService {
  async getConversations(userId: string) {
    try {
      console.log('Récupération des conversations pour l\'utilisateur:', userId);
      
      const conversations = await apiService.request('GET', `/messages/conversations`);
      console.log('Conversations récupérées:', conversations);
      return conversations || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      throw error;
    }
  }

  async getMessages(conversationId: string) {
    try {
      console.log('Récupération des messages pour la conversation:', conversationId);
      
      let url = '/messages';
      
      if (conversationId.startsWith('group_')) {
        // Conversation de groupe
        url = `/messages/group/${conversationId.replace('group_', '')}`;
      } else {
        // Conversation privée
        url = `/messages/private/${conversationId}`;
      }
      
      const messages = await apiService.request('GET', url);
      console.log('Messages récupérés:', messages);
      return messages || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      throw error;
    }
  }

  async sendMessage(
    content: string, 
    recipientIds: string[], 
    subject?: string,
    isGroupMessage: boolean = false
  ) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Envoi d\'un message:', { content, recipientIds, subject, isGroupMessage });
      
      const newMessage = await apiService.request('POST', '/messages', {
        content,
        recipient_ids: recipientIds,
        subject,
        is_group_message: isGroupMessage
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'message_send',
        userId,
        newMessage.id,
        {
          recipient_count: recipientIds.length,
          is_group_message: isGroupMessage
        }
      );
      
      return newMessage;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  }

  async markAsRead(messageId: string) {
    try {
      console.log(`Marquage du message avec l'ID ${messageId} comme lu`);
      
      const result = await apiService.request('PUT', `/messages/${messageId}/read`);
      console.log('Message marqué comme lu:', result);
      return result;
    } catch (error) {
      console.error(`Erreur lors du marquage du message avec l'ID ${messageId} comme lu:`, error);
      throw error;
    }
  }

  async deleteMessage(messageId: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Suppression du message avec l'ID: ${messageId}`);
      await apiService.request('DELETE', `/messages/${messageId}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'message_delete',
        userId,
        messageId,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression du message avec l'ID ${messageId}:`, error);
      throw error;
    }
  }

  async uploadAttachment(messageId: string, file: File) {
    try {
      console.log(`Upload d'une pièce jointe pour le message avec l'ID ${messageId}`);
      
      // Créer un FormData pour l'upload du fichier
      const formData = new FormData();
      formData.append('file', file);
      
      // Appeler l'API pour l'upload de la pièce jointe
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/messages/${messageId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jfdhub_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload de la pièce jointe');
      }
      
      const data = await response.json();
      
      // Journaliser l'événement d'audit
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      await logAuditEvent(
        'message_attachment_upload',
        userId,
        messageId,
        { 
          file_name: file.name,
          file_size: file.size
        }
      );
      
      return data;
    } catch (error) {
      console.error(`Erreur lors de l'upload de la pièce jointe pour le message avec l'ID ${messageId}:`, error);
      throw error;
    }
  }

  async downloadAttachment(attachmentId: string) {
    try {
      console.log(`Téléchargement de la pièce jointe avec l'ID: ${attachmentId}`);
      
      // Créer l'URL de téléchargement
      const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/messages/attachments/${attachmentId}/download`;
      
      // Ouvrir l'URL dans un nouvel onglet pour le téléchargement
      window.open(downloadUrl, '_blank');
      
      // Journaliser l'événement d'audit
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      await logAuditEvent(
        'message_attachment_download',
        userId,
        attachmentId,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors du téléchargement de la pièce jointe avec l'ID ${attachmentId}:`, error);
      throw error;
    }
  }

  async searchMessages(query: string) {
    try {
      console.log('Recherche de messages avec la requête:', query);
      
      const messages = await apiService.request('GET', `/messages/search?query=${encodeURIComponent(query)}`);
      console.log('Messages trouvés:', messages);
      return messages || [];
    } catch (error) {
      console.error('Erreur lors de la recherche de messages:', error);
      throw error;
    }
  }
}

export const localMessageService = new MessageService();
