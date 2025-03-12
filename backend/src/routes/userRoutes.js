"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userModel_1 = __importDefault(require("../models/userModel"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Toutes les routes utilisateurs nécessitent une authentification
router.use(authMiddleware_1.authenticate);
// Routes accessibles aux super_admin et intermediate
router.get('/', (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield userModel_1.default.findAll();
        return res.status(200).json(users);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
})));
router.post('/', (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userData = req.body;
        // Vérifier les données requises
        if (!userData.email || !userData.password || !userData.name || !userData.role) {
            return res.status(400).json({ message: 'Données manquantes' });
        }
        // Vérifier si l'email existe déjà
        const existingUser = yield userModel_1.default.findByEmail(userData.email);
        if (existingUser) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé' });
        }
        // Créer l'utilisateur
        const newUser = yield userModel_1.default.create(userData);
        // Renvoyer l'utilisateur créé (sans le mot de passe)
        return res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            created_at: newUser.created_at
        });
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
})));
// Routes accessibles à tous les utilisateurs authentifiés pour leur propre profil
router.get('/:id', ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const requestingUserId = req.user.id;
        const requestingUserRole = req.user.role;
        // Vérifier si l'utilisateur demande son propre profil ou s'il a les droits nécessaires
        if (userId !== requestingUserId && !['super_admin', 'intermediate'].includes(requestingUserRole)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        const user = yield userModel_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        // Renvoyer les informations de l'utilisateur (sans le mot de passe)
        return res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            birth_date: user.birth_date,
            address: user.address,
            bio: user.bio,
            avatar_url: user.avatar_url,
            status: user.status,
            created_at: user.created_at
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
})));
// Routes accessibles uniquement aux super_admin
router.put('/:id', (0, authMiddleware_1.authorize)(['super_admin']), ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const userData = req.body;
        // Vérifier si l'utilisateur existe
        const existingUser = yield userModel_1.default.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        // Mettre à jour l'utilisateur
        const updatedUser = yield userModel_1.default.update(userId, userData);
        // Renvoyer l'utilisateur mis à jour
        return res.status(200).json({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            phone: updatedUser.phone,
            birth_date: updatedUser.birth_date,
            address: updatedUser.address,
            bio: updatedUser.bio,
            avatar_url: updatedUser.avatar_url,
            status: updatedUser.status,
            created_at: updatedUser.created_at
        });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
})));
router.patch('/:id/status', (0, authMiddleware_1.authorize)(['super_admin']), ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const { status } = req.body;
        // Vérifier si le statut est valide
        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }
        // Vérifier si l'utilisateur existe
        const existingUser = yield userModel_1.default.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        // Mettre à jour le statut de l'utilisateur
        const updatedUser = yield userModel_1.default.update(userId, { status });
        return res.status(200).json({
            id: updatedUser.id,
            name: updatedUser.name,
            status: updatedUser.status
        });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour du statut de l\'utilisateur:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
})));
router.delete('/:id', (0, authMiddleware_1.authorize)(['super_admin']), ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const requestingUserId = req.user.id;
        // Empêcher la suppression de son propre compte
        if (userId === requestingUserId) {
            return res.status(403).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
        }
        // Vérifier si l'utilisateur existe
        const existingUser = yield userModel_1.default.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        // Supprimer l'utilisateur
        yield userModel_1.default.delete(userId);
        return res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
})));
exports.default = router;
