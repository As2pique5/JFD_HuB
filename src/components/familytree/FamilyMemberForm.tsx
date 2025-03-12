import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { familyService } from '../../services/familyService';
import { supabase } from '../../lib/supabase';

const familyMemberSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide')
    .optional()
    .or(z.literal('')),
  bio: z.string()
    .max(500, 'La biographie ne peut pas dépasser 500 caractères')
    .optional()
    .or(z.literal('')),
  user_id: z.string().uuid('ID utilisateur invalide').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof familyMemberSchema>;

interface FamilyMemberFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FormValues>;
  isEditing?: boolean;
}

export default function FamilyMemberForm({
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}: FamilyMemberFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      name: initialData?.name || '',
      birth_date: initialData?.birth_date || '',
      bio: initialData?.bio || '',
      user_id: initialData?.user_id || '',
    },
  });

  // Fetch available users for linking
  useState(() => {
    const fetchUsers = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .order('name');

        if (error) throw error;
        setAvailableUsers(profiles || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  });

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      if (isEditing && initialData?.id) {
        await familyService.updateFamilyMember(initialData.id, data, user.id);
      } else {
        await familyService.createFamilyMember(data, user.id);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving family member:', err);
      setError(err.message || 'Une erreur est survenue lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Modifier un membre' : 'Ajouter un membre'}
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
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Nom complet
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className={`w-full border ${
                errors.name ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="birth_date" className="block text-sm font-medium text-foreground mb-1">
              Date de naissance
            </label>
            <input
              type="date"
              id="birth_date"
              {...register('birth_date')}
              className={`w-full border ${
                errors.birth_date ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.birth_date && (
              <p className="mt-1 text-sm text-destructive">{errors.birth_date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-1">
              Biographie
            </label>
            <textarea
              id="bio"
              {...register('bio')}
              rows={3}
              className={`w-full border ${
                errors.bio ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="user_id" className="block text-sm font-medium text-foreground mb-1">
              Lier à un utilisateur (optionnel)
            </label>
            <select
              id="user_id"
              {...register('user_id')}
              className={`w-full border ${
                errors.user_id ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="">Sélectionner un utilisateur</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            {errors.user_id && (
              <p className="mt-1 text-sm text-destructive">{errors.user_id.message}</p>
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
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}