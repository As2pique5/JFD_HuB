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
  const syncUserState = async (authUser: any, forceSync: boolean = false) => {
    try {
      console.log('🔄 Starting user state sync...', { authUser, forceSync });
      
      if (!authUser) {
        console.log('❌ No auth user, clearing state');
        setUser(null);
        localStorage.removeItem('jfdhub_user');
        return null;
      }

      // Vérifier la dernière synchronisation pour éviter les syncs trop fréquentes
      const lastSyncTime = localStorage.getItem('jfdhub_last_sync');
      const currentTime = Date.now();
      const syncThreshold = 5000; // 5 secondes minimum entre les syncs
      
      // Check if we already have user data in state and localStorage
      // and if we're not forcing a sync, return early
      const localUserData = localStorage.getItem('jfdhub_user');
      if (!forceSync && user && localUserData && lastSyncTime) {
        const timeSinceLastSync = currentTime - parseInt(lastSyncTime, 10);
        const parsedLocalUser = JSON.parse(localUserData);
        
        // Vérifier si l'ID utilisateur correspond et si la dernière sync est récente
        if (parsedLocalUser.id === authUser.id && timeSinceLastSync < syncThreshold) {
          console.log('🔄 Using cached user data, last sync was', timeSinceLastSync, 'ms ago');
          return parsedLocalUser;
        }
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

      // IGNORER COMPLÈTEMENT le rôle dans app_metadata car nous ne pouvons pas le modifier côté client
      // Déterminer le rôle valide en fonction de l'email et du profil existant
      let validRole: 'super_admin' | 'intermediate' | 'standard';
      
      // Liste des emails administrateurs
      const adminEmails = ['lesaintdj@hotmail.fr'];
      
      // Vérifier si l'utilisateur est un super_admin par son email
      const isAdminByEmail = adminEmails.includes(authUser.email);
      
      if (isAdminByEmail) {
        // Si c'est un administrateur par email, forcer le rôle super_admin
        validRole = 'super_admin';
        console.log('💻 Admin détecté par email:', authUser.email);
        
        // Mettre à jour le profil si nécessaire
        if (profile.role !== 'super_admin') {
          console.log('⚠️ Forcer la mise à jour du rôle admin dans le profil');
          await updateUserMetadata(authUser.id, 'super_admin');
          profile.role = 'super_admin'; // Mettre à jour immédiatement l'objet profile
        }
      } else if (profile.role === 'super_admin' || profile.role === 'intermediate') {
        // Conserver le rôle du profil s'il est déjà élevé
        validRole = profile.role;
      } else {
        // Par défaut, tous les autres utilisateurs sont standard
        validRole = 'standard';
        
        // Mettre à jour le profil si nécessaire
        if (profile.role !== 'standard') {
          await updateUserMetadata(authUser.id, 'standard');
          profile.role = 'standard'; // Mettre à jour immédiatement l'objet profile
        }
      }
      
      console.log('🔑 Rôle final utilisé:', validRole);

      // La mise à jour du profil a déjà été effectuée si nécessaire
      // Assurons-nous que le rôle dans l'objet profile est correct
      if (profile.role !== validRole) {
        profile.role = validRole;
        console.log('✅ Rôle du profil mis à jour en mémoire');
      }

      // Construct user data
      const userData: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as 'super_admin' | 'intermediate' | 'standard',
        avatar: profile.avatar_url || undefined,
      };

      console.log('✅ Setting user data:', userData);
      setUser(userData);
      
      // Stocker les données utilisateur et le timestamp de la dernière synchronisation
      localStorage.setItem('jfdhub_user', JSON.stringify(userData));
      localStorage.setItem('jfdhub_last_sync', Date.now().toString());
      
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

        // Vérifier si nous sommes sur la page de login
        const isLoginPage = window.location.pathname === '/login';
        
        // Récupérer la session actuelle
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        console.log('🔐 Session data:', session);

        if (!mounted) return;

        if (session?.user) {
          // Session active trouvée
          console.log('✅ Active session found, syncing user state...');
          await syncUserState(session.user);
          
          // Si nous sommes sur la page de login et qu'une session est active, rediriger vers le dashboard
          if (isLoginPage) {
            console.log('➡️ Redirecting to dashboard from login page with active session');
            window.location.href = '/';
            return; // Arrêter l'exécution ici pour éviter de définir loading=false
          }
        } else {
          console.log('ℹ️ No active session');
          setUser(null);
          localStorage.removeItem('jfdhub_user');
          
          // Si nous ne sommes pas sur la page de login et qu'aucune session n'est active, rediriger vers login
          if (!isLoginPage) {
            console.log('➡️ Redirecting to login page due to no active session');
            window.location.href = '/login';
            return; // Arrêter l'exécution ici pour éviter de définir loading=false
          }
        }
      } catch (err: any) {
        console.error('❌ Auth initialization error:', err);
        if (mounted) {
          setUser(null);
          localStorage.removeItem('jfdhub_user');
          
          // Ne rediriger vers login que si nous ne sommes pas déjà sur cette page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
            return; // Arrêter l'exécution ici pour éviter de définir loading=false
          }
        }
      } finally {
        // Ne définir loading=false que si nous n'avons pas redirigé
        if (mounted && window.location.href === document.location.href) {
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔔 Auth state changed:', event, session);

      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUser(null);
        localStorage.removeItem('jfdhub_user');
        
        // Ne rediriger que si nous ne sommes pas déjà sur la page de login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('🔐 User signed in or token refreshed');
        if (session?.user) {
          try {
            // Forcer la synchronisation lors de la connexion ou du rafraîchissement du token
            await syncUserState(session.user, true);
            
            // Si nous sommes sur la page de login, rediriger vers le dashboard
            if (window.location.pathname === '/login') {
              window.location.href = '/';
            }
          } catch (err) {
            console.error('❌ Error syncing user state:', err);
            setUser(null);
            localStorage.removeItem('jfdhub_user');
            
            // Ne rediriger que si nous ne sommes pas déjà sur la page de login
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
        }
      }
    });

    // Start periodic session check - réduit la fréquence pour éviter les problèmes
    sessionCheckInterval = setInterval(async () => {
      // Ne pas vérifier si nous sommes sur la page de login ou si aucun utilisateur n'est connecté
      if (!user || window.location.pathname === '/login') return;

      try {
        console.log('🔄 Performing periodic session check...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.log('❌ Session check failed:', error || 'No session');
          setUser(null);
          localStorage.removeItem('jfdhub_user');
          window.location.href = '/login';
        } else {
          // Vérifier simplement que la session est valide, mais ne pas resynchroniser
          // l'état utilisateur à chaque vérification pour éviter les boucles infinies
          console.log('✅ Session valid');
        }
      } catch (err) {
        console.error('❌ Session check error:', err);
        // Ne pas automatiquement déconnecter en cas d'erreur temporaire
        // pour éviter les déconnexions intempestives
      }
    }, 120000); // Check every 2 minutes pour réduire la charge

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
      const userData = await syncUserState(authUser, true);
      
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

  // Fonction pour effacer complètement la session stockée dans localStorage
  const clearStoredSession = () => {
    try {
      console.log('🗑️ Nettoyage complet des données de session...');
      
      // Effacer les données spécifiques à l'application
      localStorage.removeItem('jfdhub_user');
      localStorage.removeItem('jfdhub_last_sync');
      
      // Effacer toutes les données de Supabase (tokens, etc.)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          console.log('🗑️ Suppression de la clé Supabase:', key);
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Données de session effacées avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des données de session:', error);
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Déconnexion en cours...');
      setLoading(true);
      setError(null);

      // Effacer l'état local d'abord
      setUser(null);
      
      // Effacer complètement la session stockée
      clearStoredSession();

      // Déconnexion de Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Erreur de déconnexion Supabase:', error);
        throw error;
      }

      console.log('✅ Déconnexion réussie');
      
      // Redirection vers la page de connexion avec le paramètre force_logout
      // pour garantir que la session ne sera pas restaurée
      const timestamp = new Date().getTime();
      window.location.href = `/login?force_logout=true&nocache=${timestamp}`;
    } catch (err: any) {
      console.error('❌ Erreur lors de la déconnexion:', err);
      // Même en cas d'erreur, rediriger vers la page de connexion avec force_logout
      clearStoredSession(); // Essayer de nettoyer quand même
      const timestamp = new Date().getTime();
      window.location.href = `/login?force_logout=true&nocache=${timestamp}`;
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

  // Fonction pour mettre à jour les métadonnées de l'utilisateur dans Supabase
  // Note: Cette fonction ne peut pas mettre à jour directement les métadonnées côté client
  // Nous allons plutôt mettre à jour la table profiles et stocker le rôle là-bas
  const updateUserMetadata = async (userId: string, role: 'super_admin' | 'intermediate' | 'standard') => {
    try {
      console.log('📝 Mise à jour du rôle utilisateur dans la table profiles...', { userId, role });
      
      // Mettre à jour le rôle dans la table profiles
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Erreur lors de la mise à jour du rôle:', error);
        // Ne pas bloquer le processus si la mise à jour échoue
      } else {
        console.log('✅ Rôle utilisateur mis à jour avec succès dans profiles');
        
        // Enregistrer dans le localStorage pour s'assurer que le rôle est cohérent
        const cachedUser = localStorage.getItem('jfdhub_user');
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);
          userData.role = role;
          localStorage.setItem('jfdhub_user', JSON.stringify(userData));
          console.log('✅ Rôle mis à jour dans le cache local');
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du rôle:', error);
      // Ne pas bloquer le processus si la mise à jour échoue
    }
  };

  const updateAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('No user logged in');

    try {
      console.log('💾️ Updating avatar...', { fileName: file.name });
      
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const urlResult = supabase.storage
        .from('profile_avatars')
        .getPublicUrl(filePath);
      
      // Extraire l'URL publique du résultat
      const publicUrl = urlResult.data.publicUrl;

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