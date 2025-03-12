import express, { Router, Request, Response, NextFunction } from 'express';
import monthlyContributionController from '../controllers/monthlyContributionController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router: Router = express.Router();

/**
 * @route   GET /api/monthly-contributions
 * @desc    Récupérer toutes les sessions de cotisations mensuelles
 * @access  Privé
 */
router.get(
  '/',
  authenticate as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    monthlyContributionController.getAllSessions(req, res)
      .catch(next);
  }
);

/**
 * @route   GET /api/monthly-contributions/:id
 * @desc    Récupérer une session de cotisations mensuelles par son ID
 * @access  Privé
 */
router.get(
  '/:id',
  authenticate as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    monthlyContributionController.getSessionById(req, res)
      .catch(next);
  }
);

/**
 * @route   POST /api/monthly-contributions
 * @desc    Créer une nouvelle session de cotisations mensuelles
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post(
  '/',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    monthlyContributionController.createSession(req, res)
      .catch(next);
  }
);

/**
 * @route   PUT /api/monthly-contributions/:id
 * @desc    Mettre à jour une session de cotisations mensuelles
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put(
  '/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    monthlyContributionController.updateSession(req, res)
      .catch(next);
  }
);

/**
 * @route   DELETE /api/monthly-contributions/:id
 * @desc    Supprimer une session de cotisations mensuelles
 * @access  Privé (Admin uniquement)
 */
router.delete(
  '/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    monthlyContributionController.deleteSession(req, res)
      .catch(next);
  }
);

/**
 * @route   GET /api/monthly-contributions/:sessionId/assignments
 * @desc    Récupérer toutes les assignations pour une session
 * @access  Privé
 */
router.get(
  '/:sessionId/assignments',
  authenticate as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    monthlyContributionController.getAssignmentsBySessionId(req, res)
      .catch(next);
  }
);

/**
 * @route   POST /api/monthly-contributions/assignments
 * @desc    Créer une nouvelle assignation de cotisation mensuelle
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post(
  '/assignments',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    monthlyContributionController.createAssignment(req, res)
      .catch(next);
  }
);

/**
 * @route   PUT /api/monthly-contributions/assignments/:id
 * @desc    Mettre à jour une assignation de cotisation mensuelle
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put(
  '/assignments/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    monthlyContributionController.updateAssignment(req, res)
      .catch(next);
  }
);

/**
 * @route   DELETE /api/monthly-contributions/assignments/:id
 * @desc    Supprimer une assignation de cotisation mensuelle
 * @access  Privé (Admin uniquement)
 */
router.delete(
  '/assignments/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    monthlyContributionController.deleteAssignment(req, res)
      .catch(next);
  }
);

export default router;
