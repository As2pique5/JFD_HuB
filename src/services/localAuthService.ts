import { apiService } from '../lib/api';
import { logAuditEvent } from '../lib/audit';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'intermediate' | 'standard';
  avatar_url?: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number; // timestamp en millisecondes
  user: AuthUser;
}

const TOKEN_KEY = 'jfdhub_token';
const REFRESH_TOKEN_KEY = 'jfdhub_refresh_token';
const USER_KEY = 'jfdhub_user';
const SESSION_KEY = 'jfdhub_session';
const TOKEN_EXPIRY_KEY = 'jfdhub_token_expiry';

class LocalAuthService {
  private currentUser: AuthUser | null = null;
  private currentSession: AuthSession | null = null;
  private authStateListeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    // Initialiser l'état à partir du localStorage au démarrage
    this.loadSessionFromStorage();
  }

  /**
   * Charge la session depuis le localStorage
   */
  private loadSessionFromStorage() {
    try {
      const sessionStr = localStorage.getItem(SESSION_KEY);
      if (sessionStr) {
        this.currentSession = JSON.parse(sessionStr);
        this.currentUser = this.currentSession?.user || null;
        
        // Vérifier si le token est expiré
        const expiresAt = this.currentSession?.expires_at || 0;
        if (expiresAt < Date.now()) {
          console.log('🔑 Token expiré, tentative de rafraîchissement');
          this.refreshToken();
        }
      } else {
        this.currentSession = null;
        this.currentUser = null;
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la session:', error);
      this.clearSession();
    }
  }

  /**
   * Sauvegarde la session dans le localStorage
   */
  private saveSessionToStorage() {
    if (this.currentSession) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentSession));
      if (this.currentUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));
      }
      localStorage.setItem(TOKEN_KEY, this.currentSession.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, this.currentSession.refresh_token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, this.currentSession.expires_at.toString());
    } else {
      this.clearSession();
    }
  }

  /**
   * Efface toutes les données de session du localStorage
   */
  private clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    this.currentSession = null;
    this.currentUser = null;
  }

  /**
   * S'abonne aux changements d'état d'authentification
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    this.authStateListeners.push(callback);
    // Appeler immédiatement avec l'état actuel
    callback(this.currentUser);
    
    // Retourner une fonction pour se désabonner
    return () => {
      this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notifie tous les listeners d'un changement d'état
   */
  private notifyAuthStateChange() {
    this.authStateListeners.forEach(callback => callback(this.currentUser));
  }

  /**
   * Connexion utilisateur
   */
  async login(credentials: LoginCredentials) {
    try {
      console.log('🔑 Tentative de connexion avec:', credentials.email);
      
      // Appel à l'API pour l'authentification
      const response = await apiService.login(credentials.email, credentials.password);
      
      // Traitement de la réponse
      this.currentSession = {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_at: Date.now() + (response.expires_in * 1000), // Convertir secondes en ms
        user: response.user
      };
      
      this.currentUser = response.user;
      
      // Sauvegarder dans le localStorage
      this.saveSessionToStorage();
      
      // Notifier les listeners
      this.notifyAuthStateChange();
      
      // Journaliser l'événement
      if (this.currentUser) {
        logAuditEvent(
          'user_login',
          this.currentUser.id,
          undefined,
          { email: this.currentUser.email }
        );
      }
      
      return { user: this.currentUser, session: this.currentSession };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  }

  /**
   * Déconnexion utilisateur
   */
  async logout() {
    try {
      console.log('🔑 Déconnexion utilisateur');
      
      if (this.currentUser) {
        // Journaliser l'événement avant de supprimer les données
        logAuditEvent(
          'user_logout',
          this.currentUser.id,
          undefined,
          { email: this.currentUser.email }
        );
        
        // Appel à l'API pour la déconnexion
        await apiService.logout();
      }
      
      // Nettoyer la session locale
      this.clearSession();
      
      // Notifier les listeners
      this.notifyAuthStateChange();
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      
      // Même en cas d'erreur, on nettoie la session locale
      this.clearSession();
      this.notifyAuthStateChange();
      
      throw error;
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(credentials: RegisterCredentials) {
    try {
      console.log('🔑 Inscription d\'un nouvel utilisateur:', credentials.email);
      
      // Appel à l'API pour l'inscription
      const response = await apiService.register(
        credentials.name,
        credentials.email,
        credentials.password
      );
      
      // Traitement similaire à login
      this.currentSession = {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_at: Date.now() + (response.expires_in * 1000),
        user: response.user
      };
      
      this.currentUser = response.user;
      
      // Sauvegarder dans le localStorage
      this.saveSessionToStorage();
      
      // Notifier les listeners
      this.notifyAuthStateChange();
      
      // Journaliser l'événement
      if (this.currentUser) {
        logAuditEvent(
          'user_register',
          this.currentUser.id,
          undefined,
          { email: this.currentUser.email }
        );
      }
      
      return { user: this.currentUser, session: this.currentSession };
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      throw error;
    }
  }

  /**
   * Rafraîchit le token d'accès
   */
  async refreshToken() {
    try {
      if (!this.currentSession?.refresh_token) {
        throw new Error('Aucun refresh token disponible');
      }
      
      console.log('🔑 Rafraîchissement du token');
      
      // Appel à l'API pour rafraîchir le token
      const response = await apiService.refreshToken(this.currentSession.refresh_token);
      
      // Mise à jour de la session
      this.currentSession = {
        ...this.currentSession,
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_at: Date.now() + (response.expires_in * 1000)
      };
      
      // Sauvegarder dans le localStorage
      this.saveSessionToStorage();
      
      return this.currentSession;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token:', error);
      
      // Si le rafraîchissement échoue, on déconnecte l'utilisateur
      this.clearSession();
      this.notifyAuthStateChange();
      
      throw error;
    }
  }

  /**
   * Récupère l'utilisateur actuel
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Récupère la session actuelle
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isAuthenticated() {
    return !!this.currentUser && !!this.currentSession?.access_token;
  }

  /**
   * Vérifie si le token est expiré
   */
  isTokenExpired() {
    if (!this.currentSession?.expires_at) return true;
    return this.currentSession.expires_at < Date.now();
  }
  
  /**
   * Vérifie la validité de la session actuelle
   * Cette méthode peut être utilisée pour des vérifications périodiques
   */
  async checkSession(): Promise<boolean> {
    try {
      if (!this.isAuthenticated()) {
        return false;
      }
      
      // Si le token est expiré, essayer de le rafraîchir
      if (this.isTokenExpired()) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        try {
          await this.refreshToken();
          return true;
        } catch (error) {
          console.error('❌ Erreur lors du rafraîchissement du token:', error);
          return false;
        }
      }
      
      // Si le token est sur le point d'expirer, le rafraîchir de manière proactive
      const now = Date.now();
      const expiresAt = this.currentSession?.expires_at || 0;
      const timeToExpiry = expiresAt - now;
      
      // Si le token expire dans moins de 5 minutes, le rafraîchir
      if (timeToExpiry < 300000) { // 5 minutes en millisecondes
        console.log('🔄 Token proche de l\'expiration, rafraîchissement proactif...');
        try {
          await this.refreshToken();
        } catch (error) {
          // Ne pas échouer la vérification si le rafraîchissement proactif échoue
          console.warn('⚠️ Rafraîchissement proactif du token échoué:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de session:', error);
      return false;
    }
  }

  /**
   * Récupère le profil utilisateur depuis l'API
   */
  async getProfile(): Promise<AuthUser | null> {
    try {
      if (!this.isAuthenticated() || !this.currentUser) {
        throw new Error('Utilisateur non authentifié');
      }
      
      console.log('👤 Récupération du profil utilisateur');
      
      // Appel à l'API pour récupérer le profil
      const profile = await apiService.getProfile();
      
      // Vérifier si l'utilisateur est connecté
      if (!this.currentUser) {
        throw new Error('Utilisateur non connecté');
      }
      
      // Mise à jour de l'utilisateur courant
      this.currentUser = {
        ...this.currentUser,
        ...profile
      };
      
      if (this.currentSession && this.currentUser) {
        this.currentSession.user = this.currentUser;
        this.saveSessionToStorage();
      }
      
      // Notifier les listeners
      this.notifyAuthStateChange();
      
      return this.currentUser;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      throw error;
    }
  }

  /**
   * Met à jour le profil utilisateur
   */
  async updateProfile(data: Partial<AuthUser>) {
    try {
      if (!this.isAuthenticated() || !this.currentUser) {
        throw new Error('Utilisateur non authentifié');
      }
      
      console.log('👤 Mise à jour du profil utilisateur');
      
      // Appel à l'API pour mettre à jour le profil
      const updatedProfile = await apiService.updateProfile(data);
      
      // Mise à jour de l'utilisateur courant
      this.currentUser = {
        ...this.currentUser,
        ...updatedProfile
      };
      
      if (this.currentSession && this.currentUser) {
        this.currentSession.user = this.currentUser;
        this.saveSessionToStorage();
      }
      
      // Notifier les listeners
      this.notifyAuthStateChange();
      
      // Journaliser l'événement
      logAuditEvent(
        'user_profile_update',
        this.currentUser?.id || 'unknown',
        undefined,
        { updatedFields: Object.keys(data) }
      );
      
      return this.currentUser;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }
}

// Exporter une instance unique du service
export const localAuthService = new LocalAuthService();
