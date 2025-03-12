import { Request, Response } from 'express';
import userModel, { UserInput } from '../models/userModel';
import { logAuditEvent } from '../utils/audit';

class UserController {
  /**
   * Récupérer tous les utilisateurs avec filtres optionnels
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const { role, status, search } = req.query;
      
      const filters = {
        role: role as string,
        status: status as string,
        search: search as string
      };
      
      const users = await userModel.findAll(filters);
      
      // Supprimer les mots de passe des résultats
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user as any;
        return safeUser;
      });
      
      return res.status(200).json(safeUsers);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
  
  /**
   * Récupérer un utilisateur par son ID
   */
  async getUserById(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      
      const user = await userModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Supprimer le mot de passe des résultats
      const { password, ...safeUser } = user as any;
      
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
  
  /**
   * Créer un nouvel utilisateur
   */
  async createUser(req: Request, res: Response) {
    try {
      const userData: UserInput = req.body;
      
      // Vérifier que les champs requis sont présents
      if (!userData.email || !userData.password || !userData.name || !userData.role) {
        return res.status(400).json({ message: 'Champs obligatoires manquants' });
      }
      
      // Créer l'utilisateur
      const newUser = await userModel.create(userData);
      
      // Enregistrer l'événement d'audit
      const currentUserId = (req as any).user.id;
      await logAuditEvent('user_create', currentUserId, newUser.id, { email: newUser.email }, 'user');
      
      // Supprimer le mot de passe des résultats
      const { password, ...safeUser } = newUser as any;
      
      return res.status(201).json({
        message: 'Utilisateur créé avec succès',
        user: safeUser
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      
      if ((error as Error).message === 'Un utilisateur avec cet email existe déjà') {
        return res.status(409).json({ message: (error as Error).message });
      }
      
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
  
  /**
   * Mettre à jour un utilisateur existant
   */
  async updateUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const userData = req.body;
      
      // Vérifier si l'utilisateur existe
      const existingUser = await userModel.findById(userId);
      
      if (!existingUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Mettre à jour l'utilisateur
      const updatedUser = await userModel.update(userId, userData);
      
      // Enregistrer l'événement d'audit
      const currentUserId = (req as any).user.id;
      await logAuditEvent('user_update', currentUserId, userId, userData, 'user');
      
      // Supprimer le mot de passe des résultats
      const { password, ...safeUser } = updatedUser as any;
      
      return res.status(200).json({
        message: 'Utilisateur mis à jour avec succès',
        user: safeUser
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
  
  /**
   * Mettre à jour le statut d'un utilisateur
   */
  async updateUserStatus(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const { status } = req.body;
      
      // Vérifier que le statut est valide
      if (status !== 'active' && status !== 'inactive') {
        return res.status(400).json({ message: 'Statut invalide' });
      }
      
      // Vérifier si l'utilisateur existe
      const existingUser = await userModel.findById(userId);
      
      if (!existingUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Mettre à jour le statut
      const updatedUser = await userModel.updateStatus(userId, status);
      
      // Enregistrer l'événement d'audit
      const currentUserId = (req as any).user.id;
      await logAuditEvent('user_status_update', currentUserId, userId, { status }, 'user');
      
      return res.status(200).json({
        message: 'Statut de l\'utilisateur mis à jour avec succès',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          status: updatedUser.status
        }
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de l\'utilisateur:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
  
  /**
   * Supprimer un utilisateur
   */
  async deleteUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      
      // Vérifier si l'utilisateur existe
      const existingUser = await userModel.findById(userId);
      
      if (!existingUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Supprimer l'utilisateur
      await userModel.delete(userId);
      
      // Enregistrer l'événement d'audit
      const currentUserId = (req as any).user.id;
      await logAuditEvent('user_delete', currentUserId, userId, { email: existingUser.email }, 'user');
      
      return res.status(200).json({
        message: 'Utilisateur supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

export default new UserController();
