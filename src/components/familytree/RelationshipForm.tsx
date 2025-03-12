import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { familyService } from '../../services/familyService';

const relationshipSchema = z.object({
  from_member_id: z.string().uuid('Veuillez sélectionner un membre'),
  to_member_id: z.string().uuid('Veuillez sélectionner un membre'),
  relationship_type: z.enum(['parent', 'child', 'spouse', 'sibling'], {
    required_error: 'Veuillez sélectionner un type de relation',
  }),
});

type FormValues = z.infer<typeof relationshipSchema>;

interface RelationshipFormProps {
  members: any[];
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FormValues>;
  isEditing?: boolean;
}

export default function RelationshipForm({
  members,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}: RelationshipFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<any[]>([]);

  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        const data = await familyService.getFamilyRelationships();
        setRelationships(data || []);
      } catch (err) {
        console.error('Error fetching relationships:', err);
      }
    };

    if (isEditing) {
      fetchRelationships();
    }
  }, [isEditing]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      from_member_id: initialData?.from_member_id || '',
      to_member_id: initialData?.to_member_id || '',
      relationship_type: initialData?.relationship_type || 'parent',
    },
  });

  const fromMemberId = watch('from_member_id');
  const relationType = watch('relationship_type');

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Invert the relationship direction for parent/child relationships
      // If A "est enfant de" B, then B is the parent and A is the child
      let relationshipData = { ...data };
      if (data.relationship_type === 'parent') {
        // If A "est parent de" B, then A is the parent and B is the child
        relationshipData.relationship_type = 'parent';
      } else if (data.relationship_type === 'child') {
        // If A "est enfant de" B, then B is the parent and A is the child
        // Swap the members and set type to parent
        relationshipData = {
          from_member_id: data.to_member_id,
          to_member_id: data.from_member_id,
          relationship_type: 'parent'
        };
      }

      if (isEditing && initialData?.from_member_id && initialData?.to_member_id) {
        // Find the existing relationship
        const existingRelationship = relationships.find(r => 
          r.from_member_id === initialData.from_member_id &&
          r.to_member_id === initialData.to_member_id &&
          r.relationship_type === initialData.relationship_type
        );

        if (existingRelationship) {
          // Delete old relationship
          await familyService.deleteFamilyRelationship(existingRelationship.id);
        }
      }

      // Create new relationship
      await familyService.createFamilyRelationship(relationshipData, user.id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving relationship:', err);
      setError(err.message || 'Une erreur est survenue lors de la sauvegarde');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Modifier une relation' : 'Ajouter une relation'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="from_member_id" className="block text-sm font-medium text-foreground mb-1">
              Premier membre
            </label>
            <select
              id="from_member_id"
              {...register('from_member_id')}
              className={`w-full border ${
                errors.from_member_id ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="">Sélectionner un membre</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            {errors.from_member_id && (
              <p className="mt-1 text-sm text-destructive">{errors.from_member_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="relationship_type" className="block text-sm font-medium text-foreground mb-1">
              Type de relation
            </label>
            <select
              id="relationship_type"
              {...register('relationship_type')}
              className={`w-full border ${
                errors.relationship_type ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="">Sélectionner un type</option>
              <option value="parent">Est parent de</option>
              <option value="child">Est enfant de</option>
              <option value="spouse">Est conjoint(e) de</option>
              <option value="sibling">Est frère/sœur de</option>
            </select>
            {errors.relationship_type && (
              <p className="mt-1 text-sm text-destructive">{errors.relationship_type.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="to_member_id" className="block text-sm font-medium text-foreground mb-1">
              Second membre
            </label>
            <select
              id="to_member_id"
              {...register('to_member_id')}
              className={`w-full border ${
                errors.to_member_id ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="">Sélectionner un membre</option>
              {members
                .filter(member => member.id !== fromMemberId)
                .map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))
              }
            </select>
            {errors.to_member_id && (
              <p className="mt-1 text-sm text-destructive">{errors.to_member_id.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-md text-foreground bg-background hover:bg-muted"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Ajouter la relation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}