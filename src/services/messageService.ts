import { supabase } from '../lib/supabase';
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

class MessageService {
  async getConversations(userId: string) {
    try {
      console.log('Fetching conversations for user:', userId);
      
      // Get all messages where user is either sender or recipient
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles (
            id,
            name,
            avatar_url
          ),
          message_recipients (
            id,
            recipient_id,
            read_at,
            recipient:profiles!message_recipients_recipient_id_fkey (
              id,
              name,
              avatar_url
            )
          )
        `)
        .or(`sender_id.eq.${userId},message_recipients.recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages into conversations
      const conversations = messages?.reduce((acc: any[], message) => {
        const isGroupMessage = message.is_group_message;
        const isSender = message.sender_id === userId;
        
        let conversation = {
          id: isGroupMessage ? `group_${message.id}` : isSender 
            ? message.message_recipients[0]?.recipient_id 
            : message.sender_id,
          name: isGroupMessage ? message.subject : isSender 
            ? message.message_recipients[0]?.recipient?.name 
            : message.sender?.name,
          avatar: isGroupMessage ? null : isSender 
            ? message.message_recipients[0]?.recipient?.avatar_url 
            : message.sender?.avatar_url,
          type: isGroupMessage ? 'group' : 'private',
          lastMessage: message.content,
          lastMessageTime: message.created_at,
          unread: !isSender && !message.message_recipients.find(r => 
            r.recipient_id === userId && r.read_at
          ) ? 1 : 0,
          participants: isGroupMessage 
            ? message.message_recipients.map(r => r.recipient)
            : [message.sender, message.message_recipients[0]?.recipient].filter(Boolean),
        };

        // Check if conversation already exists
        const existingIndex = acc.findIndex(c => c.id === conversation.id);
        if (existingIndex >= 0) {
          // Update unread count and last message if newer
          if (!isSender && !message.message_recipients.find(r => 
            r.recipient_id === userId && r.read_at
          )) {
            acc[existingIndex].unread++;
          }
          if (new Date(message.created_at) > new Date(acc[existingIndex].lastMessageTime)) {
            acc[existingIndex].lastMessage = message.content;
            acc[existingIndex].lastMessageTime = message.created_at;
          }
        } else {
          acc.push(conversation);
        }

        return acc;
      }, []);

      // Sort conversations by last message time
      conversations?.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      console.log('Fetched conversations:', conversations);
      return conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  async getMessages(conversationId: string, userId: string) {
    try {
      console.log('Fetching messages for conversation:', conversationId);
      
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles (
            id,
            name,
            avatar_url
          ),
          message_recipients (
            id,
            recipient_id,
            read_at,
            recipient:profiles!message_recipients_recipient_id_fkey (
              id,
              name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: true });

      if (conversationId.startsWith('group_')) {
        // Group conversation
        query = query.eq('id', conversationId.replace('group_', ''));
      } else {
        // Private conversation - messages between these two users
        query = query
          .not('is_group_message', 'is', true)
          .or(`and(sender_id.eq.${userId},message_recipients.recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},message_recipients.recipient_id.eq.${userId})`);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      // Mark messages as read
      const unreadMessages = messages?.filter(message => 
        message.sender_id !== userId && 
        !message.message_recipients.find(r => 
          r.recipient_id === userId && r.read_at
        )
      );

      if (unreadMessages?.length) {
        const recipientIds = unreadMessages.map(message => 
          message.message_recipients.find(r => r.recipient_id === userId)?.id
        ).filter(Boolean);

        if (recipientIds.length) {
          const { error: updateError } = await supabase
            .from('message_recipients')
            .update({ read_at: new Date().toISOString() })
            .in('id', recipientIds);

          if (updateError) {
            console.error('Error marking messages as read:', updateError);
          }
        }
      }

      console.log('Fetched messages:', messages);
      return messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async sendMessage(
    content: string, 
    recipientIds: string[], 
    senderId: string,
    subject?: string,
    isGroupMessage: boolean = false
  ) {
    try {
      console.log('Sending message:', { content, recipientIds, senderId, subject, isGroupMessage });
      
      // Create the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          subject,
          content,
          is_group_message: isGroupMessage,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Create message recipients
      const recipients = recipientIds.map(recipientId => ({
        message_id: message.id,
        recipient_id: recipientId,
      }));

      const { error: recipientsError } = await supabase
        .from('message_recipients')
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      await logAuditEvent('message_send', senderId, message.id, {
        recipient_count: recipientIds.length,
        is_group: isGroupMessage,
      });

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string, userId: string) {
    try {
      console.log('Deleting message:', messageId);
      
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;

      await logAuditEvent('message_delete', userId, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

export const messageService = new MessageService();