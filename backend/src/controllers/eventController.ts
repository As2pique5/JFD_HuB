import { Request, Response } from 'express';
import eventModel from '../models/eventModel';
import { createAuditLog } from '../utils/audit';

/**
 * Contrôleur pour la gestion des événements familiaux
 */
class EventController {
  /**
   * Récupérer tous les événements
   */
  async getAllEvents(req: Request, res: Response): Promise<Response> {
    try {
      const events = await eventModel.getAllEvents();
      return res.status(200).json({ success: true, data: events });
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des événements',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Récupérer un événement par son ID
   */
  async getEventById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const event = await eventModel.getEventById(id);
      
      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: `Événement avec l'ID ${id} non trouvé` 
        });
      }
      
      return res.status(200).json({ success: true, data: event });
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'événement:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération de l\'événement',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Créer un nouvel événement
   */
  async createEvent(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        name, 
        description, 
        location, 
        start_date, 
        end_date, 
        target_amount, 
        status 
      } = req.body;
      
      // Validation de base
      if (!name || !start_date || !status) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tous les champs requis doivent être fournis' 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      const eventData = {
        name,
        description,
        location,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : undefined,
        target_amount: target_amount ? Number(target_amount) : undefined,
        status,
        created_by: userId
      };
      
      const newEvent = await eventModel.createEvent(eventData);
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'create',
        user_id: userId,
        target_id: newEvent.id,
        target_type: 'event',
        details: { eventData }
      });
      
      return res.status(201).json({ 
        success: true, 
        message: 'Événement créé avec succès', 
        data: newEvent 
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création de l\'événement',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mettre à jour un événement
   */
  async updateEvent(req: Request, res: Response): Promise<Response> {
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
      
      // Convertir les valeurs
      if (updateData.start_date) {
        updateData.start_date = new Date(updateData.start_date);
      }
      
      if (updateData.end_date) {
        updateData.end_date = new Date(updateData.end_date);
      }
      
      if (updateData.target_amount) {
        updateData.target_amount = Number(updateData.target_amount);
      }
      
      const updatedEvent = await eventModel.updateEvent(id, updateData);
      
      if (!updatedEvent) {
        return res.status(404).json({ 
          success: false, 
          message: `Événement avec l'ID ${id} non trouvé` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'update',
        user_id: userId,
        target_id: id,
        target_type: 'event',
        details: { updateData }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Événement mis à jour avec succès', 
        data: updatedEvent 
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'événement:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour de l\'événement',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Supprimer un événement
   */
  async deleteEvent(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const deleted = await eventModel.deleteEvent(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false, 
          message: `Événement avec l'ID ${id} non trouvé` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'delete',
        user_id: userId,
        target_id: id,
        target_type: 'event',
        details: {}
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Événement supprimé avec succès'
      });
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'événement:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression de l\'événement',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Récupérer tous les participants d'un événement
   */
  async getEventParticipants(req: Request, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;
      
      // Vérifier si l'événement existe
      const event = await eventModel.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: `Événement avec l'ID ${eventId} non trouvé` 
        });
      }
      
      const participants = await eventModel.getEventParticipants(eventId);
      
      return res.status(200).json({ success: true, data: participants });
    } catch (error) {
      console.error(`Erreur lors de la récupération des participants:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des participants',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Ajouter un participant à un événement
   */
  async addParticipant(req: Request, res: Response): Promise<Response> {
    try {
      const { event_id, user_id, status } = req.body;
      
      // Validation de base
      if (!event_id || !user_id || !status) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tous les champs requis doivent être fournis' 
        });
      }
      
      // Vérifier si l'événement existe
      const event = await eventModel.getEventById(event_id);
      
      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: `Événement avec l'ID ${event_id} non trouvé` 
        });
      }
      
      const participantData = {
        event_id,
        user_id,
        status
      };
      
      const newParticipant = await eventModel.addParticipant(participantData);
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'create',
        user_id: userId,
        target_id: newParticipant.id,
        target_type: 'event_participant',
        details: { participantData }
      });
      
      return res.status(201).json({ 
        success: true, 
        message: 'Participant ajouté avec succès', 
        data: newParticipant 
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du participant:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de l\'ajout du participant',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mettre à jour le statut d'un participant
   */
  async updateParticipantStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Validation de base
      if (!status) {
        return res.status(400).json({ 
          success: false, 
          message: 'Le statut doit être fourni' 
        });
      }
      
      const updatedParticipant = await eventModel.updateParticipantStatus(id, status);
      
      if (!updatedParticipant) {
        return res.status(404).json({ 
          success: false, 
          message: `Participant avec l'ID ${id} non trouvé` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'update',
        user_id: userId,
        target_id: id,
        target_type: 'event_participant',
        details: { status }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Statut du participant mis à jour avec succès', 
        data: updatedParticipant 
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du statut du participant:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour du statut du participant',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Supprimer un participant d'un événement
   */
  async removeParticipant(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const deleted = await eventModel.removeParticipant(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false, 
          message: `Participant avec l'ID ${id} non trouvé` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'delete',
        user_id: userId,
        target_id: id,
        target_type: 'event_participant',
        details: {}
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Participant supprimé avec succès'
      });
    } catch (error) {
      console.error(`Erreur lors de la suppression du participant:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression du participant',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Récupérer toutes les contributions d'un événement
   */
  async getEventContributions(req: Request, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;
      
      // Vérifier si l'événement existe
      const event = await eventModel.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: `Événement avec l'ID ${eventId} non trouvé` 
        });
      }
      
      const contributions = await eventModel.getEventContributions(eventId);
      
      return res.status(200).json({ success: true, data: contributions });
    } catch (error) {
      console.error(`Erreur lors de la récupération des contributions:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des contributions',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Ajouter une contribution à un événement
   */
  async addContribution(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        event_id, 
        user_id, 
        amount, 
        payment_date, 
        payment_method, 
        status, 
        notes 
      } = req.body;
      
      // Validation de base
      if (!event_id || !user_id || !amount || !payment_date || !payment_method || !status) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tous les champs requis doivent être fournis' 
        });
      }
      
      // Vérifier si l'événement existe
      const event = await eventModel.getEventById(event_id);
      
      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: `Événement avec l'ID ${event_id} non trouvé` 
        });
      }
      
      const contributionData = {
        event_id,
        user_id,
        amount: Number(amount),
        payment_date: new Date(payment_date),
        payment_method,
        status,
        notes
      };
      
      const newContribution = await eventModel.addContribution(contributionData);
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'create',
        user_id: userId,
        target_id: newContribution.id,
        target_type: 'event_contribution',
        details: { contributionData }
      });
      
      return res.status(201).json({ 
        success: true, 
        message: 'Contribution ajoutée avec succès', 
        data: newContribution 
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la contribution:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de l\'ajout de la contribution',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mettre à jour une contribution
   */
  async updateContribution(req: Request, res: Response): Promise<Response> {
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
      
      // Convertir les valeurs
      if (updateData.amount) {
        updateData.amount = Number(updateData.amount);
      }
      
      if (updateData.payment_date) {
        updateData.payment_date = new Date(updateData.payment_date);
      }
      
      const updatedContribution = await eventModel.updateContribution(id, updateData);
      
      if (!updatedContribution) {
        return res.status(404).json({ 
          success: false, 
          message: `Contribution avec l'ID ${id} non trouvée` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'update',
        user_id: userId,
        target_id: id,
        target_type: 'event_contribution',
        details: { updateData }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Contribution mise à jour avec succès', 
        data: updatedContribution 
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la contribution:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour de la contribution',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Supprimer une contribution
   */
  async deleteContribution(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const deleted = await eventModel.deleteContribution(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false, 
          message: `Contribution avec l'ID ${id} non trouvée` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'delete',
        user_id: userId,
        target_id: id,
        target_type: 'event_contribution',
        details: {}
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Contribution supprimée avec succès'
      });
    } catch (error) {
      console.error(`Erreur lors de la suppression de la contribution:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression de la contribution',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Récupérer toutes les assignations de contributions d'un événement
   */
  async getContributionAssignments(req: Request, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;
      
      // Vérifier si l'événement existe
      const event = await eventModel.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: `Événement avec l'ID ${eventId} non trouvé` 
        });
      }
      
      const assignments = await eventModel.getContributionAssignments(eventId);
      
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
   * Créer une assignation de contribution
   */
  async createAssignment(req: Request, res: Response): Promise<Response> {
    try {
      const { event_id, user_id, amount, due_date } = req.body;
      
      // Validation de base
      if (!event_id || !user_id || !amount) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tous les champs requis doivent être fournis' 
        });
      }
      
      // Vérifier si l'événement existe
      const event = await eventModel.getEventById(event_id);
      
      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: `Événement avec l'ID ${event_id} non trouvé` 
        });
      }
      
      const assignmentData = {
        event_id,
        user_id,
        amount: Number(amount),
        due_date: due_date ? new Date(due_date) : undefined
      };
      
      const newAssignment = await eventModel.createAssignment(assignmentData);
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'create',
        user_id: userId,
        target_id: newAssignment.id,
        target_type: 'event_contribution_assignment',
        details: { assignmentData }
      });
      
      return res.status(201).json({ 
        success: true, 
        message: 'Assignation créée avec succès', 
        data: newAssignment 
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'assignation:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création de l\'assignation',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mettre à jour une assignation de contribution
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
      
      // Convertir les valeurs
      if (updateData.amount) {
        updateData.amount = Number(updateData.amount);
      }
      
      if (updateData.due_date) {
        updateData.due_date = new Date(updateData.due_date);
      }
      
      const updatedAssignment = await eventModel.updateAssignment(id, updateData);
      
      if (!updatedAssignment) {
        return res.status(404).json({ 
          success: false, 
          message: `Assignation avec l'ID ${id} non trouvée` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'update',
        user_id: userId,
        target_id: id,
        target_type: 'event_contribution_assignment',
        details: { updateData }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Assignation mise à jour avec succès', 
        data: updatedAssignment 
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'assignation:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour de l\'assignation',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Supprimer une assignation de contribution
   */
  async deleteAssignment(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const deleted = await eventModel.deleteAssignment(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false, 
          message: `Assignation avec l'ID ${id} non trouvée` 
        });
      }
      
      // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
      const userId = (req as any).user?.id;
      
      // Créer un log d'audit
      await createAuditLog({
        action: 'delete',
        user_id: userId,
        target_id: id,
        target_type: 'event_contribution_assignment',
        details: {}
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Assignation supprimée avec succès'
      });
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'assignation:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression de l\'assignation',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export default new EventController();
