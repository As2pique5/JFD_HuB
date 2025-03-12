import { useState } from 'react';
import { Edit2, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { familyService } from '../../services/familyService';

interface RelationshipActionsProps {
  relationshipId: string;
  fromMemberId: string;
  toMemberId: string;
  type: 'parent' | 'child' | 'spouse' | 'sibling';
  onDelete: () => void;
  onEdit: () => void;
}

export default function RelationshipActions({
  relationshipId,
  fromMemberId,
  toMemberId,
  type,
  onDelete,
  onEdit
}: RelationshipActionsProps) {
  const { isAdmin } = useAuth();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await familyService.deleteFamilyRelationship(relationshipId);
      onDelete();
    } catch (err: any) {
      console.error('Error deleting relationship:', err);
      setError(err.message || 'Une erreur est survenue lors de la suppression');
      setIsDeleting(false);
    }
  };

  if (!isAdmin()) return null;

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onEdit}
        className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
        title="Modifier la relation"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => setShowConfirmDelete(true)}
        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        title="Supprimer la relation"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive mr-2" />
              <h3 className="text-lg font-semibold text-foreground">Confirmer la suppression</h3>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
                {error}
              </div>
            )}

            <p className="text-sm text-muted-foreground mb-4">
              Êtes-vous sûr de vouloir supprimer cette relation ? Cette action est irréversible.
            </p>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 border border-border rounded-md text-foreground bg-background hover:bg-muted"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-70 flex items-center"
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
        </div>
      )}
    </div>
  );
}