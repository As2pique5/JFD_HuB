import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectContributionService } from '../../services/projectContributionService';

const contributionSchema = z.object({
  target_amount: z.number()
    .min(1, 'Le montant doit être supérieur à 0')
    .max(100000000, 'Le montant ne peut pas dépasser 100,000,000 XAF'),
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),
  duration_months: z.number()
    .min(1, 'La durée doit être d\'au moins 1 mois')
    .max(60, 'La durée ne peut pas dépasser 60 mois'),
});

type FormValues = z.infer<typeof contributionSchema>;

interface ProjectContributionFormProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProjectContributionForm({
  projectId,
  onClose,
  onSuccess,
}: ProjectContributionFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      target_amount: 0,
      start_date: new Date().toISOString().split('T')[0],
      duration_months: 12,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      await projectContributionService.createProjectContribution(
        {
          ...data,
          project_id: projectId,
        },
        user.id
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating project contribution:', err);
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
            Configuration de la cotisation
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
            <label htmlFor="target_amount" className="block text-sm font-medium text-foreground mb-1">
              Montant cible total
            </label>
            <input
              id="target_amount"
              type="number"
              {...register('target_amount', { valueAsNumber: true })}
              className={`w-full border ${
                errors.target_amount ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.target_amount && (
              <p className="mt-1 text-sm text-destructive">{errors.target_amount.message}</p>
            )}
          </div>

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
            <label htmlFor="duration_months" className="block text-sm font-medium text-foreground mb-1">
              Durée (en mois)
            </label>
            <input
              id="duration_months"
              type="number"
              min="1"
              max="60"
              {...register('duration_months', { valueAsNumber: true })}
              className={`w-full border ${
                errors.duration_months ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.duration_months && (
              <p className="mt-1 text-sm text-destructive">{errors.duration_months.message}</p>
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
              {isLoading ? 'Enregistrement...' : 'Configurer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}