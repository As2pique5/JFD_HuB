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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const userModel_1 = __importDefault(require("../models/userModel"));
const audit_1 = require("../utils/audit");
class UserController {
    /**
     * Récupérer tous les utilisateurs avec filtres optionnels
     */
    getAllUsers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { role, status, search } = req.query;
                const filters = {
                    role: role,
                    status: status,
                    search: search
                };
                const users = yield userModel_1.default.findAll(filters);
                // Supprimer les mots de passe des résultats
                const safeUsers = users.map(user => {
                    const _a = user, { password } = _a, safeUser = __rest(_a, ["password"]);
                    return safeUser;
                });
                return res.status(200).json(safeUsers);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des utilisateurs:', error);
                return res.status(500).json({ message: 'Erreur serveur' });
            }
        });
    }
    /**
     * Récupérer un utilisateur par son ID
     */
    getUserById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.params.id;
                const user = yield userModel_1.default.findById(userId);
                if (!user) {
                    return res.status(404).json({ message: 'Utilisateur non trouvé' });
                }
                // Supprimer le mot de passe des résultats
                const _a = user, { password } = _a, safeUser = __rest(_a, ["password"]);
                return res.status(200).json(safeUser);
            }
            catch (error) {
                console.error('Erreur lors de la récupération de l\'utilisateur:', error);
                return res.status(500).json({ message: 'Erreur serveur' });
            }
        });
    }
    /**
     * Créer un nouvel utilisateur
     */
    createUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userData = req.body;
                // Vérifier que les champs requis sont présents
                if (!userData.email || !userData.password || !userData.name || !userData.role) {
                    return res.status(400).json({ message: 'Champs obligatoires manquants' });
                }
                // Créer l'utilisateur
                const newUser = yield userModel_1.default.create(userData);
                // Enregistrer l'événement d'audit
                const currentUserId = req.user.id;
                yield (0, audit_1.logAuditEvent)('user_create', currentUserId, newUser.id, { email: newUser.email }, 'user');
                // Supprimer le mot de passe des résultats
                const _a = newUser, { password } = _a, safeUser = __rest(_a, ["password"]);
                return res.status(201).json({
                    message: 'Utilisateur créé avec succès',
                    user: safeUser
                });
            }
            catch (error) {
                console.error('Erreur lors de la création de l\'utilisateur:', error);
                if (error.message === 'Un utilisateur avec cet email existe déjà') {
                    return res.status(409).json({ message: error.message });
                }
                return res.status(500).json({ message: 'Erreur serveur' });
            }
        });
    }
    /**
     * Mettre à jour un utilisateur existant
     */
    updateUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                // Enregistrer l'événement d'audit
                const currentUserId = req.user.id;
                yield (0, audit_1.logAuditEvent)('user_update', currentUserId, userId, userData, 'user');
                // Supprimer le mot de passe des résultats
                const _a = updatedUser, { password } = _a, safeUser = __rest(_a, ["password"]);
                return res.status(200).json({
                    message: 'Utilisateur mis à jour avec succès',
                    user: safeUser
                });
            }
            catch (error) {
                console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
                return res.status(500).json({ message: 'Erreur serveur' });
            }
        });
    }
    /**
     * Mettre à jour le statut d'un utilisateur
     */
    updateUserStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.params.id;
                const { status } = req.body;
                // Vérifier que le statut est valide
                if (status !== 'active' && status !== 'inactive') {
                    return res.status(400).json({ message: 'Statut invalide' });
                }
                // Vérifier si l'utilisateur existe
                const existingUser = yield userModel_1.default.findById(userId);
                if (!existingUser) {
                    return res.status(404).json({ message: 'Utilisateur non trouvé' });
                }
                // Mettre à jour le statut
                const updatedUser = yield userModel_1.default.updateStatus(userId, status);
                // Enregistrer l'événement d'audit
                const currentUserId = req.user.id;
                yield (0, audit_1.logAuditEvent)('user_status_update', currentUserId, userId, { status }, 'user');
                return res.status(200).json({
                    message: 'Statut de l\'utilisateur mis à jour avec succès',
                    user: {
                        id: updatedUser.id,
                        name: updatedUser.name,
                        email: updatedUser.email,
                        status: updatedUser.status
                    }
                });
            }
            catch (error) {
                console.error('Erreur lors de la mise à jour du statut de l\'utilisateur:', error);
                return res.status(500).json({ message: 'Erreur serveur' });
            }
        });
    }
    /**
     * Supprimer un utilisateur
     */
    deleteUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.params.id;
                // Vérifier si l'utilisateur existe
                const existingUser = yield userModel_1.default.findById(userId);
                if (!existingUser) {
                    return res.status(404).json({ message: 'Utilisateur non trouvé' });
                }
                // Supprimer l'utilisateur
                yield userModel_1.default.delete(userId);
                // Enregistrer l'événement d'audit
                const currentUserId = req.user.id;
                yield (0, audit_1.logAuditEvent)('user_delete', currentUserId, userId, { email: existingUser.email }, 'user');
                return res.status(200).json({
                    message: 'Utilisateur supprimé avec succès'
                });
            }
            catch (error) {
                console.error('Erreur lors de la suppression de l\'utilisateur:', error);
                return res.status(500).json({ message: 'Erreur serveur' });
            }
        });
    }
}
exports.default = new UserController();
