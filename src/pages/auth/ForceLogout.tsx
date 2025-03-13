import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const ForceLogout = () => {
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clearAllStorage = () => {
      try {
        console.log('🧹 Nettoyage complet du localStorage...');
        
        // Sauvegarder la liste des clés à supprimer
        const keysToRemove: string[] = [];
        
        // Identifier toutes les clés à supprimer
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            keysToRemove.push(key);
          }
        }
        
        // Supprimer toutes les clés
        keysToRemove.forEach(key => {
          console.log(`🗑️ Suppression de la clé: ${key}`);
          localStorage.removeItem(key);
        });
        
        // Effacer également sessionStorage par précaution
        sessionStorage.clear();
        
        console.log('✅ Nettoyage complet terminé');
        setIsLoggedOut(true);
      } catch (err) {
        console.error('❌ Erreur lors du nettoyage:', err);
        setError('Une erreur est survenue lors de la déconnexion forcée.');
      }
    };

    clearAllStorage();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">
          Déconnexion d'urgence
        </h1>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : isLoggedOut ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Déconnexion forcée réussie ! Toutes les données de session ont été effacées.
          </div>
        ) : (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            Déconnexion en cours...
          </div>
        )}
        
        <div className="text-center mt-6">
          <Link 
            to="/login" 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition-colors"
          >
            Retour à la page de connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForceLogout;
