import { apiService } from '../lib/api';
import { logAuditEvent, AuditAction } from '../lib/audit';

export interface FinancialTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  recipient?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BankBalanceUpdate {
  id: string;
  amount: number;
  updated_at: string;
  updated_by: string;
}

class FinancialService {
  async getTransactions(filters?: {
    type?: 'income' | 'expense';
    category?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      console.log('Récupération des transactions avec les filtres:', filters);
      
      let endpoint = '/financial/transactions';
      const queryParams = [];
      
      if (filters?.type) {
        queryParams.push(`type=${filters.type}`);
      }
      if (filters?.category) {
        queryParams.push(`category=${encodeURIComponent(filters.category)}`);
      }
      if (filters?.startDate) {
        queryParams.push(`startDate=${filters.startDate}`);
      }
      if (filters?.endDate) {
        queryParams.push(`endDate=${filters.endDate}`);
      }
      
      if (queryParams.length > 0) {
        endpoint += `?${queryParams.join('&')}`;
      }
      
      const transactions = await apiService.request('GET', endpoint);
      return transactions;
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      throw error;
    }
  }

  async createTransaction(
    transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>
  ) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Création d\'une nouvelle transaction financière:', transaction);
      const newTransaction = await apiService.request('POST', '/financial/transactions', {
        ...transaction,
        created_by: userId
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'financial_transaction_create' as AuditAction,
        userId,
        newTransaction.id,
        {
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category
        }
      );
      
      return newTransaction;
    } catch (error) {
      console.error('Erreur lors de la création de la transaction financière:', error);
      throw error;
    }
  }

  async deleteTransaction(id: string) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log(`Suppression de la transaction financière avec l'ID: ${id}`);
      await apiService.request('DELETE', `/financial/transactions/${id}`);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'financial_transaction_delete' as AuditAction,
        userId,
        id,
        {
          timestamp: new Date().toISOString()
        }
      );
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression de la transaction financière avec l'ID ${id}:`, error);
      throw error;
    }
  }

  async getLatestBankBalance() {
    try {
      console.log('Récupération du dernier solde bancaire...');
      
      const balance = await apiService.request('GET', '/financial/bank-balance/latest');
      
      // Si aucun enregistrement n'existe, retourner des valeurs par défaut
      if (!balance) {
        console.log('Aucun enregistrement de solde bancaire trouvé, retour des valeurs par défaut');
        return {
          amount: 0,
          updated_at: null
        };
      }
      
      console.log('Solde bancaire trouvé:', balance);
      return balance;
    } catch (error) {
      console.error('Erreur lors de la récupération du solde bancaire:', error);
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        amount: 0,
        updated_at: null
      };
    }
  }

  async updateBankBalance(amount: number) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      console.log('Mise à jour du solde bancaire:', { amount, userId });
      const updatedBalance = await apiService.request('POST', '/financial/bank-balance', {
        amount,
        updated_by: userId
      });
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'bank_balance_update' as AuditAction,
        userId,
        updatedBalance.id,
        {
          amount
        }
      );
      
      console.log('Solde bancaire mis à jour avec succès:', updatedBalance);
      return updatedBalance;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du solde bancaire:', error);
      throw error;
    }
  }

  async calculateCashBalance() {
    try {
      console.log('Calcul du solde de trésorerie...');
      
      const cashBalance = await apiService.request('GET', '/financial/cash-balance');
      
      console.log('Solde de trésorerie calculé:', cashBalance);
      return cashBalance;
    } catch (error) {
      console.error('Erreur lors du calcul du solde de trésorerie:', error);
      throw error;
    }
  }
}

export const localFinancialService = new FinancialService();
