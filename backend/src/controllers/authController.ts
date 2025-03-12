import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel';

// Clé secrète pour JWT
const JWT_SECRET = process.env.JWT_SECRET || 'jfdhub_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthController {
  /**
   * Connexion d'un utilisateur
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;
      
      // Vérifier que les champs requis sont présents
      if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe requis' });
      }
      
      // Vérifier les identifiants
      const user = await userModel.verifyCredentials(email, password);
      
      if (!user) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }
      
      // Vérifier si l'utilisateur est actif
      if (user.status !== 'active') {
        return res.status(403).json({ message: 'Compte désactivé. Contactez un administrateur.' });
      }
      
      // Générer un token JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          name: user.name
        },
        JWT_SECRET
      );
      
      // Renvoyer le token et les informations de l'utilisateur
      return res.status(200).json({
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        }
      });
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
  }
  
  /**
   * Récupération des informations de l'utilisateur connecté
   */
  async getCurrentUser(req: Request, res: Response): Promise<Response> {
    try {
      // L'ID de l'utilisateur est extrait du token JWT par le middleware d'authentification
      const userId = (req as any).user.id;
      
      const user = await userModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Renvoyer les informations de l'utilisateur (sans le mot de passe)
      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        birth_date: user.birth_date,
        address: user.address,
        bio: user.bio,
        avatar_url: user.avatar_url,
        status: user.status,
        created_at: user.created_at
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
  
  /**
   * Déconnexion (côté serveur, invalidation du token n'est pas nécessaire)
   * Le client devra supprimer le token de son stockage
   */
  async logout(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      
      return res.status(200).json({ message: 'Déconnexion réussie' });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
  
  /**
   * Changement de mot de passe
   */
  async changePassword(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;
      
      // Vérifier que les champs requis sont présents
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis' });
      }
      
      // Récupérer l'utilisateur
      const user = await userModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Vérifier le mot de passe actuel
      const isValid = await userModel.verifyCredentials(user.email, currentPassword);
      
      if (!isValid) {
        return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
      }
      
      // Mettre à jour le mot de passe
      await userModel.update(userId, { password: newPassword });
      
      // Note: Nous implémenterons la journalisation des audits plus tard
      
      return res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

export default new AuthController();
