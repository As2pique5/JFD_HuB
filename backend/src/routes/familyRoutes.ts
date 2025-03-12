import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import familyController from '../controllers/familyController';
import { wrapController, wrapAuthorize } from '../utils/routeWrappers';

const router = express.Router();

// Configuration de multer pour le téléchargement des photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Le dossier temporaire pour stocker les fichiers avant traitement
    cb(null, path.join(__dirname, '../../tmp'));
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtrer les types de fichiers autorisés
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accepter uniquement les images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

// Appliquer l'authentification à toutes les routes
router.use(authenticate);

// Routes pour les membres de la famille
router.get('/members', wrapController(familyController.getAllFamilyMembers.bind(familyController)));
router.get('/members/:id', wrapController(familyController.getFamilyMemberById.bind(familyController)));
router.get('/members/:id/relations', wrapController(familyController.getFamilyMemberWithRelations.bind(familyController)));
router.get('/members/profile/:profileId', wrapController(familyController.getFamilyMembersByProfileId.bind(familyController)));
router.get('/members/search', wrapController(familyController.searchFamilyMembers.bind(familyController)));
router.post('/members', upload.single('photo'), wrapController(familyController.createFamilyMember.bind(familyController)));
router.put('/members/:id', upload.single('photo'), wrapController(familyController.updateFamilyMember.bind(familyController)));
router.delete('/members/:id', wrapAuthorize(['admin']), wrapController(familyController.deleteFamilyMember.bind(familyController)));
router.get('/members/:id/photo', wrapController(familyController.downloadFamilyMemberPhoto.bind(familyController)));

// Routes pour les relations familiales
router.get('/relationships', wrapController(familyController.getAllFamilyRelationships.bind(familyController)));
router.get('/relationships/:id', wrapController(familyController.getFamilyRelationshipById.bind(familyController)));
router.get('/relationships/member/:memberId', wrapController(familyController.getFamilyRelationshipsByMemberId.bind(familyController)));
router.post('/relationships', wrapController(familyController.createFamilyRelationship.bind(familyController)));
router.put('/relationships/:id', wrapController(familyController.updateFamilyRelationship.bind(familyController)));
router.delete('/relationships/:id', wrapAuthorize(['admin']), wrapController(familyController.deleteFamilyRelationship.bind(familyController)));

// Routes pour l'arbre généalogique
router.get('/tree', wrapController(familyController.getFamilyTree.bind(familyController)));
router.get('/tree/member/:id', wrapController(familyController.getMemberFamilyTree.bind(familyController)));

export default router;
