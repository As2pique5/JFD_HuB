import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messageService } from '../../services/messageService';
import { MessageSquare, Search, Send, Plus, ChevronDown, ChevronUp, User, Users, Paperclip, MoreVertical, Phone, Video, X } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import MessageComposer from '../../components/messages/MessageComposer';

export default function Messages() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);
        const data = await messageService.getConversations(user.id);
        setConversations(data);
      } catch (err: any) {
        console.error('Error fetching conversations:', err);
        setError(err.message || 'Une erreur est survenue lors du chargement des conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user || !activeConversation) return;

      try {
        setLoading(true);
        setError(null);
        const data = await messageService.getMessages(activeConversation, user.id);
        setMessages(data);
      } catch (err: any) {
        console.error('Error fetching messages:', err);
        setError(err.message || 'Une erreur est survenue lors du chargement des messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [activeConversation, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conversation => {
    return conversation.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get conversation avatar
  const getConversationAvatar = (conversation: any) => {
    if (conversation.avatar) {
      return (
        <img
          src={conversation.avatar}
          alt={conversation.name}
          className="h-10 w-10 rounded-full"
        />
      );
    } else {
      return (
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
          {conversation.type === 'private' ? (
            <User className="h-5 w-5 text-primary-foreground" />
          ) : (
            <Users className="h-5 w-5 text-primary-foreground" />
          )}
        </div>
      );
    }
  };

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for message groups
  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (
    content: string, 
    recipientIds: string[], 
    subject?: string,
    isGroup?: boolean
  ) => {
    if (!user) return;

    try {
      setError(null);
      await messageService.sendMessage(content, recipientIds, user.id, subject, isGroup);
      
      // Refresh conversations
      const updatedConversations = await messageService.getConversations(user.id);
      setConversations(updatedConversations);

      // If in a conversation, refresh messages
      if (activeConversation) {
        const updatedMessages = await messageService.getMessages(activeConversation, user.id);
        setMessages(updatedMessages);
      }

      setShowNewMessage(false);
    } catch (err: any) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  // Get active conversation details
  const activeConversationDetails = activeConversation 
    ? conversations.find(c => c.id === activeConversation)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <MessageSquare className="mr-2 h-6 w-6" />
          Messagerie
        </h1>
        <button 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center"
          onClick={() => setShowNewMessage(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle conversation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversations list */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Rechercher une conversation..."
                className="pl-9 pr-4 py-2 w-full border border-input rounded-md bg-background text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="divide-y divide-border overflow-y-auto h-[calc(100%-3.5rem)]">
            {filteredConversations.map((conversation) => (
              <div 
                key={conversation.id} 
                className={`p-3 cursor-pointer hover:bg-muted/50 ${
                  activeConversation === conversation.id ? 'bg-muted' : ''
                }`}
                onClick={() => setActiveConversation(conversation.id)}
              >
                <div className="flex items-center">
                  {getConversationAvatar(conversation)}
                  <div className="ml-3 flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{conversation.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(conversation.lastMessageTime)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground truncate">{conversation.lastMessage}</p>
                      {conversation.unread > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredConversations.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                Aucune conversation trouvée.
              </div>
            )}
          </div>
        </div>
        
        {/* Chat area */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col">
          {activeConversation ? (
            <>
              {/* Chat header */}
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center">
                  {getConversationAvatar(activeConversationDetails)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-foreground">
                      {activeConversationDetails?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeConversationDetails?.type === 'group' 
                        ? `${activeConversationDetails?.participants?.length} participants` 
                        : 'Conversation privée'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 rounded-full hover:bg-muted">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-muted">
                    <Video className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-muted">
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index, array) => {
                  const isFirstMessageOfDay = index === 0 || 
                    formatMessageDate(message.created_at) !== formatMessageDate(array[index - 1].created_at);
                  
                  const isCurrentUser = message.sender_id === user?.id;
                  
                  return (
                    <div key={message.id}>
                      {isFirstMessageOfDay && (
                        <div className="flex justify-center my-4">
                          <span className="px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">
                            {formatMessageDate(message.created_at)}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                          {!isCurrentUser && (
                            <img
                              src={message.sender?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                              alt={message.sender?.name}
                              className="h-8 w-8 rounded-full mr-2 mt-1"
                            />
                          )}
                          <div>
                            {!isCurrentUser && (
                              <p className="text-xs text-muted-foreground mb-1">{message.sender?.name}</p>
                            )}
                            <div className={`rounded-lg px-3 py-2 ${
                              isCurrentUser 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-foreground'
                            }`}>
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                              {formatMessageTime(message.created_at)}
                              {isCurrentUser && (
                                <span className="ml-1">
                                  {message.message_recipients.every(r => r.read_at) ? '✓✓' : '✓'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message composer */}
              <MessageComposer
                onSend={handleSendMessage}
                defaultRecipients={
                  activeConversationDetails?.type === 'private'
                    ? [{ 
                        id: activeConversationDetails.id, 
                        name: activeConversationDetails.name 
                      }]
                    : activeConversationDetails?.participants?.map((p: any) => ({
                        id: p.id,
                        name: p.name
                      })) || []
                }
                defaultSubject={activeConversationDetails?.type === 'group' ? activeConversationDetails.name : ''}
              />
            </>
          ) : showNewMessage ? (
            <MessageComposer
              onSend={handleSendMessage}
              onClose={() => setShowNewMessage(false)}
              isNewConversation
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">Messagerie JFD'HuB</h3>
                <p className="text-muted-foreground mt-2">
                  Sélectionnez une conversation pour commencer à discuter
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}