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
const monthlyContributionModel_1 = __importDefault(require("../models/monthlyContributionModel"));
const audit_1 = require("../utils/audit");
/**
 * Contrôleur pour la gestion des sessions de cotisations mensuelles
 */
class MonthlyContributionController {
    /**
     * Récupérer toutes les sessions de cotisations mensuelles
     */
    getAllSessions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sessions = yield monthlyContributionModel_1.default.getAllSessions();
                return res.status(200).json({ success: true, data: sessions });
            }
            catch (error) {
                console.error('Erreur lors de la récupération des sessions de cotisations:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des sessions de cotisations',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Récupérer une session de cotisations mensuelles par son ID
     */
    getSessionById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const session = yield monthlyContributionModel_1.default.getSessionById(id);
                if (!session) {
                    return res.status(404).json({
                        success: false,
                        message: `Session de cotisations avec l'ID ${id} non trouvée`
                    });
                }
                return res.status(200).json({ success: true, data: session });
            }
            catch (error) {
                console.error(`Erreur lors de la récupération de la session de cotisations:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération de la session de cotisations',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Créer une nouvelle session de cotisations mensuelles
     */
    createSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { name, description, start_date, monthly_target_amount, duration_months, payment_deadline_day, status } = req.body;
                // Validation de base
                if (!name || !start_date || !monthly_target_amount || !duration_months || !payment_deadline_day || !status) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tous les champs requis doivent être fournis'
                    });
                }
                // Validation du jour limite de paiement
                if (payment_deadline_day < 1 || payment_deadline_day > 31) {
                    return res.status(400).json({
                        success: false,
                        message: 'Le jour limite de paiement doit être compris entre 1 et 31'
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const sessionData = {
                    name,
                    description,
                    start_date: new Date(start_date),
                    monthly_target_amount: Number(monthly_target_amount),
                    duration_months: Number(duration_months),
                    payment_deadline_day: Number(payment_deadline_day),
                    status,
                    created_by: userId
                };
                const newSession = yield monthlyContributionModel_1.default.createSession(sessionData);
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'create',
                    user_id: userId,
                    target_id: newSession.id,
                    target_type: 'monthly_contribution_session',
                    details: { sessionData }
                });
                return res.status(201).json({
                    success: true,
                    message: 'Session de cotisations créée avec succès',
                    data: newSession
                });
            }
            catch (error) {
                console.error('Erreur lors de la création de la session de cotisations:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de la session de cotisations',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Mettre à jour une session de cotisations mensuelles
     */
    updateSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const updateData = req.body;
                // Validation de base
                if (Object.keys(updateData).length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Aucune donnée fournie pour la mise à jour'
                    });
                }
                // Validation du jour limite de paiement si fourni
                if (updateData.payment_deadline_day && (updateData.payment_deadline_day < 1 || updateData.payment_deadline_day > 31)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Le jour limite de paiement doit être compris entre 1 et 31'
                    });
                }
                // Convertir les valeurs numériques
                if (updateData.monthly_target_amount) {
                    updateData.monthly_target_amount = Number(updateData.monthly_target_amount);
                }
                if (updateData.duration_months) {
                    updateData.duration_months = Number(updateData.duration_months);
                }
                if (updateData.payment_deadline_day) {
                    updateData.payment_deadline_day = Number(updateData.payment_deadline_day);
                }
                if (updateData.start_date) {
                    updateData.start_date = new Date(updateData.start_date);
                }
                const updatedSession = yield monthlyContributionModel_1.default.updateSession(id, updateData);
                if (!updatedSession) {
                    return res.status(404).json({
                        success: false,
                        message: `Session de cotisations avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'update',
                    user_id: userId,
                    target_id: id,
                    target_type: 'monthly_contribution_session',
                    details: { updateData }
                });
                return res.status(200).json({
                    success: true,
                    message: 'Session de cotisations mise à jour avec succès',
                    data: updatedSession
                });
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de la session de cotisations:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la mise à jour de la session de cotisations',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Supprimer une session de cotisations mensuelles
     */
    deleteSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const deleted = yield monthlyContributionModel_1.default.deleteSession(id);
                if (!deleted) {
                    return res.status(404).json({
                        success: false,
                        message: `Session de cotisations avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'delete',
                    user_id: userId,
                    target_id: id,
                    target_type: 'monthly_contribution_session',
                    details: {}
                });
                return res.status(200).json({
                    success: true,
                    message: 'Session de cotisations supprimée avec succès'
                });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de la session de cotisations:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la suppression de la session de cotisations',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Récupérer toutes les assignations pour une session
     */
    getAssignmentsBySessionId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sessionId } = req.params;
                // Vérifier si la session existe
                const session = yield monthlyContributionModel_1.default.getSessionById(sessionId);
                if (!session) {
                    return res.status(404).json({
                        success: false,
                        message: `Session de cotisations avec l'ID ${sessionId} non trouvée`
                    });
                }
                const assignments = yield monthlyContributionModel_1.default.getAssignmentsBySessionId(sessionId);
                return res.status(200).json({ success: true, data: assignments });
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des assignations:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des assignations',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Créer une nouvelle assignation de cotisation mensuelle
     */
    createAssignment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { session_id, user_id, monthly_amount } = req.body;
                // Validation de base
                if (!session_id || !user_id || monthly_amount === undefined) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tous les champs requis doivent être fournis'
                    });
                }
                // Vérifier si la session existe
                const session = yield monthlyContributionModel_1.default.getSessionById(session_id);
                if (!session) {
                    return res.status(404).json({
                        success: false,
                        message: `Session de cotisations avec l'ID ${session_id} non trouvée`
                    });
                }
                const assignmentData = {
                    session_id,
                    user_id,
                    monthly_amount: Number(monthly_amount)
                };
                const newAssignment = yield monthlyContributionModel_1.default.createAssignment(assignmentData);
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'create',
                    user_id: userId,
                    target_id: newAssignment.id,
                    target_type: 'monthly_contribution_assignment',
                    details: { assignmentData }
                });
                return res.status(201).json({
                    success: true,
                    message: 'Assignation de cotisation créée avec succès',
                    data: newAssignment
                });
            }
            catch (error) {
                console.error('Erreur lors de la création de l\'assignation de cotisation:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de l\'assignation de cotisation',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Mettre à jour une assignation de cotisation mensuelle
     */
    updateAssignment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const updateData = req.body;
                // Validation de base
                if (Object.keys(updateData).length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Aucune donnée fournie pour la mise à jour'
                    });
                }
                // Convertir les valeurs numériques
                if (updateData.monthly_amount) {
                    updateData.monthly_amount = Number(updateData.monthly_amount);
                }
                const updatedAssignment = yield monthlyContributionModel_1.default.updateAssignment(id, updateData);
                if (!updatedAssignment) {
                    return res.status(404).json({
                        success: false,
                        message: `Assignation de cotisation avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'update',
                    user_id: userId,
                    target_id: id,
                    target_type: 'monthly_contribution_assignment',
                    details: { updateData }
                });
                return res.status(200).json({
                    success: true,
                    message: 'Assignation de cotisation mise à jour avec succès',
                    data: updatedAssignment
                });
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de l'assignation de cotisation:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la mise à jour de l\'assignation de cotisation',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Supprimer une assignation de cotisation mensuelle
     */
    deleteAssignment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const deleted = yield monthlyContributionModel_1.default.deleteAssignment(id);
                if (!deleted) {
                    return res.status(404).json({
                        success: false,
                        message: `Assignation de cotisation avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'delete',
                    user_id: userId,
                    target_id: id,
                    target_type: 'monthly_contribution_assignment',
                    details: {}
                });
                return res.status(200).json({
                    success: true,
                    message: 'Assignation de cotisation supprimée avec succès'
                });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de l'assignation de cotisation:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la suppression de l\'assignation de cotisation',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
}
exports.default = new MonthlyContributionController();
