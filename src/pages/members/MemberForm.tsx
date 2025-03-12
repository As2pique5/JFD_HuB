import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const memberSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().min(9, 'Numéro de téléphone invalide').optional().or(z.literal('')),
  role: z.enum(['super_admin', 'intermediate', 'standard']),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<MemberFormValues> & { id?: string };
  isEditing?: boolean;
}

export default function MemberForm({ onClose, onSuccess, initialData, isEditing = false }: MemberFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      role: initialData?.role || 'standard',
      password: '',
      confirmPassword: '',
    },
  });
  
  const onSubmit = async (data: MemberFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (isEditing && initialData?.id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            role: data.role,
            updated_at: new Date().toISOString()
          })
          .eq('id', initialData.id);
        
        if (updateError) throw updateError;
        
        onSuccess();
        onClose();
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
              role: data.role,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!authData.user) {
          throw new Error('Erreur lors de la création de l\'utilisateur');
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            phone: data.phone || null,
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Erreur lors de la mise à jour du profil:', updateError);
        }
        
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde du membre:', err);
      setError(err.message || 'Une erreur est survenue lors de la sauvegarde du membre');
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    reset({
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      role: initialData?.role || 'standard',
      password: '',
      confirmPassword: '',
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Modifier un membre' : 'Ajouter un nouveau membre'}
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
              Nom complet
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
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={`w-full border ${
                errors.email ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
              Téléphone
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className={`w-full border ${
                errors.phone ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
              placeholder="+237 612345678"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
              Rôle
            </label>
            <select
              id="role"
              {...register('role')}
              className={`w-full border ${
                errors.role ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            >
              <option value="standard">Membre Standard</option>
              <option value="intermediate">Membre Intermédiaire</option>
              <option value="super_admin">Super Administrateur</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              {isEditing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className={`w-full border ${
                errors.password ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              className={`w-full border ${
                errors.confirmPassword ? 'border-destructive' : 'border-input'
              } rounded-md bg-background px-3 py-2 text-sm`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-border rounded-md text-foreground bg-background hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-70"
            >
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}