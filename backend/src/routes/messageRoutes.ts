import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import messageController from '../controllers/messageController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Configuration de multer pour le téléchargement des pièces jointes
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
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Vérifier les types de fichiers autorisés pour les pièces jointes
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé pour une pièce jointe'));
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

// Routes pour les messages
router.get('/inbox', wrapController(messageController.getReceivedMessages.bind(messageController)));
router.get('/sent', wrapController(messageController.getSentMessages.bind(messageController)));
router.get('/trash', wrapController(messageController.getDeletedMessages.bind(messageController)));
router.get('/unread-count', wrapController(messageController.countUnreadMessages.bind(messageController)));
router.get('/search', wrapController(messageController.searchMessages.bind(messageController)));
router.get('/thread/:id', wrapController(messageController.getMessageThread.bind(messageController)));
router.get('/:id', wrapController(messageController.getMessageById.bind(messageController)));
router.get('/:messageId/attachment/:attachmentId', wrapController(messageController.downloadAttachment.bind(messageController)));

router.post('/', upload.array('attachments', 5), wrapController(messageController.createMessage.bind(messageController)));
router.patch('/:id/read', wrapController(messageController.markAsRead.bind(messageController)));
router.patch('/:id/delete', wrapController(messageController.markAsDeleted.bind(messageController)));
router.patch('/:id/restore', wrapController(messageController.restoreMessage.bind(messageController)));

// Routes protégées par rôle
router.delete('/:id', wrapAuthorize(['admin']), wrapController(messageController.deleteMessage.bind(messageController)));

// Route pour les administrateurs uniquement
router.get('/', wrapAuthorize(['admin']), wrapController(messageController.getAllMessages.bind(messageController)));

export default router;
