"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const winston_1 = __importDefault(require("winston"));
// Création d'un logger simple pour ce module
const logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
/**
 * Middleware pour vérifier si l'utilisateur a les rôles requis
 * @param roles Tableau des rôles autorisés
 */
const authorize = (roles) => {
    return (req, res, next) => {
        try {
            const authReq = req;
            // Vérifier si l'utilisateur est authentifié
            if (!authReq.user) {
                res.status(401).json({ message: 'Authentification requise' });
                return;
            }
            // Vérifier si l'utilisateur a un des rôles requis
            if (roles.length > 0 && !roles.includes(authReq.user.role)) {
                logger.warn(`Accès refusé: L'utilisateur ${authReq.user.id} avec le rôle ${authReq.user.role} a tenté d'accéder à une ressource protégée`);
                res.status(403).json({ message: 'Accès refusé: Vous n\'avez pas les autorisations nécessaires' });
                return;
            }
            next();
        }
        catch (error) {
            logger.error('Erreur d\'autorisation:', error);
            res.status(500).json({ message: 'Erreur lors de la vérification des autorisations' });
        }
    };
};
exports.authorize = authorize;
