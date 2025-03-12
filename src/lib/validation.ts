import { z } from 'zod';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// Validation des numéros de téléphone camerounais
const validatePhoneNumber = (value: string) => {
  if (!value) return true;
  try {
    if (!isValidPhoneNumber(value, 'CM')) {
      return false;
    }
    const phoneNumber = parsePhoneNumber(value, 'CM');
    return phoneNumber.isValid();
  } catch {
    return false;
  }
};

// Schéma de validation pour les membres
export const memberSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  
  email: z.string()
    .email('Adresse email invalide')
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Format d\'email invalide'),
  
  phone: z.string()
    .min(9, 'Le numéro de téléphone doit contenir au moins 9 chiffres')
    .max(20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères')
    .refine(validatePhoneNumber, 'Numéro de téléphone camerounais invalide')
    .optional()
    .or(z.literal('')),
  
  role: z.enum(['super_admin', 'intermediate', 'standard'], {
    errorMap: () => ({ message: 'Rôle invalide' })
  }),
  
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Statut invalide' })
  }).default('active'),
  
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 
      'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'),
  
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export type MemberFormValues = z.infer<typeof memberSchema>;