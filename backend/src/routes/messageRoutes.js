"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const messageController_1 = __importDefault(require("../controllers/messageController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Configuration de multer pour le téléchargement des pièces jointes
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        cb(null, path_1.default.join(__dirname, '../../', uploadDir, 'temp'));
    },
    filename: (req, file, cb) => {
        // Utiliser le nom original temporairement, il sera renommé dans le contrôleur
        cb(null, file.originalname);
    }
});
const upload = (0, multer_1.default)({
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
        }
        else {
            cb(new Error('Type de fichier non autorisé pour une pièce jointe'));
        }
    }
});
// Fonction helper pour convertir nos middlewares en RequestHandler d'Express
const wrapMiddleware = (middleware) => {
    return (req, res, next) => {
        Promise.resolve(middleware(req, res, next)).catch(next);
    };
};
// Fonction helper pour convertir nos contrôleurs en RequestHandler d'Express
const wrapController = (controller) => {
    return (req, res, next) => {
        Promise.resolve(controller(req, res)).catch(next);
    };
};
// Fonction helper pour l'autorisation
const wrapAuthorize = (roles) => {
    return (req, res, next) => {
        Promise.resolve((0, authMiddleware_1.authorize)(roles)(req, res, next)).catch(next);
    };
};
// Appliquer le middleware d'authentification à toutes les routes
router.use(wrapMiddleware(authMiddleware_1.authenticate));
// Routes pour les messages
router.get('/inbox', wrapController(messageController_1.default.getReceivedMessages.bind(messageController_1.default)));
router.get('/sent', wrapController(messageController_1.default.getSentMessages.bind(messageController_1.default)));
router.get('/trash', wrapController(messageController_1.default.getDeletedMessages.bind(messageController_1.default)));
router.get('/unread-count', wrapController(messageController_1.default.countUnreadMessages.bind(messageController_1.default)));
router.get('/search', wrapController(messageController_1.default.searchMessages.bind(messageController_1.default)));
router.get('/thread/:id', wrapController(messageController_1.default.getMessageThread.bind(messageController_1.default)));
router.get('/:id', wrapController(messageController_1.default.getMessageById.bind(messageController_1.default)));
router.get('/:messageId/attachment/:attachmentId', wrapController(messageController_1.default.downloadAttachment.bind(messageController_1.default)));
router.post('/', upload.array('attachments', 5), wrapController(messageController_1.default.createMessage.bind(messageController_1.default)));
router.patch('/:id/read', wrapController(messageController_1.default.markAsRead.bind(messageController_1.default)));
router.patch('/:id/delete', wrapController(messageController_1.default.markAsDeleted.bind(messageController_1.default)));
router.patch('/:id/restore', wrapController(messageController_1.default.restoreMessage.bind(messageController_1.default)));
// Routes protégées par rôle
router.delete('/:id', wrapAuthorize(['admin']), wrapController(messageController_1.default.deleteMessage.bind(messageController_1.default)));
// Route pour les administrateurs uniquement
router.get('/', wrapAuthorize(['admin']), wrapController(messageController_1.default.getAllMessages.bind(messageController_1.default)));
exports.default = router;
