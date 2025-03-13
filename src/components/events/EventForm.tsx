import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { localEventService } from '../../services/localEventService';
import { localMemberService } from '../../services/localMemberService';

const eventSchema = z.object({
  title: z.string()
    .min(2, 'Le titre doit contenir au moins 2 caractères')
    .max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  description: z.string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional(),
  type: z.enum(['meeting', 'celebration', 'assistance', 'other']),
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Format de date invalide'),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Format de date invalide'),
  location: z.string()
    .max(200, 'L\'adresse ne peut pas dépasser 200 caractères')
    .optional(),
  organizer_id: z.string().uuid('Veuillez sélectionner un organisateur'),
  requires_contribution: z.boolean().default(false),
  status: z.enum(['upcoming', 'ongoing', 'past', 'cancelled'])
    .default('upcoming'),
});

type FormValues = z.infer<typeof eventSchema> & { id?: string };

interface EventFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FormValues> & { id?: string };
  isEditing?: boolean;
}

export default function EventForm({
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}: EventFormProps) {
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
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      type: initialData?.type || 'meeting',
      start_date: initialData?.start_date || new Date().toISOString().slice(0, 16),
      end_date: initialData?.end_date || new Date().toISOString().slice(0, 16),
      location: initialData?.location || '',
      organizer_id: initialData?.organizer_id || user?.id || '',
      requires_contribution: initialData?.requires_contribution || false,
      status: initialData?.status || 'upcoming',
    },
  });

  const eventType = watch('type');

  // Fetch members for organizer selection
  React.useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await localMemberService.getMembers();
        if (error) throw error;
        setMembers(data || []);
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

      const eventData = {
        ...data,
        contribution_status: data.requires_contribution ? 'pending' : null,
      };

      if (isEditing && initialData?.id) {
        const { error } = await localEventService.updateEvent(initialData.id, {
          ...eventData,
          // La propriété updated_at sera gérée par le backend
        });
        if (error) throw error;
      } else {
        const { error } = await localEventService.createEvent({
          ...eventData,
        });
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving event:', err);
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
            {isEditing ? 'Modifier l\'événement' : 'Nouvel événement'}
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
            <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">
              Type d'événement
            </label>
            <select
              id="type"
              {...register('type')}
              className={`w-full border ${
                errors.type ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="meeting">Réunion</option>
              <option value="celebration">Célébration</option>
              <option value="assistance">Assistance</option>
              <option value="other">Autre</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          {eventType !== 'meeting' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requires_contribution"
                {...register('requires_contribution')}
                className="h-4 w-4 rounded border-input"
              />
              <label 
                htmlFor="requires_contribution" 
                className="text-sm text-foreground"
              >
                Cet événement nécessite une cotisation
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-foreground mb-1">
                Date et heure de début
              </label>
              <input
                id="start_date"
                type="datetime-local"
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
                Date et heure de fin
              </label>
              <input
                id="end_date"
                type="datetime-local"
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
            <label htmlFor="location" className="block text-sm font-medium text-foreground mb-1">
              Lieu
            </label>
            <input
              id="location"
              type="text"
              {...register('location')}
              className={`w-full border ${
                errors.location ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.location && (
              <p className="mt-1 text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="organizer_id" className="block text-sm font-medium text-foreground mb-1">
              Organisateur
            </label>
            <select
              id="organizer_id"
              {...register('organizer_id')}
              className={`w-full border ${
                errors.organizer_id ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="">Sélectionner un organisateur</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            {errors.organizer_id && (
              <p className="mt-1 text-sm text-destructive">{errors.organizer_id.message}</p>
            )}
          </div>

          <input type="hidden" {...register('status')} value="upcoming" />

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
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer l\'événement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}