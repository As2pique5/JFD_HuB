import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { localProjectService } from '../../services/localProjectService';

const phaseSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  status: z.enum(['not_started', 'in_progress', 'completed'])
    .default('not_started'),
  progress: z.number()
    .min(0, 'La progression doit être entre 0 et 100')
    .max(100, 'La progression doit être entre 0 et 100'),
});

type FormValues = z.infer<typeof phaseSchema>;

interface ProjectPhase extends FormValues {
  id?: string;
  project_id?: string;
}

interface ProjectPhaseFormProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<ProjectPhase>;
  isEditing?: boolean;
}

export default function ProjectPhaseForm({
  projectId,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}: ProjectPhaseFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(phaseSchema),
    defaultValues: {
      name: initialData?.name || '',
      status: initialData?.status || 'not_started',
      progress: initialData?.progress || 0,
    },
  });

  const onSubmit = async (formData: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      if (isEditing && initialData?.id) {
        const { error } = await localProjectService.updateProjectPhase(initialData.id, formData);
        if (error) throw error;
      } else {
        const { error } = await localProjectService.createProjectPhase({
          ...formData,
          project_id: projectId,
        });
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving project phase:', err);
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
            {isEditing ? 'Modifier la phase' : 'Nouvelle phase'}
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
              Nom de la phase
            </label>
            <input
              id="name"
              type="text"
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
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="progress" className="block text-sm font-medium text-foreground mb-1">
              Progression (%)
            </label>
            <input
              id="progress"
              type="number"
              min="0"
              max="100"
              {...register('progress', { valueAsNumber: true })}
              className={`w-full border ${
                errors.progress ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.progress && (
              <p className="mt-1 text-sm text-destructive">{errors.progress.message}</p>
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
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer la phase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}