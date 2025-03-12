import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
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