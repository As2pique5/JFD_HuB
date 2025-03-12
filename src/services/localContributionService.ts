import { apiService } from '../lib/api';
import { logAuditEvent } from '../lib/audit';

export interface MonthlyContributionSession {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  monthly_target_amount: number;
  duration_months: number;
  payment_deadline_day: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  created_by?: string;
}

export interface MonthlyContributionAssignment {
  id?: string;
  session_id: string;
  user_id: string;
  monthly_amount: number;
}

export interface Contribution {
  id?: string;
  user_id: string;
  session_id: string;
  amount: number;
  payment_date: string;
  payment_period_start?: string;
  payment_period_end?: string;
  contribution_type: 'monthly' | 'event' | 'project';
  status: 'paid' | 'pending' | 'late';
  notes?: string;
  receipt_url?: string;
}

class ContributionService {
  async getMonthlySessions(filters?: {
    status?: 'active' | 'completed' | 'cancelled';
    year?: number;
  }) {
    try {
      console.log('Récupération des sessions mensuelles avec filtres:', filters);
      
      let url = '/contributions/monthly-sessions';
      const queryParams = [];
      
      if (filters?.status) {
        queryParams.push(`status=${filters.status}`);
      }
      
      if (filters?.year) {
        queryParams.push(`year=${filters.year}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const sessions = await apiService.request('GET', url);
      console.log('Sessions récupérées:', sessions);
      return sessions || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des sessions mensuelles:', error);
      throw error;
    }
  }

  async getSessionPayments(sessionId: string) {
    try {
      console.log(`Récupération des paiements pour la session: ${sessionId}`);
      
      const payments = await apiService.request('GET', `/contributions/monthly-sessions/${sessionId}/payments`);
      console.log('Paiements récupérés:', payments);
      return payments || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements de session:', error);
      throw error;
    }
  }

  async updateMonthlySession(sessionId: string, updates: Partial<MonthlyContributionSession>) {
    try {
      console.log('Mise à jour de la session mensuelle:', { sessionId, updates });

      const updatedSession = await apiService.request('PUT', `/contributions/monthly-sessions/${sessionId}`, updates);
      
      // Journaliser l'événement d'audit
      await logAuditEvent(
        'session_update',
        localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system',
        sessionId,
        {
          name: updates.name,
          status: updates.status,
          monthly_target_amount: updates.monthly_target_amount,
        }
      );
      
      console.log('Session mise à jour:', updatedSession);
      return updatedSession;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la session mensuelle:', error);
      throw error;
    }
  }

  async createMonthlySession(session: Omit<MonthlyContributionSession, 'id' | 'created_at'>) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      const newSession = await apiService.request('POST', '/contributions/monthly-sessions', {
        ...session,
        created_by: userId,
      });

      // Journaliser l'événement d'audit
      await logAuditEvent(
        'session_create',
        userId,
        newSession.id,
        {
          name: session.name,
          monthly_target_amount: session.monthly_target_amount,
        }
      );

      return newSession;
    } catch (error) {
      console.error('Erreur lors de la création de la session mensuelle:', error);
      throw error;
    }
  }

  async createMonthlyAssignments(assignments: MonthlyContributionAssignment[]) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      const newAssignments = await apiService.request('POST', '/contributions/monthly-assignments', assignments);

      // Journaliser l'événement d'audit
      await logAuditEvent(
        'assignments_create',
        userId,
        assignments[0].session_id,
        {
          count: assignments.length,
          total_amount: assignments.reduce((sum, a) => sum + a.monthly_amount, 0),
        }
      );

      return newAssignments;
    } catch (error) {
      console.error('Erreur lors de la création des assignations mensuelles:', error);
      throw error;
    }
  }

  async recordPayment(payment: Contribution) {
    try {
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      
      const newPayment = await apiService.request('POST', '/contributions/payments', payment);

      // Journaliser l'événement d'audit
      await logAuditEvent(
        'payment_record',
        userId,
        newPayment.id,
        {
          session_id: payment.session_id,
          amount: payment.amount,
          payment_date: payment.payment_date,
          contribution_type: payment.contribution_type,
        }
      );

      return newPayment;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du paiement:', error);
      throw error;
    }
  }

  async getUserContributions(userId: string, filters?: {
    type?: 'monthly' | 'event' | 'project';
    status?: 'paid' | 'pending' | 'late';
    year?: number;
  }) {
    try {
      console.log(`Récupération des contributions pour l'utilisateur: ${userId}`, filters);
      
      let url = `/contributions/users/${userId}`;
      const queryParams = [];
      
      if (filters?.type) {
        queryParams.push(`type=${filters.type}`);
      }
      
      if (filters?.status) {
        queryParams.push(`status=${filters.status}`);
      }
      
      if (filters?.year) {
        queryParams.push(`year=${filters.year}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const contributions = await apiService.request('GET', url);
      console.log('Contributions récupérées:', contributions);
      return contributions || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des contributions utilisateur:', error);
      throw error;
    }
  }

  async getContributionSummary(userId: string) {
    try {
      console.log(`Récupération du résumé des contributions pour l'utilisateur: ${userId}`);
      
      const summary = await apiService.request('GET', `/contributions/users/${userId}/summary`);
      console.log('Résumé des contributions récupéré:', summary);
      return summary;
    } catch (error) {
      console.error('Erreur lors de la récupération du résumé des contributions:', error);
      throw error;
    }
  }

  async uploadPaymentReceipt(contributionId: string, file: File) {
    try {
      console.log(`Upload du reçu de paiement pour la contribution avec l'ID ${contributionId}`);
      
      // Créer un FormData pour l'upload du fichier
      const formData = new FormData();
      formData.append('receipt', file);
      
      // Appeler l'API pour l'upload du reçu
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/contributions/payments/${contributionId}/receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jfdhub_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload du reçu de paiement');
      }
      
      const data = await response.json();
      
      // Journaliser l'événement d'audit
      const userId = localStorage.getItem('jfdhub_user') ? JSON.parse(localStorage.getItem('jfdhub_user') || '{}').id : 'system';
      await logAuditEvent(
        'payment_receipt_upload',
        userId,
        contributionId,
        { details: `Reçu de paiement téléversé pour la contribution avec l'ID: ${contributionId}` }
      );
      
      return data;
    } catch (error) {
      console.error(`Erreur lors de l'upload du reçu de paiement pour la contribution avec l'ID ${contributionId}:`, error);
      throw error;
    }
  }
}

export const localContributionService = new ContributionService();
