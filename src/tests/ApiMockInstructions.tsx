import React from 'react';

const ApiMockInstructions: React.FC = () => {
  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Instructions pour le serveur d'API mock</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Étape 1: Démarrer le serveur mock</h2>
        <p className="mb-4">
          Pour tester les services locaux, vous devez d'abord démarrer le serveur d'API mock.
          Ouvrez un terminal et exécutez la commande suivante à la racine du projet:
        </p>
        <pre className="bg-gray-100 p-4 rounded mb-4 overflow-x-auto">
          npm run mock-api
        </pre>
        <p className="text-sm text-gray-600">
          Cette commande démarrera un serveur Express sur le port 3001 qui simulera les réponses de l'API.
        </p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Étape 2: Activer le mode test</h2>
        <p className="mb-4">
          Retournez à la page de test des services et activez le "Mode Test" en cochant la case correspondante.
          Cela configurera l'application pour utiliser le serveur mock au lieu de l'API de production.
        </p>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <p className="text-yellow-700">
            <strong>Note:</strong> Assurez-vous que le serveur mock est en cours d'exécution avant d'activer le mode test.
          </p>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Étape 3: Effectuer les tests</h2>
        <p className="mb-4">
          Vous pouvez maintenant tester les différents services locaux en utilisant les formulaires et boutons
          disponibles sur la page de test. Les résultats s'afficheront en bas de la page.
        </p>
        <p className="mb-4">
          Le serveur mock est configuré avec des données de test pour simuler le comportement de l'API:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li className="mb-2">Deux membres: Jean Dupont (admin) et Marie Martin (standard)</li>
          <li className="mb-2">Deux transactions financières: un revenu et une dépense</li>
          <li className="mb-2">Un solde bancaire initial de 5000€</li>
        </ul>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Dépannage</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Erreur de connexion au serveur mock</h3>
            <p className="text-gray-700">
              Vérifiez que le serveur mock est bien en cours d'exécution et qu'il n'y a pas d'erreurs dans le terminal.
              Assurez-vous également que le port 3001 n'est pas utilisé par une autre application.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Les requêtes échouent malgré le serveur en cours d'exécution</h3>
            <p className="text-gray-700">
              Vérifiez que le mode test est bien activé et que l'URL de l'API affichée est bien http://localhost:3001/api.
              Si le problème persiste, essayez de rafraîchir la page.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Arrêter le serveur mock</h3>
            <p className="text-gray-700">
              Pour arrêter le serveur mock, appuyez sur <code className="bg-gray-100 px-1 rounded">Ctrl+C</code> dans le terminal où il est en cours d'exécution.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          onClick={() => window.close()}
        >
          Fermer cette fenêtre
        </button>
      </div>
    </div>
  );
};

export default ApiMockInstructions;
