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
exports.ProjectController = void 0;
const projectModel_1 = __importDefault(require("../models/projectModel"));
const audit_1 = require("../utils/audit");
/**
 * Contrôleur pour la gestion des projets familiaux
 */
class ProjectController {
    /**
     * Récupérer tous les projets
     */
    getAllProjects(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const projects = yield projectModel_1.default.getAllProjects();
                return res.status(200).json({ success: true, data: projects });
            }
            catch (error) {
                console.error('Erreur lors de la récupération des projets:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des projets',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Récupérer un projet par son ID
     */
    getProjectById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const project = yield projectModel_1.default.getProjectById(id);
                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${id} non trouvé`
                    });
                }
                return res.status(200).json({ success: true, data: project });
            }
            catch (error) {
                console.error(`Erreur lors de la récupération du projet:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération du projet',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Créer un nouveau projet
     */
    createProject(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { name, description, start_date, end_date, target_amount, status } = req.body;
                // Validation de base
                if (!name || !start_date || !status) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tous les champs requis doivent être fournis'
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const projectData = {
                    name,
                    description,
                    start_date: new Date(start_date),
                    end_date: end_date ? new Date(end_date) : undefined,
                    target_amount: target_amount ? Number(target_amount) : undefined,
                    status,
                    created_by: userId
                };
                const newProject = yield projectModel_1.default.createProject(projectData);
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'create',
                    user_id: userId,
                    target_id: newProject.id,
                    target_type: 'project',
                    details: { projectData }
                });
                return res.status(201).json({
                    success: true,
                    message: 'Projet créé avec succès',
                    data: newProject
                });
            }
            catch (error) {
                console.error('Erreur lors de la création du projet:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création du projet',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Mettre à jour un projet
     */
    updateProject(req, res) {
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
                // Convertir les valeurs
                if (updateData.start_date) {
                    updateData.start_date = new Date(updateData.start_date);
                }
                if (updateData.end_date) {
                    updateData.end_date = new Date(updateData.end_date);
                }
                if (updateData.target_amount) {
                    updateData.target_amount = Number(updateData.target_amount);
                }
                const updatedProject = yield projectModel_1.default.updateProject(id, updateData);
                if (!updatedProject) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${id} non trouvé`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'update',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project',
                    details: { updateData }
                });
                return res.status(200).json({
                    success: true,
                    message: 'Projet mis à jour avec succès',
                    data: updatedProject
                });
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour du projet:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la mise à jour du projet',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Supprimer un projet
     */
    deleteProject(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const deleted = yield projectModel_1.default.deleteProject(id);
                if (!deleted) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${id} non trouvé`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'delete',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project',
                    details: {}
                });
                return res.status(200).json({
                    success: true,
                    message: 'Projet supprimé avec succès'
                });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression du projet:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la suppression du projet',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Récupérer toutes les phases d'un projet
     */
    getProjectPhases(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { projectId } = req.params;
                // Vérifier si le projet existe
                const project = yield projectModel_1.default.getProjectById(projectId);
                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${projectId} non trouvé`
                    });
                }
                const phases = yield projectModel_1.default.getProjectPhases(projectId);
                return res.status(200).json({ success: true, data: phases });
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des phases:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des phases',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Créer une nouvelle phase de projet
     */
    createPhase(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { project_id, name, description, start_date, end_date, status } = req.body;
                // Validation de base
                if (!project_id || !name || !start_date || !status) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tous les champs requis doivent être fournis'
                    });
                }
                // Vérifier si le projet existe
                const project = yield projectModel_1.default.getProjectById(project_id);
                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${project_id} non trouvé`
                    });
                }
                const phaseData = {
                    project_id,
                    name,
                    description,
                    start_date: new Date(start_date),
                    end_date: end_date ? new Date(end_date) : undefined,
                    status
                };
                const newPhase = yield projectModel_1.default.createPhase(phaseData);
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'create',
                    user_id: userId,
                    target_id: newPhase.id,
                    target_type: 'project_phase',
                    details: { phaseData }
                });
                return res.status(201).json({
                    success: true,
                    message: 'Phase créée avec succès',
                    data: newPhase
                });
            }
            catch (error) {
                console.error('Erreur lors de la création de la phase:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de la phase',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Mettre à jour une phase de projet
     */
    updatePhase(req, res) {
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
                // Convertir les valeurs
                if (updateData.start_date) {
                    updateData.start_date = new Date(updateData.start_date);
                }
                if (updateData.end_date) {
                    updateData.end_date = new Date(updateData.end_date);
                }
                const updatedPhase = yield projectModel_1.default.updatePhase(id, updateData);
                if (!updatedPhase) {
                    return res.status(404).json({
                        success: false,
                        message: `Phase avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'update',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project_phase',
                    details: { updateData }
                });
                return res.status(200).json({
                    success: true,
                    message: 'Phase mise à jour avec succès',
                    data: updatedPhase
                });
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de la phase:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la mise à jour de la phase',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Supprimer une phase de projet
     */
    deletePhase(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const deleted = yield projectModel_1.default.deletePhase(id);
                if (!deleted) {
                    return res.status(404).json({
                        success: false,
                        message: `Phase avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'delete',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project_phase',
                    details: {}
                });
                return res.status(200).json({
                    success: true,
                    message: 'Phase supprimée avec succès'
                });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de la phase:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la suppression de la phase',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Récupérer tous les participants d'un projet
     */
    getProjectParticipants(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { projectId } = req.params;
                // Vérifier si le projet existe
                const project = yield projectModel_1.default.getProjectById(projectId);
                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${projectId} non trouvé`
                    });
                }
                const participants = yield projectModel_1.default.getProjectParticipants(projectId);
                return res.status(200).json({ success: true, data: participants });
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des participants:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des participants',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Ajouter un participant à un projet
     */
    addParticipant(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { project_id, user_id, status } = req.body;
                // Validation de base
                if (!project_id || !user_id || !status) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tous les champs requis doivent être fournis'
                    });
                }
                // Vérifier si le projet existe
                const project = yield projectModel_1.default.getProjectById(project_id);
                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${project_id} non trouvé`
                    });
                }
                const participantData = {
                    project_id,
                    user_id,
                    status
                };
                const newParticipant = yield projectModel_1.default.addParticipant(participantData);
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'create',
                    user_id: userId,
                    target_id: newParticipant.id,
                    target_type: 'project_participant',
                    details: { participantData }
                });
                return res.status(201).json({
                    success: true,
                    message: 'Participant ajouté avec succès',
                    data: newParticipant
                });
            }
            catch (error) {
                console.error('Erreur lors de l\'ajout du participant:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'ajout du participant',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Mettre à jour le statut d'un participant
     */
    updateParticipantStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const { status } = req.body;
                // Validation de base
                if (!status) {
                    return res.status(400).json({
                        success: false,
                        message: 'Le statut doit être fourni'
                    });
                }
                const updatedParticipant = yield projectModel_1.default.updateParticipantStatus(id, status);
                if (!updatedParticipant) {
                    return res.status(404).json({
                        success: false,
                        message: `Participant avec l'ID ${id} non trouvé`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'update',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project_participant',
                    details: { status }
                });
                return res.status(200).json({
                    success: true,
                    message: 'Statut du participant mis à jour avec succès',
                    data: updatedParticipant
                });
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour du statut du participant:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la mise à jour du statut du participant',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Supprimer un participant d'un projet
     */
    removeParticipant(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const deleted = yield projectModel_1.default.removeParticipant(id);
                if (!deleted) {
                    return res.status(404).json({
                        success: false,
                        message: `Participant avec l'ID ${id} non trouvé`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'delete',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project_participant',
                    details: {}
                });
                return res.status(200).json({
                    success: true,
                    message: 'Participant supprimé avec succès'
                });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression du participant:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la suppression du participant',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Récupérer toutes les contributions d'un projet
     */
    getProjectContributions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { projectId } = req.params;
                // Vérifier si le projet existe
                const project = yield projectModel_1.default.getProjectById(projectId);
                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${projectId} non trouvé`
                    });
                }
                const contributions = yield projectModel_1.default.getProjectContributions(projectId);
                return res.status(200).json({ success: true, data: contributions });
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des contributions:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des contributions',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Ajouter une contribution à un projet
     */
    addContribution(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { project_id, user_id, amount, payment_date, payment_method, status, notes } = req.body;
                // Validation de base
                if (!project_id || !user_id || !amount || !payment_date || !payment_method || !status) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tous les champs requis doivent être fournis'
                    });
                }
                // Vérifier si le projet existe
                const project = yield projectModel_1.default.getProjectById(project_id);
                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${project_id} non trouvé`
                    });
                }
                const contributionData = {
                    project_id,
                    user_id,
                    amount: Number(amount),
                    payment_date: new Date(payment_date),
                    payment_method,
                    status,
                    notes
                };
                const newContribution = yield projectModel_1.default.addContribution(contributionData);
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'create',
                    user_id: userId,
                    target_id: newContribution.id,
                    target_type: 'project_contribution',
                    details: { contributionData }
                });
                return res.status(201).json({
                    success: true,
                    message: 'Contribution ajoutée avec succès',
                    data: newContribution
                });
            }
            catch (error) {
                console.error('Erreur lors de l\'ajout de la contribution:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'ajout de la contribution',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Mettre à jour une contribution
     */
    updateContribution(req, res) {
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
                // Convertir les valeurs
                if (updateData.amount) {
                    updateData.amount = Number(updateData.amount);
                }
                if (updateData.payment_date) {
                    updateData.payment_date = new Date(updateData.payment_date);
                }
                const updatedContribution = yield projectModel_1.default.updateContribution(id, updateData);
                if (!updatedContribution) {
                    return res.status(404).json({
                        success: false,
                        message: `Contribution avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'update',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project_contribution',
                    details: { updateData }
                });
                return res.status(200).json({
                    success: true,
                    message: 'Contribution mise à jour avec succès',
                    data: updatedContribution
                });
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de la contribution:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la mise à jour de la contribution',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Supprimer une contribution
     */
    deleteContribution(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const deleted = yield projectModel_1.default.deleteContribution(id);
                if (!deleted) {
                    return res.status(404).json({
                        success: false,
                        message: `Contribution avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'delete',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project_contribution',
                    details: {}
                });
                return res.status(200).json({
                    success: true,
                    message: 'Contribution supprimée avec succès'
                });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de la contribution:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la suppression de la contribution',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Récupérer toutes les assignations de contributions d'un projet
     */
    getContributionAssignments(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { projectId } = req.params;
                // Vérifier si le projet existe
                const project = yield projectModel_1.default.getProjectById(projectId);
                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${projectId} non trouvé`
                    });
                }
                const assignments = yield projectModel_1.default.getContributionAssignments(projectId);
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
     * Créer une assignation de contribution
     */
    createAssignment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { project_id, user_id, amount, due_date } = req.body;
                // Validation de base
                if (!project_id || !user_id || !amount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tous les champs requis doivent être fournis'
                    });
                }
                // Vérifier si le projet existe
                const project = yield projectModel_1.default.getProjectById(project_id);
                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: `Projet avec l'ID ${project_id} non trouvé`
                    });
                }
                const assignmentData = {
                    project_id,
                    user_id,
                    amount: Number(amount),
                    due_date: due_date ? new Date(due_date) : undefined
                };
                const newAssignment = yield projectModel_1.default.createAssignment(assignmentData);
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'create',
                    user_id: userId,
                    target_id: newAssignment.id,
                    target_type: 'project_contribution_assignment',
                    details: { assignmentData }
                });
                return res.status(201).json({
                    success: true,
                    message: 'Assignation créée avec succès',
                    data: newAssignment
                });
            }
            catch (error) {
                console.error('Erreur lors de la création de l\'assignation:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de l\'assignation',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Mettre à jour une assignation de contribution
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
                // Convertir les valeurs
                if (updateData.amount) {
                    updateData.amount = Number(updateData.amount);
                }
                if (updateData.due_date) {
                    updateData.due_date = new Date(updateData.due_date);
                }
                const updatedAssignment = yield projectModel_1.default.updateAssignment(id, updateData);
                if (!updatedAssignment) {
                    return res.status(404).json({
                        success: false,
                        message: `Assignation avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'update',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project_contribution_assignment',
                    details: { updateData }
                });
                return res.status(200).json({
                    success: true,
                    message: 'Assignation mise à jour avec succès',
                    data: updatedAssignment
                });
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de l'assignation:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la mise à jour de l\'assignation',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Supprimer une assignation de contribution
     */
    deleteAssignment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const deleted = yield projectModel_1.default.deleteAssignment(id);
                if (!deleted) {
                    return res.status(404).json({
                        success: false,
                        message: `Assignation avec l'ID ${id} non trouvée`
                    });
                }
                // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Créer un log d'audit
                yield (0, audit_1.createAuditLog)({
                    action: 'delete',
                    user_id: userId,
                    target_id: id,
                    target_type: 'project_contribution_assignment',
                    details: {}
                });
                return res.status(200).json({
                    success: true,
                    message: 'Assignation supprimée avec succès'
                });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de l'assignation:`, error);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la suppression de l\'assignation',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
}
exports.ProjectController = ProjectController;
