import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import contributionController from '../controllers/contributionController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Configuration de multer pour le téléchargement des reçus
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    cb(null, path.join(__dirname, '../../', uploadDir, 'temp'));
  },
  filename: (req, file, cb) => {
    // Utiliser le nom original temporairement, il sera renommé dans le contrôleur
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    // Vérifier les types de fichiers autorisés pour les reçus
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé pour un reçu'));
    }
  }
});

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

// Routes pour les contributions
router.get('/', wrapController(contributionController.getAllContributions.bind(contributionController)));
router.get('/summary', wrapController(contributionController.getFinancialSummary.bind(contributionController)));
router.get('/monthly-summary', wrapController(contributionController.getMonthlyFinancialSummary.bind(contributionController)));
router.get('/yearly-summary', wrapController(contributionController.getYearlyFinancialSummary.bind(contributionController)));
router.get('/payment-methods', wrapController(contributionController.getPaymentMethodStats.bind(contributionController)));
router.get('/top-contributors', wrapController(contributionController.getTopContributors.bind(contributionController)));
router.get('/user/:userId', wrapController(contributionController.getContributionsByUserId.bind(contributionController)));
router.get('/user/:userId/summary', wrapController(contributionController.getUserFinancialSummary.bind(contributionController)));
router.get('/source/:sourceType/:sourceId?', wrapController(contributionController.getContributionsBySource.bind(contributionController)));
router.get('/:id', wrapController(contributionController.getContributionById.bind(contributionController)));
router.get('/:id/receipt', wrapController(contributionController.downloadReceipt.bind(contributionController)));

// Routes protégées par rôle
router.post('/', wrapAuthorize(['admin', 'treasurer']), upload.single('receipt'), wrapController(contributionController.createContribution.bind(contributionController)));
router.put('/:id', wrapAuthorize(['admin', 'treasurer']), upload.single('receipt'), wrapController(contributionController.updateContribution.bind(contributionController)));
router.delete('/:id', wrapAuthorize(['admin']), wrapController(contributionController.deleteContribution.bind(contributionController)));

export default router;
