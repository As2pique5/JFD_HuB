"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const documentController_1 = require("../controllers/documentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
const documentController = new documentController_1.DocumentController();
// Configuration de multer pour le téléchargement de fichiers
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
        // Vérifier les types de fichiers autorisés
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Type de fichier non autorisé'));
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
// Routes pour les documents
router.get('/', wrapController(documentController.getAllDocuments.bind(documentController)));
router.get('/:id', wrapController(documentController.getDocumentById.bind(documentController)));
router.get('/category/:categoryId', wrapController(documentController.getDocumentsByCategory.bind(documentController)));
router.get('/user/:userId', wrapController(documentController.getDocumentsByUser.bind(documentController)));
router.post('/', upload.single('file'), wrapController(documentController.uploadDocument.bind(documentController)));
router.put('/:id', upload.single('file'), wrapAuthorize(['admin', 'manager']), wrapController(documentController.updateDocument.bind(documentController)));
router.delete('/:id', wrapAuthorize(['admin', 'manager']), wrapController(documentController.deleteDocument.bind(documentController)));
router.get('/:id/download', wrapController(documentController.downloadDocument.bind(documentController)));
// Routes pour les catégories de documents
router.get('/categories/all', wrapController(documentController.getAllCategories.bind(documentController)));
router.get('/categories/:id', wrapController(documentController.getCategoryById.bind(documentController)));
router.post('/categories', wrapAuthorize(['admin', 'manager']), wrapController(documentController.createCategory.bind(documentController)));
router.put('/categories/:id', wrapAuthorize(['admin', 'manager']), wrapController(documentController.updateCategory.bind(documentController)));
router.delete('/categories/:id', wrapAuthorize(['admin']), wrapController(documentController.deleteCategory.bind(documentController)));
exports.default = router;
