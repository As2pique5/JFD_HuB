import { z } from 'zod';

// Schéma pour la création d'une session de cotisation mensuelle
export const monthlySessionSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  
  description: z.string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional(),
  
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  
  monthly_target_amount: z.number()
    .min(1, 'Le montant mensuel doit être supérieur à 0')
    .max(100000000, 'Le montant mensuel ne peut pas dépasser 100,000,000 XAF'),
  
  duration_months: z.number()
    .min(1, 'La durée doit être d\'au moins 1 mois')
    .max(60, 'La durée ne peut pas dépasser 60 mois'),
  
  payment_deadline_day: z.number()
    .min(1, 'Le jour limite doit être entre 1 et 31')
    .max(31, 'Le jour limite doit être entre 1 et 31'),
  
  status: z.enum(['active', 'completed', 'cancelled'])
    .default('active'),
});

// Schéma pour l'attribution des montants aux membres
export const monthlyAssignmentSchema = z.object({
  user_id: z.string().uuid('ID utilisateur invalide'),
  monthly_amount: z.number()
    .min(1, 'Le montant mensuel doit être supérieur à 0')
    .max(100000000, 'Le montant mensuel ne peut pas dépasser 100,000,000 XAF'),
});

// Schéma pour l'enregistrement d'un paiement
export const contributionPaymentSchema = z.object({
  amount: z.number()
    .min(1, 'Le montant doit être supérieur à 0')
    .max(100000000, 'Le montant ne peut pas dépasser 100,000,000 XAF'),
  
  payment_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  
  payment_period_start: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .optional(),
  
  payment_period_end: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .optional(),
  
  notes: z.string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .optional(),
});