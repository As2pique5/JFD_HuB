import { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { User, Mail, Phone, Calendar, MapPin, Shield, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import MemberForm from './MemberForm';
import { supabase } from '../../lib/supabase';

interface MemberDetailProps {
  member: any;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MemberDetail({ member, onClose, onEdit, onDelete }: MemberDetailProps) {
  const { isAdmin } = useAuth();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrateur';
      case 'intermediate':
        return 'Membre Intermédiaire';
      case 'standard':
        return 'Membre Standard';
      default:
        return role;
    }
  };
  
  const handleEdit = () => {
    setShowEditForm(true);
  };
  
  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };
  
  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      
      // Supprimer le membre de Supabase
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', member.id);
      
      if (deleteError) {
        console.error('Erreur lors de la suppression du membre:', deleteError);
        throw deleteError;
      }
      
      onDelete();
      onClose();
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.message || 'Une erreur est survenue lors de la suppression du membre');
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Détails du membre</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center mb-6">
            <img
              src={member.avatar || member.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
              alt={member.name}
              className="h-16 w-16 rounded-full mr-4"
            />
            <div>
              <h3 className="text-xl font-semibold text-foreground">{member.name}</h3>
              <div className="flex items-center mt-1">
                <Shield className="h-4 w-4 text-muted-foreground mr-1" />
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  member.role === 'super_admin' 
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' 
                    : member.role === 'intermediate'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {getRoleName(member.role)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-muted-foreground mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{member.email}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-muted-foreground mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Téléphone</p>
                <p className="text-sm font-medium text-foreground">{member.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-muted-foreground mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Date d'ajout</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(new Date(member.joinDate || member.created_at || '2023-01-01'))}
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <User className="h-5 w-5 text-muted-foreground mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="text-sm font-medium text-foreground">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {member.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          {isAdmin() && (
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-border">
              <button
                onClick={handleEdit}
                className="flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Edit className="h-4 w-4 mr-1" />
                Modifier
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </button>
            </div>
          )}
        </div>
        
        {/* Confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="p-4 border-t border-border">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
            <div className="bg-destructive/10 p-3 rounded-md mb-3">
              <p className="text-sm text-destructive font-medium">Êtes-vous sûr de vouloir supprimer ce membre ?</p>
              <p className="text-xs text-destructive mt-1">Cette action est irréversible.</p>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 border border-border rounded-md text-foreground hover:bg-muted"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 flex items-center"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Suppression...
                  </>
                ) : (
                  'Confirmer la suppression'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Formulaire d'édition */}
      {showEditForm && (
        <MemberForm
          onClose={() => setShowEditForm(false)}
          onSuccess={onEdit}
          initialData={member}
          isEditing={true}
        />
      )}
    </div>
  );
}