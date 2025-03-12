import express, { Router, Request, Response, NextFunction } from 'express';
import eventController from '../controllers/eventController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router: Router = express.Router();

/**
 * @route   GET /api/events
 * @desc    Récupérer tous les événements
 * @access  Privé
 */
router.get(
  '/',
  authenticate as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.getAllEvents(req, res)
      .catch(next);
  }
);

/**
 * @route   GET /api/events/:id
 * @desc    Récupérer un événement par son ID
 * @access  Privé
 */
router.get(
  '/:id',
  authenticate as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.getEventById(req, res)
      .catch(next);
  }
);

/**
 * @route   POST /api/events
 * @desc    Créer un nouvel événement
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post(
  '/',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.createEvent(req, res)
      .catch(next);
  }
);

/**
 * @route   PUT /api/events/:id
 * @desc    Mettre à jour un événement
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put(
  '/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.updateEvent(req, res)
      .catch(next);
  }
);

/**
 * @route   DELETE /api/events/:id
 * @desc    Supprimer un événement
 * @access  Privé (Admin uniquement)
 */
router.delete(
  '/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.deleteEvent(req, res)
      .catch(next);
  }
);

/**
 * @route   GET /api/events/:eventId/participants
 * @desc    Récupérer tous les participants d'un événement
 * @access  Privé
 */
router.get(
  '/:eventId/participants',
  authenticate as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.getEventParticipants(req, res)
      .catch(next);
  }
);

/**
 * @route   POST /api/events/participants
 * @desc    Ajouter un participant à un événement
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post(
  '/participants',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.addParticipant(req, res)
      .catch(next);
  }
);

/**
 * @route   PUT /api/events/participants/:id
 * @desc    Mettre à jour le statut d'un participant
 * @access  Privé (Admin, Intermédiaire ou le participant lui-même)
 */
router.put(
  '/participants/:id',
  authenticate as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.updateParticipantStatus(req, res)
      .catch(next);
  }
);

/**
 * @route   DELETE /api/events/participants/:id
 * @desc    Supprimer un participant d'un événement
 * @access  Privé (Admin uniquement)
 */
router.delete(
  '/participants/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.removeParticipant(req, res)
      .catch(next);
  }
);

/**
 * @route   GET /api/events/:eventId/contributions
 * @desc    Récupérer toutes les contributions d'un événement
 * @access  Privé
 */
router.get(
  '/:eventId/contributions',
  authenticate as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.getEventContributions(req, res)
      .catch(next);
  }
);

/**
 * @route   POST /api/events/contributions
 * @desc    Ajouter une contribution à un événement
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post(
  '/contributions',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.addContribution(req, res)
      .catch(next);
  }
);

/**
 * @route   PUT /api/events/contributions/:id
 * @desc    Mettre à jour une contribution
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put(
  '/contributions/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.updateContribution(req, res)
      .catch(next);
  }
);

/**
 * @route   DELETE /api/events/contributions/:id
 * @desc    Supprimer une contribution
 * @access  Privé (Admin uniquement)
 */
router.delete(
  '/contributions/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.deleteContribution(req, res)
      .catch(next);
  }
);

/**
 * @route   GET /api/events/:eventId/assignments
 * @desc    Récupérer toutes les assignations de contributions d'un événement
 * @access  Privé
 */
router.get(
  '/:eventId/assignments',
  authenticate as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.getContributionAssignments(req, res)
      .catch(next);
  }
);

/**
 * @route   POST /api/events/assignments
 * @desc    Créer une assignation de contribution
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post(
  '/assignments',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.createAssignment(req, res)
      .catch(next);
  }
);

/**
 * @route   PUT /api/events/assignments/:id
 * @desc    Mettre à jour une assignation de contribution
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put(
  '/assignments/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin', 'intermediate']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.updateAssignment(req, res)
      .catch(next);
  }
);

/**
 * @route   DELETE /api/events/assignments/:id
 * @desc    Supprimer une assignation de contribution
 * @access  Privé (Admin uniquement)
 */
router.delete(
  '/assignments/:id',
  authenticate as express.RequestHandler,
  authorize(['super_admin']) as express.RequestHandler,
  (req: Request, res: Response, next: NextFunction) => {
    eventController.deleteAssignment(req, res)
      .catch(next);
  }
);

export default router;
