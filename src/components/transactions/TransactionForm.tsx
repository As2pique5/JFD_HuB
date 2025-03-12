import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { financialService } from '../../services/financialService';
import { supabase } from '../../lib/supabase';

const transactionSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),
  amount: z.number()
    .min(1, 'Le montant doit être supérieur à 0')
    .max(100000000, 'Le montant ne peut pas dépasser 100,000,000 XAF'),
  category: z.string()
    .min(1, 'Veuillez sélectionner une catégorie'),
  description: z.string()
    .min(2, 'La description doit contenir au moins 2 caractères')
    .max(200, 'La description ne peut pas dépasser 200 caractères'),
  recipient_type: z.enum(['member', 'other']),
  recipient_id: z.string().optional(),
  recipient_name: z.string()
    .max(100, 'Le bénéficiaire ne peut pas dépasser 100 caractères')
    .optional(),
});

type FormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  type: 'income' | 'expense';
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = {
  income: [
    { value: 'donation', label: 'Don' },
    { value: 'reimbursement', label: 'Remboursement' },
    { value: 'other_income', label: 'Autre revenu' },
  ],
  expense: [
    { value: 'loan', label: 'Prêt' },
    { value: 'event_expense', label: 'Dépense événement' },
    { value: 'project_expense', label: 'Dépense projet' },
    { value: 'prefinancing', label: 'Préfinancement' },
    { value: 'donation_expense', label: 'Don' },
    { value: 'other_expense', label: 'Autre dépense' },
  ],
};

export default function TransactionForm({ type, onClose, onSuccess }: TransactionFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: '',
      description: '',
      recipient_type: 'member',
      recipient_id: '',
      recipient_name: '',
    },
  });

  const recipientType = watch('recipient_type');

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

      // Determine the recipient based on the selection
      let recipient = '';
      if (type === 'expense') {
        if (data.recipient_type === 'member' && data.recipient_id) {
          const selectedMember = members.find(m => m.id === data.recipient_id);
          recipient = selectedMember?.name || '';
        } else {
          recipient = data.recipient_name || '';
        }
      }

      await financialService.createTransaction({
        date: data.date,
        amount: data.amount,
        type,
        category: data.category,
        description: data.description,
        recipient,
      }, user.id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      setError(err.message || 'Une erreur est survenue lors de la création de la transaction');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {type === 'income' ? 'Nouvelle entrée' : 'Nouvelle dépense'}
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
            <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1">
              Date
            </label>
            <input
              id="date"
              type="date"
              {...register('date')}
              className={`w-full border ${
                errors.date ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1">
              Montant
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
            <label htmlFor="category" className="block text-sm font-medium text-foreground mb-1">
              Catégorie
            </label>
            <select
              id="category"
              {...register('category')}
              className={`w-full border ${
                errors.category ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="">Sélectionner une catégorie</option>
              {CATEGORIES[type].map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-destructive">{errors.category.message}</p>
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

          {type === 'expense' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Type de bénéficiaire
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="member"
                      {...register('recipient_type')}
                      className="mr-2"
                    />
                    Membre JFD
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="other"
                      {...register('recipient_type')}
                      className="mr-2"
                    />
                    Autre
                  </label>
                </div>
              </div>

              {recipientType === 'member' ? (
                <div>
                  <label htmlFor="recipient_id" className="block text-sm font-medium text-foreground mb-1">
                    Sélectionner un membre
                  </label>
                  <select
                    id="recipient_id"
                    {...register('recipient_id')}
                    className={`w-full border ${
                      errors.recipient_id ? 'border-destructive' : 'border-input'
                    } rounded-md bg-background px-3 py-2 text-sm`}
                  >
                    <option value="">Sélectionner un membre</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  {errors.recipient_id && (
                    <p className="mt-1 text-sm text-destructive">{errors.recipient_id.message}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label htmlFor="recipient_name" className="block text-sm font-medium text-foreground mb-1">
                    Nom du bénéficiaire
                  </label>
                  <input
                    id="recipient_name"
                    type="text"
                    {...register('recipient_name')}
                    className={`w-full border ${
                      errors.recipient_name ? 'border-destructive' : 'border-input'
                    } rounded-md bg-background px-3 py-2 text-sm`}
                  />
                  {errors.recipient_name && (
                    <p className="mt-1 text-sm text-destructive">{errors.recipient_name.message}</p>
                  )}
                </div>
              )}
            </>
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
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}