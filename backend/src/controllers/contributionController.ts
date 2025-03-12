import { Request, Response } from 'express';
import contributionModel, { Contribution } from '../models/contributionModel';
import { createAuditLog } from '../utils/audit';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export class ContributionController {
  /**
   * Récupérer toutes les contributions
   */
  async getAllContributions(req: Request, res: Response): Promise<Response> {
    try {
      const contributions = await contributionModel.getAllContributions();
      return res.status(200).json(contributions);
    } catch (error) {
      console.error('Erreur lors de la récupération des contributions:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des contributions' });
    }
  }

  /**
   * Récupérer une contribution par son ID
   */
  async getContributionById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const contribution = await contributionModel.getContributionById(id);
      
      if (!contribution) {
        return res.status(404).json({ message: 'Contribution non trouvée' });
      }
      
      return res.status(200).json(contribution);
    } catch (error) {
      console.error(`Erreur lors de la récupération de la contribution ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération de la contribution' });
    }
  }

  /**
   * Récupérer les contributions d'un utilisateur
   */
  async getContributionsByUserId(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const contributions = await contributionModel.getContributionsByUserId(userId);
      return res.status(200).json(contributions);
    } catch (error) {
      console.error(`Erreur lors de la récupération des contributions de l'utilisateur ${req.params.userId}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des contributions de l\'utilisateur' });
    }
  }

  /**
   * Récupérer les contributions par source
   */
  async getContributionsBySource(req: Request, res: Response): Promise<Response> {
    try {
      const { sourceType, sourceId } = req.params;
      
      if (!['monthly', 'event', 'project', 'other'].includes(sourceType)) {
        return res.status(400).json({ message: 'Type de source invalide' });
      }
      
      const contributions = await contributionModel.getContributionsBySource(sourceType, sourceId);
      return res.status(200).json(contributions);
    } catch (error) {
      console.error(`Erreur lors de la récupération des contributions par source:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des contributions par source' });
    }
  }

  /**
   * Créer une nouvelle contribution
   */
  async createContribution(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const {
        user_id,
        amount,
        payment_date,
        payment_method,
        status,
        source_type,
        source_id,
        notes
      } = req.body;
      
      // Validation des données
      if (!user_id || !amount || !payment_date || !payment_method || !status || !source_type) {
        return res.status(400).json({ message: 'Données incomplètes pour la création de la contribution' });
      }
      
      // Vérifier que le montant est positif
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({ message: 'Le montant doit être supérieur à zéro' });
      }
      
      let receipt_url: string | undefined = undefined;
      
      // Traitement du reçu de paiement si présent
      if (req.file) {
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        const receiptDir = path.join(uploadDir, 'receipts');
        
        // Créer le dossier des reçus s'il n'existe pas
        if (!fs.existsSync(path.join(__dirname, '../../', receiptDir))) {
          fs.mkdirSync(path.join(__dirname, '../../', receiptDir), { recursive: true });
        }
        
        // Générer un nom de fichier unique
        const fileExtension = path.extname(req.file.originalname);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(receiptDir, uniqueFilename);
        
        // Déplacer le fichier téléchargé
        fs.renameSync(req.file.path, path.join(__dirname, '../../', filePath));
        
        receipt_url = filePath;
      }
      
      // Créer la contribution
      const newContribution = await contributionModel.createContribution({
        user_id,
        amount: parseFloat(amount),
        payment_date: new Date(payment_date),
        payment_method,
        status,
        source_type,
        source_id,
        notes,
        receipt_url
      });
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'create',
        target_type: 'contribution',
        target_id: newContribution.id,
        details: `Contribution de ${amount} ${payment_method} créée pour ${source_type}`
      });
      
      return res.status(201).json(newContribution);
    } catch (error) {
      console.error('Erreur lors de la création de la contribution:', error);
      return res.status(500).json({ message: 'Erreur lors de la création de la contribution' });
    }
  }

  /**
   * Mettre à jour une contribution
   */
  async updateContribution(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si la contribution existe
      const existingContribution = await contributionModel.getContributionById(id);
      if (!existingContribution) {
        return res.status(404).json({ message: 'Contribution non trouvée' });
      }
      
      const {
        amount,
        payment_date,
        payment_method,
        status,
        notes
      } = req.body;
      
      // Préparer les données à mettre à jour
      const updateData: Partial<Contribution> = {};
      
      if (amount !== undefined) {
        if (parseFloat(amount) <= 0) {
          return res.status(400).json({ message: 'Le montant doit être supérieur à zéro' });
        }
        updateData.amount = parseFloat(amount);
      }
      
      if (payment_date !== undefined) updateData.payment_date = new Date(payment_date);
      if (payment_method !== undefined) updateData.payment_method = payment_method;
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      
      // Traitement du reçu de paiement si présent
      if (req.file) {
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        const receiptDir = path.join(uploadDir, 'receipts');
        
        // Créer le dossier des reçus s'il n'existe pas
        if (!fs.existsSync(path.join(__dirname, '../../', receiptDir))) {
          fs.mkdirSync(path.join(__dirname, '../../', receiptDir), { recursive: true });
        }
        
        // Supprimer l'ancien reçu s'il existe
        if (existingContribution.receipt_url) {
          const oldFilePath = path.join(__dirname, '../../', existingContribution.receipt_url);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        
        // Générer un nom de fichier unique
        const fileExtension = path.extname(req.file.originalname);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(receiptDir, uniqueFilename);
        
        // Déplacer le fichier téléchargé
        fs.renameSync(req.file.path, path.join(__dirname, '../../', filePath));
        
        updateData.receipt_url = filePath;
      }
      
      // Mettre à jour la contribution
      const updatedContribution = await contributionModel.updateContribution(id, updateData);
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'update',
        target_type: 'contribution',
        target_id: id,
        details: `Contribution mise à jour: ${JSON.stringify(updateData)}`
      });
      
      return res.status(200).json(updatedContribution);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la contribution ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour de la contribution' });
    }
  }

  /**
   * Supprimer une contribution
   */
  async deleteContribution(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si la contribution existe
      const contribution = await contributionModel.getContributionById(id);
      if (!contribution) {
        return res.status(404).json({ message: 'Contribution non trouvée' });
      }
      
      // Supprimer le reçu de paiement s'il existe
      if (contribution.receipt_url) {
        const filePath = path.join(__dirname, '../../', contribution.receipt_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Supprimer la contribution
      const deleted = await contributionModel.deleteContribution(id);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Erreur lors de la suppression de la contribution' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'delete',
        target_type: 'contribution',
        target_id: id,
        details: `Contribution de ${contribution.amount} ${contribution.payment_method} supprimée`
      });
      
      return res.status(200).json({ message: 'Contribution supprimée avec succès' });
    } catch (error) {
      console.error(`Erreur lors de la suppression de la contribution ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la suppression de la contribution' });
    }
  }

  /**
   * Télécharger le reçu d'une contribution
   */
  async downloadReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Récupérer les informations de la contribution
      const contribution = await contributionModel.getContributionById(id);
      if (!contribution) {
        res.status(404).json({ message: 'Contribution non trouvée' });
        return;
      }
      
      // Vérifier si un reçu est disponible
      if (!contribution.receipt_url) {
        res.status(404).json({ message: 'Aucun reçu disponible pour cette contribution' });
        return;
      }
      
      // Chemin complet du fichier
      const filePath = path.join(__dirname, '../../', contribution.receipt_url);
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ message: 'Fichier de reçu non trouvé sur le serveur' });
        return;
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'download',
        target_type: 'contribution_receipt',
        target_id: id,
        details: `Reçu de contribution téléchargé par l'utilisateur`
      });
      
      // Envoyer le fichier au client
      res.download(filePath, `recu-${id}${path.extname(contribution.receipt_url)}`, (err) => {
        if (err) {
          console.error('Erreur lors du téléchargement du reçu:', err);
          res.status(500).json({ message: 'Erreur lors du téléchargement du reçu' });
        }
      });
    } catch (error) {
      console.error(`Erreur lors du téléchargement du reçu de la contribution ${req.params.id}:`, error);
      res.status(500).json({ message: 'Erreur lors du téléchargement du reçu' });
    }
  }

  /**
   * Obtenir un résumé financier global
   */
  async getFinancialSummary(req: Request, res: Response): Promise<Response> {
    try {
      const summary = await contributionModel.getFinancialSummary();
      return res.status(200).json(summary);
    } catch (error) {
      console.error('Erreur lors de la récupération du résumé financier:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du résumé financier' });
    }
  }

  /**
   * Obtenir un résumé financier pour un utilisateur spécifique
   */
  async getUserFinancialSummary(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const summary = await contributionModel.getUserFinancialSummary(userId);
      return res.status(200).json(summary);
    } catch (error) {
      console.error(`Erreur lors de la récupération du résumé financier de l'utilisateur ${req.params.userId}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du résumé financier de l\'utilisateur' });
    }
  }

  /**
   * Obtenir un résumé financier par mois
   */
  async getMonthlyFinancialSummary(req: Request, res: Response): Promise<Response> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const summary = await contributionModel.getMonthlyFinancialSummary(year);
      return res.status(200).json(summary);
    } catch (error) {
      console.error('Erreur lors de la récupération du résumé financier mensuel:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du résumé financier mensuel' });
    }
  }

  /**
   * Obtenir un résumé financier par année
   */
  async getYearlyFinancialSummary(req: Request, res: Response): Promise<Response> {
    try {
      const summary = await contributionModel.getYearlyFinancialSummary();
      return res.status(200).json(summary);
    } catch (error) {
      console.error('Erreur lors de la récupération du résumé financier annuel:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du résumé financier annuel' });
    }
  }

  /**
   * Obtenir les statistiques de paiement par méthode
   */
  async getPaymentMethodStats(req: Request, res: Response): Promise<Response> {
    try {
      const stats = await contributionModel.getPaymentMethodStats();
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de méthode de paiement:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des statistiques de méthode de paiement' });
    }
  }

  /**
   * Obtenir les top contributeurs
   */
  async getTopContributors(req: Request, res: Response): Promise<Response> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const contributors = await contributionModel.getTopContributors(limit);
      return res.status(200).json(contributors);
    } catch (error) {
      console.error('Erreur lors de la récupération des top contributeurs:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des top contributeurs' });
    }
  }
}

export default new ContributionController();
