import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../lib/api';

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
  const [_error, setError] = useState<string | null>(null);

  // Initialiser l'état de l'utilisateur à partir du localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🚀 Initialisation de l\'authentification...');
        setLoading(true);
        setError(null);

        // Vérifier si un token existe
        const token = localStorage.getItem('jfdhub_token');
        if (!token) {
          console.log('ℹ️ Aucune session active');
          setUser(null);
          setLoading(false);
          return;
        }

        // Récupérer le profil de l'utilisateur
        try {
          const userData = await apiService.getProfile();
          console.log('✅ Données utilisateur récupérées:', userData);
          setUser(userData);
        } catch (err) {
          console.error('❌ Erreur lors de la récupération du profil:', err);
          // Si le token est invalide, supprimer les données de session
          localStorage.removeItem('jfdhub_token');
          localStorage.removeItem('jfdhub_user');
          setUser(null);
        }
      } catch (err: any) {
        console.error('❌ Erreur d\'initialisation de l\'authentification:', err);
        setError(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Fonction de connexion
  const login = async (email: string, password: string): Promise<User> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔑 Tentative de connexion...');
      
      // Appeler l'API de connexion
      const response = await apiService.login(email, password);
      
      console.log('✅ Connexion réussie:', response);
      
      // Stocker le token
      localStorage.setItem('jfdhub_token', response.token);
      
      // Stocker les données utilisateur
      const userData: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
        avatar: response.user.avatar_url,
      };
      
      setUser(userData);
      localStorage.setItem('jfdhub_user', JSON.stringify(userData));
      
      return userData;
    } catch (err: any) {
      console.error('❌ Erreur de connexion:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      
      console.log('🚪 Déconnexion...');
      
      // Appeler l'API de déconnexion
      await apiService.logout();
      
      // Supprimer les données de session
      localStorage.removeItem('jfdhub_token');
      localStorage.removeItem('jfdhub_user');
      
      setUser(null);
      console.log('✅ Déconnexion réussie');
    } catch (err: any) {
      console.error('❌ Erreur de déconnexion:', err);
      // Même en cas d'erreur, supprimer les données locales
      localStorage.removeItem('jfdhub_token');
      localStorage.removeItem('jfdhub_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Vérifier si l'utilisateur est administrateur
  const isAdmin = (): boolean => {
    return user?.role === 'super_admin';
  };

  // Vérifier si l'utilisateur est intermédiaire
  const isIntermediate = (): boolean => {
    return user?.role === 'intermediate' || user?.role === 'super_admin';
  };

  // Mettre à jour le profil
  const updateProfile = async (data: Partial<User>): Promise<void> => {
    try {
      setLoading(true);
      
      console.log('📝 Mise à jour du profil...');
      
      // Appeler l'API de mise à jour du profil
      const updatedUser = await apiService.updateProfile(data);
      
      // Mettre à jour les données utilisateur
      const userData: User = {
        ...(user as User),
        ...updatedUser,
      };
      
      setUser(userData);
      localStorage.setItem('jfdhub_user', JSON.stringify(userData));
      
      console.log('✅ Profil mis à jour avec succès');
    } catch (err: any) {
      console.error('❌ Erreur de mise à jour du profil:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour l'avatar
  const updateAvatar = async (file: File): Promise<string> => {
    try {
      setLoading(true);
      
      console.log('🖼️ Mise à jour de l\'avatar...');
      
      // Créer un FormData pour l'upload du fichier
      const formData = new FormData();
      formData.append('avatar', file);
      
      // Appeler l'API de mise à jour de l'avatar
      const response = await fetch(`${(import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api'}/users/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jfdhub_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'avatar');
      }
      
      const data = await response.json();
      
      // Mettre à jour les données utilisateur
      if (user) {
        const updatedUser = {
          ...user,
          avatar: data.avatar_url,
        };
        
        setUser(updatedUser);
        localStorage.setItem('jfdhub_user', JSON.stringify(updatedUser));
      }
      
      console.log('✅ Avatar mis à jour avec succès');
      return data.avatar_url;
    } catch (err: any) {
      console.error('❌ Erreur de mise à jour de l\'avatar:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isIntermediate,
        updateProfile,
        updateAvatar,
      }}
    >
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
