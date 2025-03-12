import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { eventContributionService } from '../../services/eventContributionService';
import { contributionService } from '../../services/contributionService';
import { projectContributionService } from '../../services/projectContributionService';
import { formatCurrency } from '../../lib/utils';

const paymentSchema = z.object({
  amount: z.number()
    .min(1, 'Le montant doit être supérieur à 0')
    .max(100000000, 'Le montant ne peut pas dépasser 100,000,000 XAF'),
  payment_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  notes: z.string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .optional(),
});

type FormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  userId: string;
  eventId?: string;
  sessionId?: string;
  projectId?: string;
  expectedAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentForm({
  userId,
  eventId,
  sessionId,
  projectId,
  expectedAmount,
  onClose,
  onSuccess,
}: PaymentFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: expectedAmount,
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      if (eventId) {
        // Handle event contribution payment
        await eventContributionService.recordPayment(
          eventId,
          userId,
          data.amount,
          data.payment_date,
          data.notes
        );
      } else if (sessionId) {
        // Handle monthly contribution payment
        await contributionService.recordPayment({
          user_id: userId,
          session_id: sessionId,
          amount: data.amount,
          payment_date: data.payment_date,
          contribution_type: 'monthly',
          status: 'paid',
          notes: data.notes,
        }, user.id);
      } else if (projectId) {
        // Handle project contribution payment
        await projectContributionService.recordPayment(
          projectId,
          userId,
          data.amount,
          data.payment_date,
          data.notes
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'enregistrement du paiement');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Enregistrer un paiement
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

          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm text-muted-foreground">Montant attendu</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(expectedAmount)}
            </p>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1">
              Montant payé
            </label>
            <input
              id="amount"
              type="number"
              {...register('amount', { valueAsNumber: true })}
              className={`w-full border ${
                errors.amount ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="payment_date" className="block text-sm font-medium text-foreground mb-1">
              Date de paiement
            </label>
            <input
              id="payment_date"
              type="date"
              {...register('payment_date')}
              className={`w-full border ${
                errors.payment_date ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.payment_date && (
              <p className="mt-1 text-sm text-destructive">{errors.payment_date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              {...register('notes')}
              className={`w-full border ${
                errors.notes ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
              rows={3}
              placeholder="Notes optionnelles sur le paiement"
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-destructive">{errors.notes.message}</p>
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
              {isLoading ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}