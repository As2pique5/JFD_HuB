import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { eventService } from '../../services/eventService';

const eventContributionSchema = z.object({
  target_amount: z.number()
    .min(1, 'Le montant doit être supérieur à 0')
    .max(100000000, 'Le montant ne peut pas dépasser 100,000,000 XAF'),
  deadline: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  status: z.enum(['active', 'completed', 'cancelled'])
    .default('active'),
});

type FormValues = z.infer<typeof eventContributionSchema>;

interface EventContributionFormProps {
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FormValues>;
  isEditing?: boolean;
}

export default function EventContributionForm({
  eventId,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}: EventContributionFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(eventContributionSchema),
    defaultValues: {
      target_amount: initialData?.target_amount || 0,
      deadline: initialData?.deadline || new Date().toISOString().split('T')[0],
      status: initialData?.status || 'active',
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      if (isEditing && initialData?.id) {
        await eventService.updateEventContribution(
          initialData.id,
          data,
          user.id
        );
      } else {
        await eventService.createEventContribution(
          {
            ...data,
            event_id: eventId,
          },
          user.id
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving event contribution:', err);
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
            {isEditing ? 'Modifier la cotisation' : 'Nouvelle cotisation pour événement'}
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
              Montant cible
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
            <label htmlFor="deadline" className="block text-sm font-medium text-foreground mb-1">
              Date limite
            </label>
            <input
              id="deadline"
              type="date"
              {...register('deadline')}
              className={`w-full border ${
                errors.deadline ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.deadline && (
              <p className="mt-1 text-sm text-destructive">{errors.deadline.message}</p>
            )}
          </div>

          <input type="hidden" {...register('status')} value="active" />

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
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer la cotisation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}