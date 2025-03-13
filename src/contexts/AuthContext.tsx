import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { localAuthService, AuthUser } from '../services/localAuthService';

// Interface utilisateur pour le contexte d'authentification
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

  // Helper function to convert AuthUser to User
  const convertAuthUserToUser = (authUser: AuthUser): User => {
    return {
      id: authUser.id,
      name: authUser.name || authUser.email.split('@')[0],
      email: authUser.email,
      role: authUser.role as 'super_admin' | 'intermediate' | 'standard',
      avatar: authUser.avatar_url || undefined,
    };
  };

  // Fonction pour vérifier et mettre à jour le rôle de l'utilisateur
  const checkAndUpdateUserRole = async (userData: User): Promise<User> => {
    try {
      // Liste des emails administrateurs
      const adminEmails = ['lesaintdj@hotmail.fr'];
      
      // Vérifier si l'utilisateur est un super_admin par son email
      const isAdminByEmail = adminEmails.includes(userData.email);
      
      let validRole: 'super_admin' | 'intermediate' | 'standard' = userData.role;
      
      if (isAdminByEmail && userData.role !== 'super_admin') {
        // Si c'est un administrateur par email, forcer le rôle super_admin
        validRole = 'super_admin';
        console.log('💻 Admin détecté par email:', userData.email);
        
        // Mettre à jour le profil
        await localAuthService.updateProfile({ role: 'super_admin' });
        userData.role = 'super_admin';
      } else if (!isAdminByEmail && userData.role === 'super_admin') {
        // Si ce n'est pas un admin par email mais qu'il a le rôle super_admin, rétrograder
        validRole = 'standard';
        console.log('⚠️ Rétrogradation d\'un utilisateur non admin:', userData.email);
        
        // Mettre à jour le profil
        await localAuthService.updateProfile({ role: 'standard' });
        userData.role = 'standard';
      }
      
      console.log('🔑 Rôle final utilisé:', validRole);
      return { ...userData, role: validRole };
    } catch (err) {
      console.error('❌ Erreur lors de la vérification du rôle:', err);
      return userData;
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
        
        // Récupérer la session actuelle depuis notre service local
        const isAuthenticated = localAuthService.isAuthenticated();
        const currentUser = localAuthService.getCurrentUser();
        
        console.log('🔐 État d\'authentification:', { isAuthenticated, currentUser });

        if (!mounted) return;

        if (isAuthenticated && currentUser) {
          // Session active trouvée
          console.log('✅ Session active trouvée, synchronisation de l\'état utilisateur...');
          
          // Convertir l'utilisateur du service en format User pour le contexte
          const userData = convertAuthUserToUser(currentUser);
          
          // Vérifier et mettre à jour le rôle si nécessaire
          const userWithCorrectRole = await checkAndUpdateUserRole(userData);
          
          // Mettre à jour l'état utilisateur
          setUser(userWithCorrectRole);
          
          // Si nous sommes sur la page de login et qu'une session est active, rediriger vers le dashboard
          if (isLoginPage) {
            console.log('➡️ Redirection vers le tableau de bord depuis la page de connexion avec une session active');
            window.location.href = '/';
            return; // Arrêter l'exécution ici pour éviter de définir loading=false
          }
        } else {
          console.log('ℹ️ Aucune session active');
          setUser(null);
          
          // Si nous ne sommes pas sur la page de login et qu'aucune session n'est active, rediriger vers login
          if (!isLoginPage) {
            console.log('➡️ Redirection vers la page de connexion en raison de l\'absence de session active');
            window.location.href = '/login';
            return; // Arrêter l'exécution ici pour éviter de définir loading=false
          }
        }
      } catch (err: any) {
        console.error('❌ Erreur d\'initialisation de l\'authentification:', err);
        if (mounted) {
          setUser(null);
          
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

    // Configurer l'écouteur de changement d'état d'authentification
    const unsubscribe = localAuthService.onAuthStateChange((authUser) => {
      if (!mounted) return;

      console.log('🔔 État d\'authentification changé:', authUser);

      if (!authUser) {
        console.log('👋 Utilisateur déconnecté');
        setUser(null);
        
        // Ne rediriger que si nous ne sommes pas déjà sur la page de login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        console.log('🔐 Utilisateur connecté ou token rafraîchi');
        try {
          // Convertir l'utilisateur du service en format User pour le contexte
          const userData = convertAuthUserToUser(authUser);
          
          // Vérifier et mettre à jour le rôle si nécessaire
          checkAndUpdateUserRole(userData).then(userWithCorrectRole => {
            setUser(userWithCorrectRole);
            
            // Si nous sommes sur la page de login, rediriger vers le dashboard
            if (window.location.pathname === '/login') {
              window.location.href = '/';
            }
          });
        } catch (err) {
          console.error('❌ Erreur lors de la synchronisation de l\'état utilisateur:', err);
          setUser(null);
          
          // Ne rediriger que si nous ne sommes pas déjà sur la page de login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    });

    // Démarrer la vérification périodique de session
    sessionCheckInterval = setInterval(async () => {
      // Ne pas vérifier si nous sommes sur la page de login ou si aucun utilisateur n'est connecté
      if (!user || window.location.pathname === '/login') return;

      try {
        console.log('🔄 Vérification périodique de session...');
        const isValid = await localAuthService.checkSession();
        
        if (!isValid) {
          console.log('❌ Échec de la vérification de session');
          setUser(null);
          window.location.href = '/login';
        } else {
          // Vérifier simplement que la session est valide, mais ne pas resynchroniser
          // l'état utilisateur à chaque vérification pour éviter les boucles infinies
          console.log('✅ Session valide');
        }
      } catch (err) {
        console.error('❌ Erreur de vérification de session:', err);
        // Ne pas automatiquement déconnecter en cas d'erreur temporaire
        // pour éviter les déconnexions intempestives
      }
    }, 120000); // Vérifier toutes les 2 minutes pour réduire la charge

    initAuth();

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      console.log('🔑 Tentative de connexion...', { email });
      setLoading(true);
      setError(null);

      // Utiliser le service d'authentification local
      const { user: authUser } = await localAuthService.login({ email, password });

      if (!authUser) {
        console.error('❌ Erreur de connexion: Utilisateur non trouvé');
        throw new Error('Utilisateur non trouvé');
      }

      if (!authUser) {
        console.error('❌ No user data returned');
        throw new Error('No user data returned from authentication');
      }

      console.log('✅ Connexion réussie, synchronisation de l\'\u00e9tat utilisateur...');
      
      // Convertir l'utilisateur authentifié en format User
      const convertedUser = convertAuthUserToUser(authUser);
      
      // Vérifier et mettre à jour le rôle si nécessaire
      const userData = await checkAndUpdateUserRole(convertedUser);
      
      if (!userData) {
        console.error('❌ Échec de la synchronisation de l\'\u00e9tat utilisateur');
        throw new Error('Échec de la synchronisation de l\'\u00e9tat utilisateur');
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

      // Déconnexion du service d'authentification local
      try {
        await localAuthService.logout();
      } catch (error) {
        console.error('❌ Erreur de déconnexion:', error);
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
    if (!user) throw new Error('Aucun utilisateur connecté');

    try {
      console.log('📝 Mise à jour du profil...', data);
      
      // Convertir les données au format attendu par le service d'authentification
      const authUserData: Partial<AuthUser> = {
        ...data,
        avatar_url: data.avatar
      };
      
      // Mettre à jour le profil dans le service d'authentification local
      const updatedUser = await localAuthService.updateProfile(authUserData);
      
      if (!updatedUser) throw new Error('Erreur lors de la mise à jour du profil');

      // Convertir l'utilisateur mis à jour au format User
      const convertedUser = convertAuthUserToUser(updatedUser);
      
      // Mettre à jour l'état local
      setUser(prev => prev ? { ...prev, ...convertedUser } : null);

      console.log('✅ Profile updated successfully');
    } catch (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
  };

  // Cette fonction a été remplacée par la gestion des rôles dans checkAndUpdateUserRole

  const updateAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('Aucun utilisateur connecté');

    try {
      console.log('💾️ Mise à jour de l\'avatar...', { fileName: file.name });
      
      // Utiliser le service API pour téléverser le fichier
      const formData = new FormData();
      formData.append('avatar', file);
      
      // Appel à l'API pour téléverser l'avatar
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
        headers: {
          // Ne pas définir Content-Type car FormData le fait automatiquement
          // avec la bonne boundary pour les données multipart
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors du téléversement: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const publicUrl = result.avatarUrl;
      
      console.log('✅ Avatar téléversé avec succès:', publicUrl);
      
      // Mettre à jour le profil utilisateur avec la nouvelle URL d'avatar
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