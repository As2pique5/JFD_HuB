"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const contributionController_1 = __importDefault(require("../controllers/contributionController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Configuration de multer pour le téléchargement des reçus
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
        }
        else {
            cb(new Error('Type de fichier non autorisé pour un reçu'));
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
// Routes pour les contributions
router.get('/', wrapController(contributionController_1.default.getAllContributions.bind(contributionController_1.default)));
router.get('/summary', wrapController(contributionController_1.default.getFinancialSummary.bind(contributionController_1.default)));
router.get('/monthly-summary', wrapController(contributionController_1.default.getMonthlyFinancialSummary.bind(contributionController_1.default)));
router.get('/yearly-summary', wrapController(contributionController_1.default.getYearlyFinancialSummary.bind(contributionController_1.default)));
router.get('/payment-methods', wrapController(contributionController_1.default.getPaymentMethodStats.bind(contributionController_1.default)));
router.get('/top-contributors', wrapController(contributionController_1.default.getTopContributors.bind(contributionController_1.default)));
router.get('/user/:userId', wrapController(contributionController_1.default.getContributionsByUserId.bind(contributionController_1.default)));
router.get('/user/:userId/summary', wrapController(contributionController_1.default.getUserFinancialSummary.bind(contributionController_1.default)));
router.get('/source/:sourceType/:sourceId?', wrapController(contributionController_1.default.getContributionsBySource.bind(contributionController_1.default)));
router.get('/:id', wrapController(contributionController_1.default.getContributionById.bind(contributionController_1.default)));
router.get('/:id/receipt', wrapController(contributionController_1.default.downloadReceipt.bind(contributionController_1.default)));
// Routes protégées par rôle
router.post('/', wrapAuthorize(['admin', 'treasurer']), upload.single('receipt'), wrapController(contributionController_1.default.createContribution.bind(contributionController_1.default)));
router.put('/:id', wrapAuthorize(['admin', 'treasurer']), upload.single('receipt'), wrapController(contributionController_1.default.updateContribution.bind(contributionController_1.default)));
router.delete('/:id', wrapAuthorize(['admin']), wrapController(contributionController_1.default.deleteContribution.bind(contributionController_1.default)));
exports.default = router;
