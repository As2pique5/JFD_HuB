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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = __importDefault(require("../models/userModel"));
// Clé secrète pour JWT
const JWT_SECRET = process.env.JWT_SECRET || 'jfdhub_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
class AuthController {
    /**
     * Connexion d'un utilisateur
     */
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                // Vérifier que les champs requis sont présents
                if (!email || !password) {
                    return res.status(400).json({ message: 'Email et mot de passe requis' });
                }
                // Vérifier les identifiants
                const user = yield userModel_1.default.verifyCredentials(email, password);
                if (!user) {
                    return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
                }
                // Vérifier si l'utilisateur est actif
                if (user.status !== 'active') {
                    return res.status(403).json({ message: 'Compte désactivé. Contactez un administrateur.' });
                }
                // Générer un token JWT
                const token = jsonwebtoken_1.default.sign({
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name
                }, JWT_SECRET);
                // Renvoyer le token et les informations de l'utilisateur
                return res.status(200).json({
                    message: 'Connexion réussie',
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        avatar_url: user.avatar_url
                    }
                });
            }
            catch (error) {
                console.error('Erreur lors de la connexion:', error);
                return res.status(500).json({ message: 'Erreur lors de la connexion' });
            }
        });
    }
    /**
     * Récupération des informations de l'utilisateur connecté
     */
    getCurrentUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // L'ID de l'utilisateur est extrait du token JWT par le middleware d'authentification
                const userId = req.user.id;
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
        });
    }
    /**
     * Déconnexion (côté serveur, invalidation du token n'est pas nécessaire)
     * Le client devra supprimer le token de son stockage
     */
    logout(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                return res.status(200).json({ message: 'Déconnexion réussie' });
            }
            catch (error) {
                console.error('Erreur lors de la déconnexion:', error);
                return res.status(500).json({ message: 'Erreur serveur' });
            }
        });
    }
    /**
     * Changement de mot de passe
     */
    changePassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { currentPassword, newPassword } = req.body;
                // Vérifier que les champs requis sont présents
                if (!currentPassword || !newPassword) {
                    return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis' });
                }
                // Récupérer l'utilisateur
                const user = yield userModel_1.default.findById(userId);
                if (!user) {
                    return res.status(404).json({ message: 'Utilisateur non trouvé' });
                }
                // Vérifier le mot de passe actuel
                const isValid = yield userModel_1.default.verifyCredentials(user.email, currentPassword);
                if (!isValid) {
                    return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
                }
                // Mettre à jour le mot de passe
                yield userModel_1.default.update(userId, { password: newPassword });
                // Note: Nous implémenterons la journalisation des audits plus tard
                return res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });
            }
            catch (error) {
                console.error('Erreur lors du changement de mot de passe:', error);
                return res.status(500).json({ message: 'Erreur serveur' });
            }
        });
    }
}
exports.default = new AuthController();
