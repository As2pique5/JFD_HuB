import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel';

// Clé secrète pour JWT
const JWT_SECRET = process.env.JWT_SECRET || 'jfdhub_secret_key';

/**
 * Interface pour les données décodées du token JWT
 */
interface DecodedToken {
  id: string;
  email: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * Middleware pour vérifier l'authentification de l'utilisateur
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentification requise' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    
    // Vérifier si l'utilisateur existe toujours et est actif
    const user = await userModel.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Compte désactivé' });
    }
    
    // Ajouter les informations de l'utilisateur à la requête
    (req as any).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    };
    
    next();
  } catch (error) {
    if ((error as any).name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expirée, veuillez vous reconnecter' });
    }
    
    console.error('Erreur d\'authentification:', error);
    return res.status(401).json({ message: 'Token invalide' });
  }
};

/**
 * Middleware pour vérifier les rôles autorisés
 * @param roles Tableau des rôles autorisés
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    next();
  };
};
