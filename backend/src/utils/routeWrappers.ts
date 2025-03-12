import express, { Request, Response, NextFunction } from 'express';
import { authorize } from '../middleware/authorize';

/**
 * Wrapper pour les middlewares
 */
export const wrapMiddleware = (middleware: Function): express.RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(middleware(req, res, next)).catch(next);
  };
};

/**
 * Wrapper pour les méthodes du contrôleur
 */
export const wrapController = (controller: Function): express.RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(controller(req, res)).catch(next);
  };
};

/**
 * Wrapper spécifique pour le middleware d'autorisation
 */
export const wrapAuthorize = (roles: string[]): express.RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(authorize(roles)(req, res, next)).catch(next);
  };
};
