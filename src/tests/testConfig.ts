// Configuration pour les tests
export const TEST_API_URL = 'http://localhost:3001/api';

// Fonction pour configurer l'environnement de test
export const setupTestEnvironment = () => {
  // Stocker l'URL d'API originale si elle existe
  const originalApiUrl = localStorage.getItem('original_api_url');
  if (!originalApiUrl) {
    localStorage.setItem('original_api_url', import.meta.env.VITE_API_URL || 'http://localhost:3000/api');
  }
  
  // Définir l'URL de l'API de test
  localStorage.setItem('test_mode', 'true');
  
  // Créer un utilisateur de test si nécessaire
  if (!localStorage.getItem('jfdhub_user')) {
    localStorage.setItem('jfdhub_user', JSON.stringify({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Utilisateur Test',
      role: 'super_admin'
    }));
  }
  
  // Créer un token de test si nécessaire
  if (!localStorage.getItem('jfdhub_token')) {
    localStorage.setItem('jfdhub_token', 'test-token');
  }
  
  console.log('Environnement de test configuré avec succès');
  return true;
};

// Fonction pour restaurer l'environnement normal
export const restoreNormalEnvironment = () => {
  // Restaurer l'URL d'API originale
  localStorage.removeItem('test_mode');
  localStorage.removeItem('jfdhub_user');
  localStorage.removeItem('jfdhub_token');
  
  console.log('Environnement normal restauré avec succès');
  return true;
};
