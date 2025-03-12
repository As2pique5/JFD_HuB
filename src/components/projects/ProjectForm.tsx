import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { projectService } from '../../services/projectService';

const projectSchema = z.object({
  title: z.string()
    .min(2, 'Le titre doit contenir au moins 2 caractères')
    .max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  description: z.string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional(),
  budget: z.number()
    .min(1, 'Le budget doit être supérieur à 0')
    .max(100000000, 'Le budget ne peut pas dépasser 100,000,000 XAF'),
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),
  manager_id: z.string().uuid('Veuillez sélectionner un responsable'),
  status: z.enum(['not_started', 'in_progress', 'completed', 'cancelled'])
    .default('not_started'),
});

type FormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FormValues>;
  isEditing?: boolean;
}

export default function ProjectForm({
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}: ProjectFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      budget: initialData?.budget || 0,
      start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
      end_date: initialData?.end_date || new Date().toISOString().split('T')[0],
      manager_id: initialData?.manager_id || user?.id || '',
      status: initialData?.status || 'not_started',
    },
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .order('name');

        if (error) throw error;
        setMembers(profiles || []);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Impossible de charger la liste des membres');
      }
    };

    fetchMembers();
  }, []);

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      if (isEditing && initialData?.id) {
        await projectService.updateProject(initialData.id, data, user.id);
      } else {
        await projectService.createProject(data, user.id);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving project:', err);
      setError(err.message || 'Une erreur est survenue lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Modifier le projet' : 'Nouveau projet'}
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
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
              Titre
            </label>
            <input
              id="title"
              type="text"
              {...register('title')}
              className={`w-full border ${
                errors.title ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className={`w-full border ${
                errors.description ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-foreground mb-1">
              Budget
            </label>
            <input
              id="budget"
              type="number"
              {...register('budget', { valueAsNumber: true })}
              className={`w-full border ${
                errors.budget ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.budget && (
              <p className="mt-1 text-sm text-destructive">{errors.budget.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-foreground mb-1">
                Date de début
              </label>
              <input
                id="start_date"
                type="date"
                {...register('start_date')}
                className={`w-full border ${
                  errors.start_date ? 'border-destructive' : 'border-input'
                } rounded-md bg-background px-3 py-2 text-sm`}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-destructive">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-foreground mb-1">
                Date de fin
              </label>
              <input
                id="end_date"
                type="date"
                {...register('end_date')}
                className={`w-full border ${
                  errors.end_date ? 'border-destructive' : 'border-input'
                } rounded-md bg-background px-3 py-2 text-sm`}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-destructive">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="manager_id" className="block text-sm font-medium text-foreground mb-1">
              Responsable
            </label>
            <select
              id="manager_id"
              {...register('manager_id')}
              className={`w-full border ${
                errors.manager_id ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="">Sélectionner un responsable</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            {errors.manager_id && (
              <p className="mt-1 text-sm text-destructive">{errors.manager_id.message}</p>
            )}
          </div>

          {isEditing && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-foreground mb-1">
                Statut
              </label>
              <select
                id="status"
                {...register('status')}
                className={`w-full border ${
                  errors.status ? 'border-destructive' : 'border-input'
                } rounded-md bg-background px-3 py-2 text-sm`}
              >
                <option value="not_started">Non démarré</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>
          )}

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
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}