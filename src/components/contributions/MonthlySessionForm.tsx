import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { monthlySessionSchema } from '../../lib/validation/contributionSchemas';
import type { MonthlyContributionSession } from '../../services/localContributionService';
import { localContributionService } from '../../services/localContributionService';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';

interface MonthlySessionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<MonthlyContributionSession>;
  isEditing?: boolean;
}

type FormValues = MonthlyContributionSession;

export default function MonthlySessionForm({
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}: MonthlySessionFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(monthlySessionSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
      monthly_target_amount: initialData?.monthly_target_amount || 0,
      duration_months: initialData?.duration_months || 12,
      payment_deadline_day: initialData?.payment_deadline_day || 10,
      status: initialData?.status || 'active',
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Ensure status is set
      const sessionData = {
        ...data,
        status: data.status || 'active' as const,
      };

      if (isEditing && initialData?.id) {
        const result = await localContributionService.updateMonthlySession(
          initialData.id,
          sessionData
        );
        if (result.error) throw result.error;
      } else {
        const result = await localContributionService.createMonthlySession(sessionData);
        if (result.error) throw result.error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving monthly session:', err);
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
            {isEditing ? 'Modifier la session' : 'Nouvelle session de cotisation'}
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
              Nom de la session
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={`w-full border ${
                errors.name ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
              placeholder="Ex: Cotisations 2025"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              className={`w-full border ${
                errors.description ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
              rows={3}
              placeholder="Description optionnelle de la session"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
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
              <label htmlFor="monthly_target_amount" className="block text-sm font-medium text-foreground mb-1">
                Montant mensuel cible
              </label>
              <input
                id="monthly_target_amount"
                type="number"
                {...register('monthly_target_amount', { valueAsNumber: true })}
                className={`w-full border ${
                  errors.monthly_target_amount ? 'border-destructive' : 'border-input'
                } rounded-md bg-background px-3 py-2 text-sm`}
                placeholder="0"
              />
              {errors.monthly_target_amount && (
                <p className="mt-1 text-sm text-destructive">{errors.monthly_target_amount.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="duration_months" className="block text-sm font-medium text-foreground mb-1">
                Durée (mois)
              </label>
              <input
                id="duration_months"
                type="number"
                {...register('duration_months', { valueAsNumber: true })}
                className={`w-full border ${
                  errors.duration_months ? 'border-destructive' : 'border-input'
                } rounded-md bg-background px-3 py-2 text-sm`}
                min="1"
                max="60"
              />
              {errors.duration_months && (
                <p className="mt-1 text-sm text-destructive">{errors.duration_months.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="payment_deadline_day" className="block text-sm font-medium text-foreground mb-1">
                Jour limite de paiement
              </label>
              <input
                id="payment_deadline_day"
                type="number"
                {...register('payment_deadline_day', { valueAsNumber: true })}
                className={`w-full border ${
                  errors.payment_deadline_day ? 'border-destructive' : 'border-input'
                } rounded-md bg-background px-3 py-2 text-sm`}
                min="1"
                max="31"
              />
              {errors.payment_deadline_day && (
                <p className="mt-1 text-sm text-destructive">{errors.payment_deadline_day.message}</p>
              )}
            </div>
          </div>

          {/* Hidden status field */}
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
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer la session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}