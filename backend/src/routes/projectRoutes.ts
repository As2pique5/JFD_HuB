import express, { Request, Response, NextFunction } from 'express';
import { ProjectController } from '../controllers/projectController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();
const projectController = new ProjectController();

// Fonction helper pour convertir nos middlewares en RequestHandler d'Express
const wrapMiddleware = (middleware: Function): express.RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(middleware(req, res, next)).catch(next);
  };
};

// Fonction helper pour convertir nos contrôleurs en RequestHandler d'Express
const wrapController = (controller: Function): express.RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(controller(req, res)).catch(next);
  };
};

// Fonction helper pour l'autorisation
const wrapAuthorize = (roles: string[]): express.RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(authorize(roles)(req, res, next)).catch(next);
  };
};

// Appliquer le middleware d'authentification à toutes les routes
router.use(wrapMiddleware(authenticate));

// Routes pour les projets
router.get('/', wrapController(projectController.getAllProjects.bind(projectController)));
router.get('/:id', wrapController(projectController.getProjectById.bind(projectController)));
router.post('/', wrapAuthorize(['admin', 'manager']), wrapController(projectController.createProject.bind(projectController)));
router.put('/:id', wrapAuthorize(['admin', 'manager']), wrapController(projectController.updateProject.bind(projectController)));
router.delete('/:id', wrapAuthorize(['admin']), wrapController(projectController.deleteProject.bind(projectController)));

// Routes pour les phases de projet
router.get('/:projectId/phases', wrapController(projectController.getProjectPhases.bind(projectController)));
router.post('/:projectId/phases', wrapAuthorize(['admin', 'manager']), wrapController(projectController.createPhase.bind(projectController)));
router.put('/phases/:id', wrapAuthorize(['admin', 'manager']), wrapController(projectController.updatePhase.bind(projectController)));
router.delete('/phases/:id', wrapAuthorize(['admin', 'manager']), wrapController(projectController.deletePhase.bind(projectController)));

// Routes pour les participants au projet
router.get('/:projectId/participants', wrapController(projectController.getProjectParticipants.bind(projectController)));
router.post('/:projectId/participants', wrapAuthorize(['admin', 'manager']), wrapController(projectController.addParticipant.bind(projectController)));
router.put('/participants/:id', wrapAuthorize(['admin', 'manager']), wrapController(projectController.addParticipant.bind(projectController))); // Utiliser addParticipant en attendant d'implémenter updateParticipant
router.delete('/participants/:id', wrapAuthorize(['admin', 'manager']), wrapController(projectController.removeParticipant.bind(projectController)));

// Routes pour les contributions au projet
router.get('/:projectId/contributions', wrapController(projectController.getProjectContributions.bind(projectController)));
router.post('/contributions', wrapAuthorize(['admin', 'manager', 'member']), wrapController(projectController.addContribution.bind(projectController)));
router.put('/contributions/:id', wrapAuthorize(['admin', 'manager']), wrapController(projectController.updateContribution.bind(projectController)));
router.delete('/contributions/:id', wrapAuthorize(['admin']), wrapController(projectController.deleteContribution.bind(projectController)));

// Routes pour les assignations de contributions
router.get('/:projectId/assignments', wrapController(projectController.getContributionAssignments.bind(projectController)));
router.post('/assignments', wrapAuthorize(['admin', 'manager']), wrapController(projectController.createAssignment.bind(projectController)));
router.put('/assignments/:id', wrapAuthorize(['admin', 'manager']), wrapController(projectController.updateAssignment.bind(projectController)));
router.delete('/assignments/:id', wrapAuthorize(['admin', 'manager']), wrapController(projectController.deleteAssignment.bind(projectController)));

export default router;
