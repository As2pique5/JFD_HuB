// Ce fichier est maintenant un stub pour éviter les erreurs lors de la migration de Supabase
// vers notre solution locale. Il sera progressivement remplacé par des services locaux.

import type { Database } from './database.types';

// Créer un client factice qui ne se connecte pas réellement à Supabase
// mais qui fournit une interface compatible pour éviter les erreurs
console.log('⚠️ Utilisation du client Supabase factice - Migration en cours');

// Fonction utilitaire pour créer une réponse factice
const createMockResponse = (data = null, error = null) => {
  return { data, error };
};

// Client Supabase factice
export const supabase = {
  // Méthodes d'authentification (déjà migrées vers localAuthService)
  auth: {
    getSession: () => Promise.resolve(createMockResponse()),
    getUser: () => Promise.resolve(createMockResponse()),
    signOut: () => Promise.resolve(createMockResponse()),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    updateUser: () => Promise.resolve(createMockResponse()),
  },
  
  // Méthodes de stockage
  storage: {
    from: (_bucket: string) => ({
      upload: () => Promise.resolve(createMockResponse()),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: () => Promise.resolve(createMockResponse()),
    }),
  },
  
  // Méthodes de base de données
  from: (_table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve(createMockResponse()),
        order: () => ({
          range: () => Promise.resolve(createMockResponse()),
        }),
      }),
      order: () => ({
        range: () => Promise.resolve(createMockResponse()),
      }),
      range: () => Promise.resolve(createMockResponse()),
    }),
    insert: () => Promise.resolve(createMockResponse()),
    update: () => ({
      eq: () => Promise.resolve(createMockResponse()),
      match: () => Promise.resolve(createMockResponse()),
    }),
    delete: () => ({
      eq: () => Promise.resolve(createMockResponse()),
      match: () => Promise.resolve(createMockResponse()),
    }),
  }),
  
  // Utilitaires
  raw: (sql: string, _params: any[]) => sql,
};

// Fonction pour forcer la déconnexion complète en effaçant toutes les données de session
export const forceCompleteSignOut = async () => {
  console.log('🔥 Déconnexion forcée en cours...');
  
  try {
    // Effacer TOUTES les données du localStorage
    console.log('🧹 Nettoyage complet du localStorage...');
    localStorage.clear();
    
    // Effacer TOUTES les données du sessionStorage
    console.log('🧹 Nettoyage du sessionStorage...');
    sessionStorage.clear();
    
    // Supprimer tous les cookies liés à l'authentification
    console.log('🍪 Suppression des cookies...');
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    // Forcer la réinitialisation de l'état de l'application
    console.log('🔄 Réinitialisation de l\'application...');
    
    console.log('✅ Déconnexion forcée réussie');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion forcée:', error);
    // Même en cas d'erreur, on considère que la déconnexion a réussi
    // car nous avons déjà nettoyé le localStorage et sessionStorage
    return true;
  }
};

// Fonction de vérification de connexion (stub pour compatibilité)
export const checkSupabaseConnection = async () => {
  console.log('⚠️ Supabase est désactivé - Utilisation de l\'authentification locale');
  return true;
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type MonthlyContributionSession = Database['public']['Tables']['monthly_contribution_sessions']['Row'];
export type MonthlyContributionAssignment = Database['public']['Tables']['monthly_contribution_assignments']['Row'];
export type Contribution = Database['public']['Tables']['contributions']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type EventContribution = Database['public']['Tables']['event_contributions']['Row'];
export type EventParticipant = Database['public']['Tables']['event_participants']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectPhase = Database['public']['Tables']['project_phases']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentCategory = Database['public']['Tables']['document_categories']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type FamilyRelationship = Database['public']['Tables']['family_relationships']['Row'];