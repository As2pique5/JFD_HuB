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
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = __importDefault(require("../models/userModel"));
// Clé secrète pour JWT
const JWT_SECRET = process.env.JWT_SECRET || 'jfdhub_secret_key';
/**
 * Middleware pour vérifier l'authentification de l'utilisateur
 */
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Récupérer le token depuis l'en-tête Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentification requise' });
        }
        const token = authHeader.split(' ')[1];
        // Vérifier et décoder le token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Vérifier si l'utilisateur existe toujours et est actif
        const user = yield userModel_1.default.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'Utilisateur non trouvé' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Compte désactivé' });
        }
        // Ajouter les informations de l'utilisateur à la requête
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name
        };
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expirée, veuillez vous reconnecter' });
        }
        console.error('Erreur d\'authentification:', error);
        return res.status(401).json({ message: 'Token invalide' });
    }
});
exports.authenticate = authenticate;
/**
 * Middleware pour vérifier les rôles autorisés
 * @param roles Tableau des rôles autorisés
 */
const authorize = (roles) => {
    return (req, res, next) => {
        var _a;
        const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        next();
    };
};
exports.authorize = authorize;
