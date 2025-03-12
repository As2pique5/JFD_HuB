import { Request, Response } from 'express';
import monthlyContributionModel from '../models/monthlyContributionModel';
import { createAuditLog } from '../utils/audit';

/**
 * Contrôleur pour la gestion des sessions de cotisations mensuelles
 */
class MonthlyContributionController {
  /**
   * Récupérer toutes les sessions de cotisations mensuelles
   */
  async getAllSessions(req: Request, res: Response): Promise<Response> {
    try {
      const sessions = await monthlyContributionModel.getAllSessions();
      return res.status(200).json({ success: true, data: sessions });
    } catch (error) {
      console.error('Erreur lors de la récupération des sessions de cotisations:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des sessions de cotisations',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Récupérer une session de cotisations mensuelles par son ID
   */
  async getSessionById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const session = await monthlyContributionModel.getSessionById(id);
      
      if (!session) {
        return res.status(404).json({ 
          success: false, 
          message: `Session de cotisations avec l'ID ${id} non trouvée` 
        });
      }
      
      return res.status(200).json({ success: true, data: session });
    } catch (error) {
      console.error(`Erreur lors de la récupération de la session de cotisations:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération de la session de cotisations',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Créer une nouvelle session de cotisations mensuelles
   */
  async createSession(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        name, 
        description, 
        start_date, 
        monthly_target_amount, 
        duration_months, 
        payment_deadline_day, 
        status 
      } = req.body;
      
      // Validation de base
      if (!name || !start_date || !monthly_target_amount || !duration_months || !payment_deadline_day || !status) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tous les champs requis doivent être fournis' 
        });
      }
      
      // Validation du jour limite de paiement
      if (payment_deadline_day < 1 || payment_deadline_day > 31) {
        return res.status(400).json({ 
          success: false, 
          message: 'Le jour limite de paiement doit être compris entre 1 et 31' 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      const sessionData = {
        name,
        description,
        start_date: new Date(start_date),
        monthly_target_amount: Number(monthly_target_amount),
        duration_months: Number(duration_months),
        payment_deadline_day: Number(payment_deadline_day),
        status,
        created_by: userId
      };
      
      const newSession = await monthlyContributionModel.createSession(sessionData);
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'create',
        user_id: userId,
        target_id: newSession.id,
        target_type: 'monthly_contribution_session',
        details: { sessionData }
      });
      
      return res.status(201).json({ 
        success: true, 
        message: 'Session de cotisations créée avec succès', 
        data: newSession 
      });
    } catch (error) {
      console.error('Erreur lors de la création de la session de cotisations:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création de la session de cotisations',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mettre à jour une session de cotisations mensuelles
   */
  async updateSession(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Validation de base
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Aucune donnée fournie pour la mise à jour' 
        });
      }
      
      // Validation du jour limite de paiement si fourni
      if (updateData.payment_deadline_day && (updateData.payment_deadline_day < 1 || updateData.payment_deadline_day > 31)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Le jour limite de paiement doit être compris entre 1 et 31' 
        });
      }
      
      // Convertir les valeurs numériques
      if (updateData.monthly_target_amount) {
        updateData.monthly_target_amount = Number(updateData.monthly_target_amount);
      }
      
      if (updateData.duration_months) {
        updateData.duration_months = Number(updateData.duration_months);
      }
      
      if (updateData.payment_deadline_day) {
        updateData.payment_deadline_day = Number(updateData.payment_deadline_day);
      }
      
      if (updateData.start_date) {
        updateData.start_date = new Date(updateData.start_date);
      }
      
      const updatedSession = await monthlyContributionModel.updateSession(id, updateData);
      
      if (!updatedSession) {
        return res.status(404).json({ 
          success: false, 
          message: `Session de cotisations avec l'ID ${id} non trouvée` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'update',
        user_id: userId,
        target_id: id,
        target_type: 'monthly_contribution_session',
        details: { updateData }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Session de cotisations mise à jour avec succès', 
        data: updatedSession 
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la session de cotisations:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour de la session de cotisations',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Supprimer une session de cotisations mensuelles
   */
  async deleteSession(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const deleted = await monthlyContributionModel.deleteSession(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false, 
          message: `Session de cotisations avec l'ID ${id} non trouvée` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'delete',
        user_id: userId,
        target_id: id,
        target_type: 'monthly_contribution_session',
        details: {}
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Session de cotisations supprimée avec succès'
      });
    } catch (error) {
      console.error(`Erreur lors de la suppression de la session de cotisations:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression de la session de cotisations',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Récupérer toutes les assignations pour une session
   */
  async getAssignmentsBySessionId(req: Request, res: Response): Promise<Response> {
    try {
      const { sessionId } = req.params;
      
      // Vérifier si la session existe
      const session = await monthlyContributionModel.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ 
          success: false, 
          message: `Session de cotisations avec l'ID ${sessionId} non trouvée` 
        });
      }
      
      const assignments = await monthlyContributionModel.getAssignmentsBySessionId(sessionId);
      
      return res.status(200).json({ success: true, data: assignments });
    } catch (error) {
      console.error(`Erreur lors de la récupération des assignations:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des assignations',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Créer une nouvelle assignation de cotisation mensuelle
   */
  async createAssignment(req: Request, res: Response): Promise<Response> {
    try {
      const { session_id, user_id, monthly_amount } = req.body;
      
      // Validation de base
      if (!session_id || !user_id || monthly_amount === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tous les champs requis doivent être fournis' 
        });
      }
      
      // Vérifier si la session existe
      const session = await monthlyContributionModel.getSessionById(session_id);
      
      if (!session) {
        return res.status(404).json({ 
          success: false, 
          message: `Session de cotisations avec l'ID ${session_id} non trouvée` 
        });
      }
      
      const assignmentData = {
        session_id,
        user_id,
        monthly_amount: Number(monthly_amount)
      };
      
      const newAssignment = await monthlyContributionModel.createAssignment(assignmentData);
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'create',
        user_id: userId,
        target_id: newAssignment.id,
        target_type: 'monthly_contribution_assignment',
        details: { assignmentData }
      });
      
      return res.status(201).json({ 
        success: true, 
        message: 'Assignation de cotisation créée avec succès', 
        data: newAssignment 
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'assignation de cotisation:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création de l\'assignation de cotisation',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mettre à jour une assignation de cotisation mensuelle
   */
  async updateAssignment(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Validation de base
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Aucune donnée fournie pour la mise à jour' 
        });
      }
      
      // Convertir les valeurs numériques
      if (updateData.monthly_amount) {
        updateData.monthly_amount = Number(updateData.monthly_amount);
      }
      
      const updatedAssignment = await monthlyContributionModel.updateAssignment(id, updateData);
      
      if (!updatedAssignment) {
        return res.status(404).json({ 
          success: false, 
          message: `Assignation de cotisation avec l'ID ${id} non trouvée` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'update',
        user_id: userId,
        target_id: id,
        target_type: 'monthly_contribution_assignment',
        details: { updateData }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Assignation de cotisation mise à jour avec succès', 
        data: updatedAssignment 
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'assignation de cotisation:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour de l\'assignation de cotisation',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Supprimer une assignation de cotisation mensuelle
   */
  async deleteAssignment(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const deleted = await monthlyContributionModel.deleteAssignment(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false, 
          message: `Assignation de cotisation avec l'ID ${id} non trouvée` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'delete',
        user_id: userId,
        target_id: id,
        target_type: 'monthly_contribution_assignment',
        details: {}
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Assignation de cotisation supprimée avec succès'
      });
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'assignation de cotisation:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression de l\'assignation de cotisation',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export default new MonthlyContributionController();
