import axios from 'axios';

// Déclaration pour import.meta.env
declare interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Créer une instance axios avec la configuration de base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  withCredentials: true,
});

// Intercepteur pour ajouter le token d'authentification à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jfdhub_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Gérer les erreurs d'authentification (401)
    if (error.response && error.response.status === 401) {
      // Rediriger vers la page de connexion ou rafraîchir le token
      localStorage.removeItem('jfdhub_token');
      localStorage.removeItem('jfdhub_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Fonctions d'aide pour les requêtes API
export const apiService = {
  // Authentification
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(name: string, email: string, password: string) {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/users/profile');
    return response.data;
  },

  async updateProfile(data: any) {
    // Récupérer l'ID de l'utilisateur depuis le localStorage
    const userJson = localStorage.getItem('jfdhub_user');
    if (!userJson) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      const user = JSON.parse(userJson);
      const userId = user.id;
      
      if (!userId) {
        throw new Error('ID utilisateur non disponible');
      }
      
      console.log(`👤 Mise à jour du profil de l'utilisateur ${userId}`);
      const response = await api.put(`/users/${userId}`, data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
      throw error;
    }
  },

  async refreshToken(refreshToken: string) {
    const response = await api.post('/auth/refresh-token', { refresh_token: refreshToken });
    return response.data;
  },

  // Utilisateurs
  async getUsers() {
    const response = await api.get('/users');
    return response.data;
  },

  async getUserById(id: string) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Famille
  async getFamilyMembers() {
    const response = await api.get('/family/members');
    return response.data;
  },

  async getFamilyMemberById(id: string) {
    const response = await api.get(`/family/members/${id}`);
    return response.data;
  },

  async createFamilyMember(data: any) {
    const response = await api.post('/family/members', data);
    return response.data;
  },

  async updateFamilyMember(id: string, data: any) {
    const response = await api.put(`/family/members/${id}`, data);
    return response.data;
  },

  async deleteFamilyMember(id: string) {
    const response = await api.delete(`/family/members/${id}`);
    return response.data;
  },

  async getFamilyRelationships() {
    const response = await api.get('/family/relationships');
    return response.data;
  },

  async createFamilyRelationship(data: any) {
    const response = await api.post('/family/relationships', data);
    return response.data;
  },

  async getFamilyTree() {
    const response = await api.get('/family/tree');
    return response.data;
  },

  // Méthode générique pour les requêtes personnalisées
  async request(method: string, url: string, data?: any) {
    const response = await api({
      method,
      url,
      data,
    });
    return response.data;
  },
};

export default api;
