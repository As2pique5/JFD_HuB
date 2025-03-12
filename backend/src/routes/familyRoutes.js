"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const familyController_1 = __importDefault(require("../controllers/familyController"));
const routeWrappers_1 = require("../utils/routeWrappers");
const router = express_1.default.Router();
// Configuration de multer pour le téléchargement des photos
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Le dossier temporaire pour stocker les fichiers avant traitement
        cb(null, path_1.default.join(__dirname, '../../tmp'));
    },
    filename: (req, file, cb) => {
        // Générer un nom de fichier unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
// Filtrer les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
    // Accepter uniquement les images
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    }
});
// Appliquer l'authentification à toutes les routes
router.use(auth_1.authenticate);
// Routes pour les membres de la famille
router.get('/members', (0, routeWrappers_1.wrapController)(familyController_1.default.getAllFamilyMembers.bind(familyController_1.default)));
router.get('/members/:id', (0, routeWrappers_1.wrapController)(familyController_1.default.getFamilyMemberById.bind(familyController_1.default)));
router.get('/members/:id/relations', (0, routeWrappers_1.wrapController)(familyController_1.default.getFamilyMemberWithRelations.bind(familyController_1.default)));
router.get('/members/profile/:profileId', (0, routeWrappers_1.wrapController)(familyController_1.default.getFamilyMembersByProfileId.bind(familyController_1.default)));
router.get('/members/search', (0, routeWrappers_1.wrapController)(familyController_1.default.searchFamilyMembers.bind(familyController_1.default)));
router.post('/members', upload.single('photo'), (0, routeWrappers_1.wrapController)(familyController_1.default.createFamilyMember.bind(familyController_1.default)));
router.put('/members/:id', upload.single('photo'), (0, routeWrappers_1.wrapController)(familyController_1.default.updateFamilyMember.bind(familyController_1.default)));
router.delete('/members/:id', (0, routeWrappers_1.wrapAuthorize)(['admin']), (0, routeWrappers_1.wrapController)(familyController_1.default.deleteFamilyMember.bind(familyController_1.default)));
router.get('/members/:id/photo', (0, routeWrappers_1.wrapController)(familyController_1.default.downloadFamilyMemberPhoto.bind(familyController_1.default)));
// Routes pour les relations familiales
router.get('/relationships', (0, routeWrappers_1.wrapController)(familyController_1.default.getAllFamilyRelationships.bind(familyController_1.default)));
router.get('/relationships/:id', (0, routeWrappers_1.wrapController)(familyController_1.default.getFamilyRelationshipById.bind(familyController_1.default)));
router.get('/relationships/member/:memberId', (0, routeWrappers_1.wrapController)(familyController_1.default.getFamilyRelationshipsByMemberId.bind(familyController_1.default)));
router.post('/relationships', (0, routeWrappers_1.wrapController)(familyController_1.default.createFamilyRelationship.bind(familyController_1.default)));
router.put('/relationships/:id', (0, routeWrappers_1.wrapController)(familyController_1.default.updateFamilyRelationship.bind(familyController_1.default)));
router.delete('/relationships/:id', (0, routeWrappers_1.wrapAuthorize)(['admin']), (0, routeWrappers_1.wrapController)(familyController_1.default.deleteFamilyRelationship.bind(familyController_1.default)));
// Routes pour l'arbre généalogique
router.get('/tree', (0, routeWrappers_1.wrapController)(familyController_1.default.getFamilyTree.bind(familyController_1.default)));
router.get('/tree/member/:id', (0, routeWrappers_1.wrapController)(familyController_1.default.getMemberFamilyTree.bind(familyController_1.default)));
exports.default = router;
