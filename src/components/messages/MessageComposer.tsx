import { useState, useRef, useEffect } from 'react';
import { Send, X, Users, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface MessageComposerProps {
  onSend: (content: string, recipientIds: string[], subject?: string, isGroup?: boolean) => Promise<void>;
  onClose?: () => void;
  isNewConversation?: boolean;
  defaultRecipients?: Array<{ id: string; name: string }>;
  defaultSubject?: string;
}

export default function MessageComposer({
  onSend,
  onClose,
  isNewConversation = false,
  defaultRecipients = [],
  defaultSubject = '',
}: MessageComposerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [isGroup, setIsGroup] = useState(defaultRecipients.length > 1);
  const [recipients, setRecipients] = useState(defaultRecipients);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .neq('id', user?.id)
          .order('name');

        if (error) throw error;

        // Filter out already selected recipients
        const selectedIds = new Set(recipients.map(r => r.id));
        setAvailableMembers(profiles?.filter(p => !selectedIds.has(p.id)) || []);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Impossible de charger la liste des membres');
      }
    };

    if (showMemberSelector) {
      fetchMembers();
    }
  }, [showMemberSelector, recipients, user?.id]);

  const handleSend = async () => {
    if (!content.trim() || recipients.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);
      await onSend(content.trim(), recipients.map(r => r.id), subject, isGroup);
      setContent('');
      setSubject('');
      setRecipients([]);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'envoi du message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addRecipient = (member: any) => {
    setRecipients(prev => {
      const newRecipients = [...prev, { id: member.id, name: member.name }];
      if (newRecipients.length > 1) setIsGroup(true);
      return newRecipients;
    });
    setShowMemberSelector(false);
  };

  const removeRecipient = (id: string) => {
    setRecipients(prev => {
      const newRecipients = prev.filter(r => r.id !== id);
      if (newRecipients.length <= 1) setIsGroup(false);
      return newRecipients;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {isNewConversation && (
        <div className="p-3 border-b border-border space-y-3">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Destinataires
            </label>
            <div className="flex flex-wrap gap-2">
              {recipients.map(recipient => (
                <div 
                  key={recipient.id}
                  className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md"
                >
                  <span className="text-sm text-foreground">{recipient.name}</span>
                  <button
                    onClick={() => removeRecipient(recipient.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setShowMemberSelector(true)}
                className="flex items-center gap-1 text-primary hover:text-primary/90 px-2 py-1 rounded-md"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Ajouter</span>
              </button>
            </div>
          </div>

          {/* Subject (for group messages) */}
          {isGroup && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Sujet
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Sujet de la conversation"
                className="w-full border border-input rounded-md bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Message input */}
      <div className="flex-1 p-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
          className="w-full h-full resize-none border-0 bg-transparent focus:outline-none focus:ring-0"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 pb-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Send button */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleSend}
          disabled={!content.trim() || recipients.length === 0 || isLoading}
          className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center justify-center disabled:opacity-50"
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </>
          )}
        </button>
      </div>

      {/* Member selector modal */}
      {showMemberSelector && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-muted-foreground mr-2" />
                <h2 className="font-semibold text-foreground">Sélectionner des membres</h2>
              </div>
              <button
                onClick={() => setShowMemberSelector(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {availableMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => addRecipient(member)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md"
                >
                  <img
                    src={member.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                    alt={member.name}
                    className="h-8 w-8 rounded-full"
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}