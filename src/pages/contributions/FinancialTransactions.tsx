import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Wallet, Building, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertCircle, Edit, Filter } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { financialService } from '../../services/financialService';
import TransactionForm from '../../components/transactions/TransactionForm';

export default function FinancialTransactions() {
  const { isAdmin, isIntermediate, user } = useAuth();
  const [cashBalance, setCashBalance] = useState({
    totalBalance: 0,
    totalContributions: 0,
    totalManualIncome: 0,
    totalExpenses: 0
  });
  const [bankBalance, setBankBalance] = useState(0);
  const [lastBankUpdate, setLastBankUpdate] = useState<string | null>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBankBalance, setNewBankBalance] = useState<number>(0);

  // Generate year options (from 2020 to current year + 5)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: (currentYear + 5) - 2020 + 1 },
    (_, i) => (currentYear + 5) - i
  );

  useEffect(() => {
    fetchData();
  }, [yearFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cash balance and all its components
      const balanceData = await financialService.calculateCashBalance();
      setCashBalance(balanceData);

      // Fetch bank balance
      const bankBalanceData = await financialService.getLatestBankBalance();
      if (bankBalanceData) {
        setBankBalance(bankBalanceData.amount);
        setNewBankBalance(bankBalanceData.amount); // Initialize edit value
        setLastBankUpdate(bankBalanceData.updated_at);
      }

      // Fetch transactions with year filter
      const startDate = `${yearFilter}-01-01`;
      const endDate = `${yearFilter}-12-31`;
      const transactionsData = await financialService.getTransactions({
        startDate,
        endDate
      });
      setTransactions(transactionsData || []);
    } catch (err: any) {
      console.error('Error fetching financial data:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBankBalance = async () => {
    if (!user) return;

    try {
      setError(null);
      await financialService.updateBankBalance(newBankBalance, user.id);
      await fetchData(); // Refresh all data
      setIsEditingBalance(false); // Exit edit mode
    } catch (err: any) {
      console.error('Error updating bank balance:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du solde bancaire');
    }
  };

  const handleStartEdit = () => {
    setNewBankBalance(bankBalance);
    setIsEditingBalance(true);
  };

  const handleCancelEdit = () => {
    setNewBankBalance(bankBalance);
    setIsEditingBalance(false);
  };

  const balanceDifference = cashBalance.totalBalance - bankBalance;
  const balanceStatus = Math.abs(balanceDifference) < 100 ? 'match' : 'mismatch';

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* JFD Cash Register Section */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center">
            <Wallet className="h-5 w-5 text-primary mr-2" />
            <h2 className="font-semibold text-foreground">Caisse JFD</h2>
          </div>
          
          <div className="p-4">
            <div className="bg-muted/30 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Solde actuel</p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(cashBalance.totalBalance)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total cotisations</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(cashBalance.totalContributions)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Autres revenus</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(cashBalance.totalManualIncome)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Total dépenses</p>
                  <p className="text-sm font-medium text-destructive">
                    {formatCurrency(cashBalance.totalExpenses)}
                  </p>
                </div>
              </div>
            </div>

            {isIntermediate() && (
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => {
                    setTransactionType('income');
                    setShowTransactionForm(true);
                  }}
                  className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm flex items-center justify-center"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Nouvelle entrée
                </button>
                <button
                  onClick={() => {
                    setTransactionType('expense');
                    setShowTransactionForm(true);
                  }}
                  className="flex-1 bg-destructive text-destructive-foreground px-3 py-2 rounded-md text-sm flex items-center justify-center"
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Nouvelle dépense
                </button>
              </div>
            )}
          </div>
        </div>

        {/* JFD Bank Account Section */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center">
            <Building className="h-5 w-5 text-primary mr-2" />
            <h2 className="font-semibold text-foreground">Compte bancaire JFD</h2>
          </div>
          
          <div className="p-4">
            <div className="bg-muted/30 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex-1">
                  {isEditingBalance ? (
                    <div className="space-y-2">
                      <label className="block text-sm text-muted-foreground">
                        Nouveau solde bancaire
                      </label>
                      <input
                        type="number"
                        value={newBankBalance}
                        onChange={(e) => setNewBankBalance(Number(e.target.value))}
                        className="w-full border border-input rounded-md bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-3 py-1 bg-muted text-foreground rounded-md text-sm"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleUpdateBankBalance}
                          className="flex-1 px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm"
                        >
                          Valider
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">Solde bancaire</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatCurrency(bankBalance)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {isIntermediate() && !isEditingBalance && (
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handleStartEdit}
                    className="w-full bg-muted text-foreground px-3 py-2 rounded-md text-sm flex items-center justify-center"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editer
                  </button>
                  <button
                    onClick={handleUpdateBankBalance}
                    className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm flex items-center justify-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Mettre à jour
                  </button>
                </div>
              )}

              <div className="border-t border-border mt-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Différence avec la caisse</p>
                    <p className={cn(
                      "text-sm font-medium",
                      balanceStatus === 'match' 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    )}>
                      {balanceStatus === 'match' ? 'Soldes concordants' : formatCurrency(Math.abs(balanceDifference))}
                    </p>
                  </div>
                  {balanceStatus === 'mismatch' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            </div>

            {lastBankUpdate && (
              <p className="text-xs text-muted-foreground">
                Dernière mise à jour: {new Date(lastBankUpdate).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="font-semibold text-foreground">Historique des transactions</h2>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <select
              className="border border-input rounded-md bg-background px-3 py-2"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aucune transaction pour cette année.
            </div>
          ) : (
            transactions.map(transaction => (
              <div key={transaction.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{transaction.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('fr-FR')}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {transaction.category}
                      </span>
                    </div>
                    {transaction.recipient && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Bénéficiaire: {transaction.recipient}
                      </p>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm font-medium",
                    transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showTransactionForm && (
        <TransactionForm
          type={transactionType}
          onClose={() => setShowTransactionForm(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}