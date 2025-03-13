import React, { useState, useEffect } from 'react';
import { localMemberService } from '../services/localMemberService';
import { localFinancialService } from '../services/localFinancialService';
import { setupTestEnvironment, restoreNormalEnvironment, TEST_API_URL } from './testConfig';

// Interface pour les résultats de test
interface TestResult {
  service: string;
  method: string;
  status: 'success' | 'error';
  data?: any;
  error?: any;
  timestamp: Date;
}

const ServicesTester: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedService, setSelectedService] = useState<string>('member');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testMode, setTestMode] = useState<boolean>(localStorage.getItem('test_mode') === 'true');
  const [apiUrl, setApiUrl] = useState<string>(testMode ? TEST_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api'));
  
  // Effet pour configurer l'environnement de test
  useEffect(() => {
    if (testMode) {
      setupTestEnvironment();
      setApiUrl(TEST_API_URL);
    } else {
      restoreNormalEnvironment();
      setApiUrl(import.meta.env.VITE_API_URL || 'http://localhost:3000/api');
    }
  }, [testMode]);
  
  // États pour les formulaires de test
  const [memberId, setMemberId] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [memberEmail, setMemberEmail] = useState<string>('');
  const [memberRole, setMemberRole] = useState<string>('standard');
  
  const [transactionAmount, setTransactionAmount] = useState<number>(0);
  const [transactionType, setTransactionType] = useState<string>('income');
  const [transactionCategory, setTransactionCategory] = useState<string>('');
  const [transactionDescription, setTransactionDescription] = useState<string>('');
  
  // Fonction pour ajouter un résultat de test
  const addResult = (
    service: string,
    method: string,
    status: 'success' | 'error',
    data?: any,
    error?: any
  ) => {
    const newResult: TestResult = {
      service,
      method,
      status,
      data,
      error,
      timestamp: new Date()
    };
    
    setResults(prevResults => [newResult, ...prevResults]);
  };
  
  // Fonctions de test pour le service de membres
  const testGetMembers = async () => {
    setIsLoading(true);
    try {
      const members = await localMemberService.getMembers();
      addResult('Member', 'getMembers', 'success', members);
    } catch (error) {
      addResult('Member', 'getMembers', 'error', undefined, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testGetMember = async () => {
    if (!memberId) {
      alert('Veuillez entrer un ID de membre');
      return;
    }
    
    setIsLoading(true);
    try {
      const member = await localMemberService.getMember(memberId);
      addResult('Member', 'getMember', 'success', member);
    } catch (error) {
      addResult('Member', 'getMember', 'error', undefined, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testCreateMember = async () => {
    if (!memberName || !memberEmail) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setIsLoading(true);
    try {
      const newMember = await localMemberService.createMember({
        name: memberName,
        email: memberEmail,
        role: memberRole as any,
        status: 'active'
      });
      
      addResult('Member', 'createMember', 'success', newMember);
      
      // Réinitialiser les champs du formulaire
      setMemberName('');
      setMemberEmail('');
      setMemberRole('standard');
    } catch (error) {
      addResult('Member', 'createMember', 'error', undefined, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonctions de test pour le service financier
  const testGetTransactions = async () => {
    setIsLoading(true);
    try {
      const transactions = await localFinancialService.getTransactions();
      addResult('Financial', 'getTransactions', 'success', transactions);
    } catch (error) {
      addResult('Financial', 'getTransactions', 'error', undefined, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testCreateTransaction = async () => {
    if (!transactionCategory || !transactionDescription) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setIsLoading(true);
    try {
      const newTransaction = await localFinancialService.createTransaction({
        date: new Date().toISOString(),
        amount: transactionAmount,
        type: transactionType as any,
        category: transactionCategory,
        description: transactionDescription
      });
      
      addResult('Financial', 'createTransaction', 'success', newTransaction);
      
      // Réinitialiser les champs du formulaire
      setTransactionAmount(0);
      setTransactionCategory('');
      setTransactionDescription('');
    } catch (error) {
      addResult('Financial', 'createTransaction', 'error', undefined, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testGetBankBalance = async () => {
    setIsLoading(true);
    try {
      const balance = await localFinancialService.getLatestBankBalance();
      addResult('Financial', 'getLatestBankBalance', 'success', balance);
    } catch (error) {
      addResult('Financial', 'getLatestBankBalance', 'error', undefined, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testCalculateCashBalance = async () => {
    setIsLoading(true);
    try {
      const cashBalance = await localFinancialService.calculateCashBalance();
      addResult('Financial', 'calculateCashBalance', 'success', cashBalance);
    } catch (error) {
      addResult('Financial', 'calculateCashBalance', 'error', undefined, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour démarrer le serveur d'API mock
  const startMockServer = () => {
    // Ouvrir une nouvelle fenêtre avec les instructions
    window.open('/api-mock-instructions', '_blank');
  };
  
  // Fonction pour basculer le mode de test
  const toggleTestMode = () => {
    setTestMode(!testMode);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Testeur de Services Locaux</h1>
      
      <div className="bg-blue-100 p-4 rounded mb-4">
        <h2 className="text-xl font-semibold mb-2">Configuration de test</h2>
        <div className="flex items-center space-x-4 mb-2">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="testMode" 
              className="mr-2"
              checked={testMode}
              onChange={toggleTestMode}
            />
            <label htmlFor="testMode">Mode Test</label>
          </div>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={startMockServer}
          >
            Démarrer le serveur mock
          </button>
        </div>
        <div className="text-sm">
          <p>URL de l'API actuelle: <code className="bg-gray-200 px-1 rounded">{apiUrl}</code></p>
          <p className="mt-1">
            {testMode ? 
              "Mode test activé. Les requêtes seront envoyées au serveur mock." : 
              "Mode test désactivé. Les requêtes seront envoyées à l'API de production."}
          </p>
        </div>
      </div>
      
      <div className="flex mb-4 space-x-2">
        <button 
          className={`px-4 py-2 rounded ${selectedService === 'member' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedService('member')}
        >
          Service de Membres
        </button>
        <button 
          className={`px-4 py-2 rounded ${selectedService === 'financial' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedService('financial')}
        >
          Service Financier
        </button>
      </div>
      
      {/* Section de test pour le service de membres */}
      {selectedService === 'member' && (
        <div className="bg-gray-100 p-4 rounded mb-4">
          <h2 className="text-xl font-semibold mb-2">Service de Membres</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Récupérer tous les membres</h3>
            <button 
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={testGetMembers}
              disabled={isLoading}
            >
              {isLoading ? 'Chargement...' : 'Tester getMembers()'}
            </button>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Récupérer un membre par ID</h3>
            <div className="flex space-x-2 mb-2">
              <input 
                type="text" 
                className="border p-2 rounded flex-1"
                placeholder="ID du membre"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              />
              <button 
                className="bg-green-500 text-white px-4 py-2 rounded"
                onClick={testGetMember}
                disabled={isLoading}
              >
                {isLoading ? 'Chargement...' : 'Tester getMember()'}
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Créer un nouveau membre</h3>
            <div className="space-y-2 mb-2">
              <input 
                type="text" 
                className="border p-2 rounded w-full"
                placeholder="Nom"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
              <input 
                type="email" 
                className="border p-2 rounded w-full"
                placeholder="Email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
              <select 
                className="border p-2 rounded w-full"
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
              >
                <option value="standard">Standard</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <button 
                className="bg-green-500 text-white px-4 py-2 rounded w-full"
                onClick={testCreateMember}
                disabled={isLoading}
              >
                {isLoading ? 'Chargement...' : 'Tester createMember()'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Section de test pour le service financier */}
      {selectedService === 'financial' && (
        <div className="bg-gray-100 p-4 rounded mb-4">
          <h2 className="text-xl font-semibold mb-2">Service Financier</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Récupérer toutes les transactions</h3>
            <button 
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={testGetTransactions}
              disabled={isLoading}
            >
              {isLoading ? 'Chargement...' : 'Tester getTransactions()'}
            </button>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Créer une nouvelle transaction</h3>
            <div className="space-y-2 mb-2">
              <div className="flex space-x-2">
                <input 
                  type="number" 
                  className="border p-2 rounded flex-1"
                  placeholder="Montant"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(Number(e.target.value))}
                />
                <select 
                  className="border p-2 rounded flex-1"
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                >
                  <option value="income">Revenu</option>
                  <option value="expense">Dépense</option>
                </select>
              </div>
              <input 
                type="text" 
                className="border p-2 rounded w-full"
                placeholder="Catégorie"
                value={transactionCategory}
                onChange={(e) => setTransactionCategory(e.target.value)}
              />
              <input 
                type="text" 
                className="border p-2 rounded w-full"
                placeholder="Description"
                value={transactionDescription}
                onChange={(e) => setTransactionDescription(e.target.value)}
              />
              <button 
                className="bg-green-500 text-white px-4 py-2 rounded w-full"
                onClick={testCreateTransaction}
                disabled={isLoading}
              >
                {isLoading ? 'Chargement...' : 'Tester createTransaction()'}
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Récupérer le solde bancaire</h3>
            <button 
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={testGetBankBalance}
              disabled={isLoading}
            >
              {isLoading ? 'Chargement...' : 'Tester getLatestBankBalance()'}
            </button>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Calculer le solde de trésorerie</h3>
            <button 
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={testCalculateCashBalance}
              disabled={isLoading}
            >
              {isLoading ? 'Chargement...' : 'Tester calculateCashBalance()'}
            </button>
          </div>
        </div>
      )}
      
      {/* Affichage des résultats de test */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Résultats des Tests</h2>
        
        {results.length === 0 ? (
          <p className="text-gray-500">Aucun test n'a encore été exécuté.</p>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-4 rounded ${result.status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}
              >
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{result.service} - {result.method}</span>
                  <span className="text-sm text-gray-500">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="text-sm">
                  <span className={`font-medium ${result.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {result.status === 'success' ? 'Succès' : 'Erreur'}
                  </span>
                  
                  {result.status === 'success' && result.data && (
                    <pre className="mt-2 bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                  
                  {result.status === 'error' && result.error && (
                    <pre className="mt-2 bg-white p-2 rounded overflow-x-auto text-red-500">
                      {JSON.stringify(result.error, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesTester;
