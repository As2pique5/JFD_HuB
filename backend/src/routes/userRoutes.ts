import express from 'express';
import { Request, Response, NextFunction } from 'express';
import userModel from '../models/userModel';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Toutes les routes utilisateurs nécessitent une authentification
router.use(authenticate as express.RequestHandler);

// Routes accessibles aux super_admin et intermediate
router.get('/', authorize(['super_admin', 'intermediate']) as express.RequestHandler, (async (req: Request, res: Response) => {
  try {
    const users = await userModel.findAll();
    return res.status(200).json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}) as unknown as express.RequestHandler);

router.post('/', authorize(['super_admin', 'intermediate']) as express.RequestHandler, (async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    
    // Vérifier les données requises
    if (!userData.email || !userData.password || !userData.name || !userData.role) {
      return res.status(400).json({ message: 'Données manquantes' });
    }
    
    // Vérifier si l'email existe déjà
    const existingUser = await userModel.findByEmail(userData.email);
    if (existingUser) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }
    
    // Créer l'utilisateur
    const newUser = await userModel.create(userData);
    
    // Renvoyer l'utilisateur créé (sans le mot de passe)
    return res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      created_at: newUser.created_at
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}) as unknown as express.RequestHandler);

// Routes accessibles à tous les utilisateurs authentifiés pour leur propre profil
router.get('/:id', (async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const requestingUserId = (req as any).user.id;
    const requestingUserRole = (req as any).user.role;
    
    // Vérifier si l'utilisateur demande son propre profil ou s'il a les droits nécessaires
    if (userId !== requestingUserId && !['super_admin', 'intermediate'].includes(requestingUserRole)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
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
}) as unknown as express.RequestHandler);

// Routes accessibles uniquement aux super_admin
router.put('/:id', authorize(['super_admin']) as express.RequestHandler, (async (req: Request, res: Response) => {
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
    
    // Renvoyer l'utilisateur mis à jour
    return res.status(200).json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      birth_date: updatedUser.birth_date,
      address: updatedUser.address,
      bio: updatedUser.bio,
      avatar_url: updatedUser.avatar_url,
      status: updatedUser.status,
      created_at: updatedUser.created_at
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}) as unknown as express.RequestHandler);

router.patch('/:id/status', authorize(['super_admin']) as express.RequestHandler, (async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;
    
    // Vérifier si le statut est valide
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }
    
    // Vérifier si l'utilisateur existe
    const existingUser = await userModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Mettre à jour le statut de l'utilisateur
    const updatedUser = await userModel.update(userId, { status });
    
    return res.status(200).json({
      id: updatedUser.id,
      name: updatedUser.name,
      status: updatedUser.status
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de l\'utilisateur:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}) as unknown as express.RequestHandler);

router.delete('/:id', authorize(['super_admin']) as express.RequestHandler, (async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const requestingUserId = (req as any).user.id;
    
    // Empêcher la suppression de son propre compte
    if (userId === requestingUserId) {
      return res.status(403).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    
    // Vérifier si l'utilisateur existe
    const existingUser = await userModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Supprimer l'utilisateur
    await userModel.delete(userId);
    
    return res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}) as unknown as express.RequestHandler);

export default router;
