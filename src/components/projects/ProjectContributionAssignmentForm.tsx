import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectContributionService } from '../../services/projectContributionService';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

const assignmentSchema = z.object({
  assignments: z.array(z.object({
    user_id: z.string().uuid('Veuillez sélectionner un membre'),
    monthly_amount: z.number().min(1, 'Le montant doit être supérieur à 0'),
  })).min(1, 'Ajoutez au moins un membre'),
});

type FormValues = z.infer<typeof assignmentSchema>;

interface ProjectContributionAssignmentFormProps {
  projectId: string;
  targetAmount: number;
  startDate: string;
  durationMonths: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProjectContributionAssignmentForm({
  projectId,
  targetAmount,
  startDate,
  durationMonths,
  onClose,
  onSuccess,
}: ProjectContributionAssignmentFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [currentTotal, setCurrentTotal] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      assignments: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assignments',
  });

  const assignments = watch('assignments');

  useEffect(() => {
    const total = assignments.reduce((sum, assignment) => {
      const amount = assignment.monthly_amount || 0;
      return sum + (isNaN(amount) ? 0 : amount * durationMonths);
    }, 0);
    setCurrentTotal(total);
  }, [assignments, durationMonths]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .order('name');

        if (error) throw error;

        // Filter out members who are already assigned
        const { data: existingAssignments } = await supabase
          .from('project_contribution_assignments')
          .select('user_id')
          .eq('project_id', projectId);

        const assignedUserIds = new Set(existingAssignments?.map(a => a.user_id) || []);
        const availableMembers = profiles?.filter(p => !assignedUserIds.has(p.id)) || [];

        setMembers(availableMembers);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Impossible de charger la liste des membres');
      }
    };

    fetchMembers();
  }, [projectId]);

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Validate total amount
      const total = data.assignments.reduce((sum, a) => sum + (a.monthly_amount * durationMonths || 0), 0);
      if (total !== targetAmount) {
        throw new Error(`Le total des montants (${formatCurrency(total)}) doit être égal au montant cible (${formatCurrency(targetAmount)})`);
      }

      // Create assignments
      const assignments = data.assignments.map(a => ({
        project_id: projectId,
        user_id: a.user_id,
        monthly_amount: a.monthly_amount,
        target_amount: a.monthly_amount * durationMonths,
      }));

      await projectContributionService.createProjectContributionAssignments(assignments, user.id);

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
          {/* Summary section - fixed at top */}
          <div className="p-4 border-b border-border">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            <div className="bg-muted/50 p-3 rounded-md">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Montant cible total</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(targetAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Montant attribué</p>
                  <p className={`text-lg font-semibold ${
                    currentTotal > targetAmount ? 'text-destructive' :
                    currentTotal < targetAmount ? 'text-amber-500' :
                    'text-green-500'
                  }`}>
                    {formatCurrency(currentTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Reste à attribuer</p>
                  <p className={`text-lg font-semibold ${
                    targetAmount - currentTotal === 0 ? 'text-green-500' : 'text-amber-500'
                  }`}>
                    {formatCurrency(targetAmount - currentTotal)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable assignments section */}
          <div className="flex-1 overflow-y-auto p-4">
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

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Total sur {durationMonths} mois
                    </label>
                    <p className="text-sm font-medium text-foreground py-2">
                      {formatCurrency((assignments[index]?.monthly_amount || 0) * durationMonths)}
                    </p>
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

          {/* Action buttons - fixed at bottom */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex justify-end space-x-2">
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
                disabled={isLoading || currentTotal !== targetAmount}
              >
                {isLoading ? 'Enregistrement...' : 'Valider les attributions'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}