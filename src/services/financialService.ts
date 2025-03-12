import { supabase } from '../lib/supabase';
import { logAuditEvent } from '../lib/audit';

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
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async createTransaction(
    transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ) {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          ...transaction,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('financial_transaction_create', userId, data.id, {
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
      });

      return data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id: string, userId: string) {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent('financial_transaction_delete', userId, id);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  async getLatestBankBalance() {
    try {
      console.log('Fetching latest bank balance...');
      
      const { data, error } = await supabase
        .from('bank_balance_updates')
        .select('amount, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching bank balance:', error);
        throw error;
      }

      // If no records exist, return default values
      if (!data) {
        console.log('No bank balance records found, returning default values');
        return {
          amount: 0,
          updated_at: null
        };
      }

      console.log('Found bank balance:', data);
      return data;
    } catch (error) {
      console.error('Error in getLatestBankBalance:', error);
      // Return default values on error
      return {
        amount: 0,
        updated_at: null
      };
    }
  }

  async updateBankBalance(amount: number, userId: string) {
    try {
      console.log('Updating bank balance:', { amount, userId });
      
      const { data, error } = await supabase
        .from('bank_balance_updates')
        .insert({
          amount,
          updated_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('bank_balance_update', userId, data.id, {
        amount,
      });

      console.log('Bank balance updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error updating bank balance:', error);
      throw error;
    }
  }

  async calculateCashBalance() {
    try {
      console.log('Calculating cash balance...');
      
      // Get all contributions
      const { data: contributions, error: contribError } = await supabase
        .from('contributions')
        .select('amount')
        .eq('status', 'paid');

      if (contribError) throw contribError;

      // Calculate total contributions
      const totalContributions = contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      // Get all manual transactions
      const { data: transactions, error: transError } = await supabase
        .from('financial_transactions')
        .select('*');

      if (transError) throw transError;

      // Calculate total manual income
      const totalManualIncome = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Calculate total expenses
      const totalExpenses = transactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Calculate final balance
      const finalBalance = totalContributions + totalManualIncome - totalExpenses;

      const result = {
        totalBalance: finalBalance,
        totalContributions,
        totalManualIncome,
        totalExpenses
      };

      console.log('Cash balance calculated:', result);
      return result;
    } catch (error) {
      console.error('Error calculating cash balance:', error);
      throw error;
    }
  }
}

export const financialService = new FinancialService();