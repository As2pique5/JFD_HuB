import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'intermediate' | 'standard';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isIntermediate: () => boolean;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateAvatar: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to sync user state
  const syncUserState = async (authUser: any) => {
    try {
      console.log('🔄 Starting user state sync...', { authUser });
      
      if (!authUser) {
        console.log('❌ No auth user, clearing state');
        setUser(null);
        localStorage.removeItem('jfdhub_user');
        return null;
      }

      // Get existing profile
      console.log('📥 Fetching profile...');
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('👤 Profile data:', profile);
      console.log('❗ Profile error:', profileError);

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profile) {
        console.log('⚠️ No profile found, creating new profile...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            role: 'standard',
            status: 'active'
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating profile:', createError);
          throw createError;
        }
        
        console.log('✅ New profile created:', newProfile);
        profile = newProfile;
      }

      // Get the role from raw_app_meta_data
      const authRole = authUser.app_metadata?.role || 'standard';
      console.log('🔑 Auth role from app_metadata:', authRole);

      // If profile role doesn't match auth role, update profile
      if (profile.role !== authRole) {
        console.log('⚠️ Role mismatch detected, updating profile...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: authRole })
          .eq('id', profile.id);

        if (updateError) {
          console.error('❌ Error updating profile role:', updateError);
          throw updateError;
        }

        profile.role = authRole;
        console.log('✅ Profile role updated successfully');
      }

      // Construct user data
      const userData: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar: profile.avatar_url,
      };

      console.log('✅ Setting user data:', userData);
      setUser(userData);
      localStorage.setItem('jfdhub_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      console.error('❌ Error syncing user state:', err);
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;
    let sessionCheckInterval: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        setLoading(true);
        setError(null);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        console.log('🔐 Session data:', session);

        if (!mounted) return;

        if (session?.user) {
          await syncUserState(session.user);
        } else {
          console.log('ℹ️ No active session');
          setUser(null);
          localStorage.removeItem('jfdhub_user');
        }
      } catch (err: any) {
        console.error('❌ Auth initialization error:', err);
        if (mounted) {
          setUser(null);
          localStorage.removeItem('jfdhub_user');
          window.location.href = '/login';
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔔 Auth state changed:', event, session);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        console.log('👋 User signed out or deleted');
        setUser(null);
        localStorage.removeItem('jfdhub_user');
        window.location.href = '/login';
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('🔐 User signed in or token refreshed');
        if (session?.user) {
          try {
            await syncUserState(session.user);
          } catch (err) {
            console.error('❌ Error syncing user state:', err);
            setUser(null);
            localStorage.removeItem('jfdhub_user');
            window.location.href = '/login';
          }
        }
      }
    });

    // Start periodic session check
    sessionCheckInterval = setInterval(async () => {
      if (!user) return;

      try {
        console.log('🔄 Performing periodic session check...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.log('❌ Session check failed:', error || 'No session');
          setUser(null);
          localStorage.removeItem('jfdhub_user');
          window.location.href = '/login';
        } else {
          console.log('✅ Session valid, re-syncing user state...');
          await syncUserState(session.user);
        }
      } catch (err) {
        console.error('❌ Session check error:', err);
        setUser(null);
        localStorage.removeItem('jfdhub_user');
        window.location.href = '/login';
      }
    }, 30000); // Check every 30 seconds

    initAuth();

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      console.log('🔑 Attempting login...', { email });
      setLoading(true);
      setError(null);

      // Clear any existing session data
      localStorage.removeItem('jfdhub_user');

      const { data: { user: authUser }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        throw signInError;
      }

      if (!authUser) {
        console.error('❌ No user data returned');
        throw new Error('No user data returned from authentication');
      }

      console.log('✅ Sign in successful, syncing user state...');
      const userData = await syncUserState(authUser);
      
      if (!userData) {
        console.error('❌ Failed to sync user state');
        throw new Error('Failed to sync user state');
      }

      console.log('✅ Login complete:', userData);
      return userData;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out...');
      setLoading(true);
      setError(null);

      // Clear local state first
      setUser(null);
      localStorage.removeItem('jfdhub_user');

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }

      console.log('✅ Logout successful');
      // Force reload to login page
      window.location.href = '/login';
    } catch (err: any) {
      console.error('❌ Logout error:', err);
      // Even if there's an error, force reload to login
      window.location.href = '/login';
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('No user logged in');

    try {
      console.log('📝 Updating profile...', data);
      
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUser(prev => prev ? { ...prev, ...data } : null);
      localStorage.setItem('jfdhub_user', JSON.stringify({ ...user, ...data }));

      console.log('✅ Profile updated successfully');
    } catch (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
  };

  const updateAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('No user logged in');

    try {
      console.log('🖼️ Updating avatar...', { fileName: file.name });
      
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('profile_avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile_avatars')
        .getPublicUrl(filePath);

      console.log('✅ Avatar uploaded successfully:', publicUrl);

      // Update user profile with new avatar URL
      await updateProfile({ avatar: publicUrl });

      return publicUrl;
    } catch (error) {
      console.error('❌ Avatar update error:', error);
      throw error;
    }
  };

  const isAdmin = () => user?.role === 'super_admin';
  const isIntermediate = () => user?.role === 'intermediate' || user?.role === 'super_admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-medium text-foreground">Chargement de JFD'HuB...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Erreur</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      isAdmin, 
      isIntermediate,
      updateProfile,
      updateAvatar
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}