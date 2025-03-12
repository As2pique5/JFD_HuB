import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import winston from 'winston';

// Création d'un logger simple pour ce module
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Middleware pour vérifier si l'utilisateur a les rôles requis
 * @param roles Tableau des rôles autorisés
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      // Vérifier si l'utilisateur est authentifié
      if (!authReq.user) {
        res.status(401).json({ message: 'Authentification requise' });
        return;
      }
      
      // Vérifier si l'utilisateur a un des rôles requis
      if (roles.length > 0 && !roles.includes(authReq.user.role)) {
        logger.warn(`Accès refusé: L'utilisateur ${authReq.user.id} avec le rôle ${authReq.user.role} a tenté d'accéder à une ressource protégée`);
        res.status(403).json({ message: 'Accès refusé: Vous n\'avez pas les autorisations nécessaires' });
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Erreur d\'autorisation:', error);
      res.status(500).json({ message: 'Erreur lors de la vérification des autorisations' });
    }
  };
};
