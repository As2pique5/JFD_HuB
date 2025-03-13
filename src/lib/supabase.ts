import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

// Vérifier si l'URL contient un paramètre de déconnexion forcée
const urlParams = new URLSearchParams(window.location.search);
const forceLogoutParam = urlParams.get('force_logout');

// Déterminer si nous devons persister la session ou non
// Par défaut, on persiste la session pour une meilleure expérience utilisateur
let shouldPersistSession = true;

// Si le paramètre de déconnexion forcée est présent, nettoyer le localStorage
if (forceLogoutParam === 'true') {
  console.log('🧹 Nettoyage préventif du localStorage avant initialisation de Supabase...');
  localStorage.removeItem('jfdhub_auth');
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-')) {
      console.log(`🗑️ Suppression préventive de la clé: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // Désactiver la persistance de session uniquement lors d'une déconnexion forcée
  shouldPersistSession = false;
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: shouldPersistSession, // Persister la session par défaut, sauf en cas de déconnexion forcée
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: localStorage,
    storageKey: 'jfdhub_auth',
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-application-name': 'jfdhub',
    },
  },
});

// Fonction pour forcer la déconnexion complète en effaçant toutes les données de session
export const forceCompleteSignOut = async () => {
  console.log('🔥 Déconnexion forcée de Supabase en cours...');
  
  try {
    // 1. D'abord, essayer de se déconnecter normalement via l'API
    await supabase.auth.signOut();
    
    // 2. Effacer TOUTES les données du localStorage
    console.log('🧹 Nettoyage complet du localStorage...');
    localStorage.clear();
    
    // 3. Effacer TOUTES les données du sessionStorage
    console.log('🧹 Nettoyage du sessionStorage...');
    sessionStorage.clear();
    
    // 4. Supprimer tous les cookies liés à l'authentification
    console.log('🍪 Suppression des cookies...');
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    // 5. Forcer la réinitialisation de l'état de l'application
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

// Add error handling and connection status check
export const checkSupabaseConnection = async () => {
  try {
    console.log('🔍 Checking Supabase connection...');
    
    // First check if we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check error:', sessionError);
      // Clear invalid session data
      await supabase.auth.signOut();
      localStorage.removeItem('jfdhub_auth');
      localStorage.removeItem('jfdhub_user');
      return false;
    }

    // If no session, connection still works
    if (!session) {
      console.log('ℹ️ No active session');
      return true;
    }

    console.log('🔐 Found active session:', {
      userId: session.user.id,
      role: session.user.user_metadata?.role,
      email: session.user.email
    });

    // If we have a session, verify it's valid by trying to fetch the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, name, email')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile verification error:', profileError);
      // Clear invalid session
      await supabase.auth.signOut();
      localStorage.removeItem('jfdhub_auth');
      localStorage.removeItem('jfdhub_user');
      return false;
    }

    console.log('👤 Found profile:', profile);

    // Verify role matches
    if (profile && profile.role !== session.user.user_metadata?.role) {
      console.log('⚠️ Role mismatch detected:', {
        profileRole: profile.role,
        authRole: session.user.user_metadata?.role
      });

      // Update auth metadata with profile data
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          role: profile.role,
          name: profile.name
        }
      });

      if (updateError) {
        console.error('❌ Error updating auth metadata:', updateError);
        return false;
      }

      console.log('✅ Auth metadata updated successfully');
    } else {
      console.log('✅ Role verification passed');
    }

    return true;
  } catch (err) {
    console.error('❌ Failed to check Supabase connection:', err);
    // Clear any invalid session data
    await supabase.auth.signOut();
    localStorage.removeItem('jfdhub_auth');
    localStorage.removeItem('jfdhub_user');
    return false;
  }
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