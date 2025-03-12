import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectService } from '../../services/projectService';
import { supabase } from '../../lib/supabase';

const participantSchema = z.object({
  user_id: z.string().uuid('Veuillez sélectionner un membre'),
});

type FormValues = z.infer<typeof participantSchema>;

interface ProjectParticipantFormProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
  existingParticipants: string[];
}

export default function ProjectParticipantForm({
  projectId,
  onClose,
  onSuccess,
  existingParticipants,
}: ProjectParticipantFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(participantSchema),
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .order('name');

        if (error) throw error;

        // Filter out existing participants
        const availableMembers = profiles?.filter(
          profile => !existingParticipants.includes(profile.id)
        ) || [];

        setMembers(availableMembers);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Impossible de charger la liste des membres');
      }
    };

    fetchMembers();
  }, [existingParticipants]);

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      await projectService.addProjectParticipant(projectId, data.user_id, user.id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adding project participant:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'ajout du participant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Ajouter un participant
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
            <label htmlFor="user_id" className="block text-sm font-medium text-foreground mb-1">
              Membre
            </label>
            <select
              id="user_id"
              {...register('user_id')}
              className={`w-full border ${
                errors.user_id ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="">Sélectionner un membre</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
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
              {isLoading ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}