import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { logAuditEvent } from '../../lib/audit';
import { useAuth } from '../../contexts/AuthContext';

const passwordResetSchema = z.object({
  newPassword: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 
      'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

interface MemberPasswordResetProps {
  memberId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MemberPasswordReset({ 
  memberId, 
  onSuccess, 
  onCancel 
}: MemberPasswordResetProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
  });

  const onSubmit = async (data: PasswordResetFormValues) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Reset password in Supabase Auth
      const { error: resetError } = await supabase.auth.admin.updateUserById(
        memberId,
        { password: data.newPassword }
      );

      if (resetError) throw resetError;

      // Log the password reset action
      await logAuditEvent(
        'password_reset',
        user.id,
        memberId,
        { timestamp: new Date().toISOString() }
      );

      onSuccess();
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-1">
          Nouveau mot de passe
        </label>
        <input
          id="newPassword"
          type="password"
          {...register('newPassword')}
          className={`w-full border ${
            errors.newPassword ? 'border-destructive' : 'border-input'
          } rounded-md bg-background px-3 py-2 text-sm`}
        />
        {errors.newPassword && (
          <p className="mt-1 text-sm text-destructive">{errors.newPassword.message}</p>
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

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
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
          {isLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
        </button>
      </div>
    </form>
  );
}