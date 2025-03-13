import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { checkSupabaseConnection, forceCompleteSignOut } from './lib/supabase';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import ForceLogout from './pages/auth/ForceLogout';
import Dashboard from './pages/dashboard/Dashboard';
import Members from './pages/members/Members';
import Contributions from './pages/contributions/Contributions';
import Projects from './pages/projects/Projects';
import Events from './pages/events/Events';
import Messages from './pages/messages/Messages';
import Documents from './pages/documents/Documents';
import FamilyTree from './pages/familytree/FamilyTree';
import Profile from './pages/profile/Profile';
import NotFound from './pages/NotFound';
import { ThemeProvider } from './contexts/ThemeContext';
import ServicesTester from './tests/ServicesTester';
import ApiMockInstructions from './tests/ApiMockInstructions';

function App() {
  const { user, loading } = useAuth();
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    // Vérifier si l'URL contient un paramètre de déconnexion forcée
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogoutParam = urlParams.get('force_logout');
    
    // Si le paramètre est présent, nettoyer l'URL pour éviter des rechargements indésirables
    if (forceLogoutParam === 'true') {
      console.log('🔥 Déconnexion forcée détectée dans l\'URL');
      // Supprimer le paramètre de l'URL sans recharger la page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await checkSupabaseConnection();
      setConnectionError(!isConnected);
    };

    // Check connection immediately
    checkConnection();

    // Set up periodic connection check avec un intervalle plus long
    // pour éviter les conflits avec la vérification dans AuthContext
    const checkInterval = setInterval(checkConnection, 120000); // Toutes les 2 minutes

    return () => clearInterval(checkInterval);
  }, []);

  // Fonction pour forcer la déconnexion complète
  const forceLogout = async () => {
    console.log('🔥 Déconnexion forcée en cours...');
    
    // Utiliser la fonction spécialisée pour forcer la déconnexion
    await forceCompleteSignOut();
    
    // Recharger la page pour forcer une nouvelle initialisation
    window.location.href = '/login';
  };

  // Show loading screen while auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-medium text-foreground">Chargement de JFD'HuB...</p>
          
          {/* Bouton de déconnexion d'urgence */}
          <button 
            onClick={forceLogout}
            className="mt-8 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Déconnexion d'urgence
          </button>
        </div>
      </div>
    );
  }

  // Show connection error screen
  if (connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Erreur de connexion</h2>
          <p className="text-muted-foreground mb-4">
            Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet et réessayer.
          </p>
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
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/force-logout" element={<ForceLogout />} />
        
        <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/contributions/*" element={<Contributions />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/events" element={<Events />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/family-tree" element={<FamilyTree />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/test-services" element={<ServicesTester />} />
        </Route>
        
        <Route path="/api-mock-instructions" element={<ApiMockInstructions />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;