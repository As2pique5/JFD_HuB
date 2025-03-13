import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { MonthlyContributionAssignment } from '../../services/localContributionService';
import { localContributionService } from '../../services/localContributionService';
import { localMemberService } from '../../services/localMemberService';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/utils';
import { X } from 'lucide-react';

interface MonthlyAssignmentFormProps {
  sessionId: string;
  monthlyTarget: number;
  onClose: () => void;
  onSuccess: () => void;
}

// Form validation schema
const assignmentsSchema = z.object({
  assignments: z.array(z.object({
    user_id: z.string().uuid('Veuillez sélectionner un membre'),
    monthly_amount: z.number().min(1, 'Le montant doit être supérieur à 0'),
  })).min(1, 'Ajoutez au moins un membre'),
});

type FormValues = z.infer<typeof assignmentsSchema>;

export default function MonthlyAssignmentForm({
  sessionId,
  monthlyTarget,
  onClose,
  onSuccess,
}: MonthlyAssignmentFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Définir l'interface pour le profil d'un membre
  interface MemberProfile {
    id: string;
    name: string;
    email?: string;
  }
  
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [currentTotal, setCurrentTotal] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(assignmentsSchema),
    defaultValues: {
      assignments: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assignments',
  });

  // Watch all assignment amounts to calculate total
  const assignments = watch('assignments');

  useEffect(() => {
    const total = assignments.reduce((sum, assignment) => {
      const amount = assignment.monthly_amount || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    setCurrentTotal(total);
  }, [assignments]);

  // Fetch available members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // Récupérer tous les membres
        const { data: profiles, error: membersError } = await localMemberService.getMembers();
        
        if (membersError) {
          throw membersError;
        }

        // Récupérer les assignations existantes pour cette session
        const existingAssignments = await localContributionService.getMonthlyAssignments(sessionId);

        // Filtrer les membres déjà assignés
        const assignedUserIds = new Set(existingAssignments?.map((a: MonthlyContributionAssignment) => a.user_id) || []);
        const availableMembers = profiles && Array.isArray(profiles) 
          ? profiles.filter((p: MemberProfile) => !assignedUserIds.has(p.id)) 
          : [];

        setMembers(availableMembers);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Impossible de charger la liste des membres');
      }
    };

    fetchMembers();
  }, [sessionId]);

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Validate total amount
      const total = data.assignments.reduce((sum, a) => sum + (a.monthly_amount || 0), 0);
      if (total !== monthlyTarget) {
        throw new Error(`Le total des montants (${formatCurrency(total)}) doit être égal au montant cible mensuel (${formatCurrency(monthlyTarget)})`);
      }

      // Validate that all user_ids are valid UUIDs
      const invalidAssignments = data.assignments.filter(a => !a.user_id || a.user_id.trim() === '');
      if (invalidAssignments.length > 0) {
        throw new Error('Veuillez sélectionner un membre pour chaque attribution');
      }

      // Create assignments
      const assignments: MonthlyContributionAssignment[] = data.assignments.map(a => ({
        session_id: sessionId,
        user_id: a.user_id,
        monthly_amount: a.monthly_amount,
      }));

      // Log the assignments being created
      console.log('Creating assignments:', assignments);

      const result = await localContributionService.createMonthlyAssignments(assignments);
      
      // Log the result
      console.log('Assignments created:', result);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating assignments:', err);
      setError(err.message || 'Une erreur est survenue lors de la sauvegarde');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Attribution des montants
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="p-4 overflow-y-auto flex-1">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            <div className="bg-muted/50 p-3 rounded-md mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">Montant cible mensuel</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(monthlyTarget)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Montant attribué</p>
                  <p className={`text-lg font-semibold ${
                    currentTotal > monthlyTarget ? 'text-destructive' :
                    currentTotal < monthlyTarget ? 'text-amber-500' :
                    'text-green-500'
                  }`}>
                    {formatCurrency(currentTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Reste à attribuer</p>
                  <p className={`text-lg font-semibold ${
                    monthlyTarget - currentTotal === 0 ? 'text-green-500' : 'text-amber-500'
                  }`}>
                    {formatCurrency(monthlyTarget - currentTotal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-md">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Membre
                    </label>
                    <select
                      {...register(`assignments.${index}.user_id`)}
                      className={`w-full border ${
                        errors.assignments?.[index]?.user_id ? 'border-destructive' : 'border-input'
                      } rounded-md bg-background px-3 py-2 text-sm`}
                    >
                      <option value="">Sélectionner un membre</option>
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    {errors.assignments?.[index]?.user_id && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.assignments[index]?.user_id?.message}
                      </p>
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Montant mensuel
                    </label>
                    <input
                      type="number"
                      {...register(`assignments.${index}.monthly_amount`, { valueAsNumber: true })}
                      className={`w-full border ${
                        errors.assignments?.[index]?.monthly_amount ? 'border-destructive' : 'border-input'
                      } rounded-md bg-background px-3 py-2 text-sm`}
                      placeholder="0"
                    />
                    {errors.assignments?.[index]?.monthly_amount && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.assignments[index]?.monthly_amount?.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-6 p-2 text-destructive hover:bg-destructive/10 rounded-md"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => append({ user_id: '', monthly_amount: 0 })}
                className="w-full px-4 py-2 border border-dashed border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                disabled={members.length === fields.length}
              >
                Ajouter un membre
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 p-4 border-t border-border bg-card">
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
              disabled={isLoading || currentTotal !== monthlyTarget}
            >
              {isLoading ? 'Enregistrement...' : 'Valider les attributions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}