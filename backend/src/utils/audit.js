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
exports.logAuditEvent = logAuditEvent;
exports.createAuditLog = createAuditLog;
const db_1 = __importDefault(require("../config/db"));
const uuid_1 = require("uuid");
/**
 * Enregistre un événement d'audit dans la base de données
 * @param action Type d'action (login, logout, create, update, delete, etc.)
 * @param userId ID de l'utilisateur qui a effectué l'action
 * @param targetId ID de l'objet cible de l'action (utilisateur, cotisation, etc.)
 * @param details Détails supplémentaires sur l'action (optionnel)
 */
function logAuditEvent(action, userId, targetId, details, targetType) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield db_1.default.query(`INSERT INTO audit_logs (id, action, user_id, target_id, target_type, details)
       VALUES ($1, $2, $3, $4, $5, $6)`, [(0, uuid_1.v4)(), action, userId, targetId || null, targetType || null, details ? JSON.stringify(details) : null]);
        }
        catch (error) {
            console.error('Erreur lors de l\'enregistrement de l\'événement d\'audit:', error);
            // Ne pas propager l'erreur pour éviter d'interrompre le flux principal
        }
    });
}
/**
 * Version améliorée pour créer un log d'audit avec une interface plus structurée
 * @param data Données d'audit à enregistrer
 */
function createAuditLog(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { action, user_id, target_id, target_type, details } = data;
            yield db_1.default.query(`INSERT INTO audit_logs (id, action, user_id, target_id, target_type, details)
       VALUES ($1, $2, $3, $4, $5, $6)`, [(0, uuid_1.v4)(), action, user_id, target_id || null, target_type || null, details ? JSON.stringify(details) : null]);
        }
        catch (error) {
            console.error('Erreur lors de la création du log d\'audit:', error);
            // Ne pas propager l'erreur pour éviter d'interrompre le flux principal
        }
    });
}
