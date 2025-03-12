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
exports.ContributionController = void 0;
const contributionModel_1 = __importDefault(require("../models/contributionModel"));
const audit_1 = require("../utils/audit");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
class ContributionController {
    /**
     * Récupérer toutes les contributions
     */
    getAllContributions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const contributions = yield contributionModel_1.default.getAllContributions();
                return res.status(200).json(contributions);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des contributions:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des contributions' });
            }
        });
    }
    /**
     * Récupérer une contribution par son ID
     */
    getContributionById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const contribution = yield contributionModel_1.default.getContributionById(id);
                if (!contribution) {
                    return res.status(404).json({ message: 'Contribution non trouvée' });
                }
                return res.status(200).json(contribution);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération de la contribution ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération de la contribution' });
            }
        });
    }
    /**
     * Récupérer les contributions d'un utilisateur
     */
    getContributionsByUserId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const contributions = yield contributionModel_1.default.getContributionsByUserId(userId);
                return res.status(200).json(contributions);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des contributions de l'utilisateur ${req.params.userId}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des contributions de l\'utilisateur' });
            }
        });
    }
    /**
     * Récupérer les contributions par source
     */
    getContributionsBySource(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sourceType, sourceId } = req.params;
                if (!['monthly', 'event', 'project', 'other'].includes(sourceType)) {
                    return res.status(400).json({ message: 'Type de source invalide' });
                }
                const contributions = yield contributionModel_1.default.getContributionsBySource(sourceType, sourceId);
                return res.status(200).json(contributions);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des contributions par source:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des contributions par source' });
            }
        });
    }
    /**
     * Créer une nouvelle contribution
     */
    createContribution(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { user_id, amount, payment_date, payment_method, status, source_type, source_id, notes } = req.body;
                // Validation des données
                if (!user_id || !amount || !payment_date || !payment_method || !status || !source_type) {
                    return res.status(400).json({ message: 'Données incomplètes pour la création de la contribution' });
                }
                // Vérifier que le montant est positif
                if (parseFloat(amount) <= 0) {
                    return res.status(400).json({ message: 'Le montant doit être supérieur à zéro' });
                }
                let receipt_url = undefined;
                // Traitement du reçu de paiement si présent
                if (req.file) {
                    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
                    const receiptDir = path_1.default.join(uploadDir, 'receipts');
                    // Créer le dossier des reçus s'il n'existe pas
                    if (!fs_1.default.existsSync(path_1.default.join(__dirname, '../../', receiptDir))) {
                        fs_1.default.mkdirSync(path_1.default.join(__dirname, '../../', receiptDir), { recursive: true });
                    }
                    // Générer un nom de fichier unique
                    const fileExtension = path_1.default.extname(req.file.originalname);
                    const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
                    const filePath = path_1.default.join(receiptDir, uniqueFilename);
                    // Déplacer le fichier téléchargé
                    fs_1.default.renameSync(req.file.path, path_1.default.join(__dirname, '../../', filePath));
                    receipt_url = filePath;
                }
                // Créer la contribution
                const newContribution = yield contributionModel_1.default.createContribution({
                    user_id,
                    amount: parseFloat(amount),
                    payment_date: new Date(payment_date),
                    payment_method,
                    status,
                    source_type,
                    source_id,
                    notes,
                    receipt_url
                });
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'create',
                    target_type: 'contribution',
                    target_id: newContribution.id,
                    details: `Contribution de ${amount} ${payment_method} créée pour ${source_type}`
                });
                return res.status(201).json(newContribution);
            }
            catch (error) {
                console.error('Erreur lors de la création de la contribution:', error);
                return res.status(500).json({ message: 'Erreur lors de la création de la contribution' });
            }
        });
    }
    /**
     * Mettre à jour une contribution
     */
    updateContribution(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si la contribution existe
                const existingContribution = yield contributionModel_1.default.getContributionById(id);
                if (!existingContribution) {
                    return res.status(404).json({ message: 'Contribution non trouvée' });
                }
                const { amount, payment_date, payment_method, status, notes } = req.body;
                // Préparer les données à mettre à jour
                const updateData = {};
                if (amount !== undefined) {
                    if (parseFloat(amount) <= 0) {
                        return res.status(400).json({ message: 'Le montant doit être supérieur à zéro' });
                    }
                    updateData.amount = parseFloat(amount);
                }
                if (payment_date !== undefined)
                    updateData.payment_date = new Date(payment_date);
                if (payment_method !== undefined)
                    updateData.payment_method = payment_method;
                if (status !== undefined)
                    updateData.status = status;
                if (notes !== undefined)
                    updateData.notes = notes;
                // Traitement du reçu de paiement si présent
                if (req.file) {
                    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
                    const receiptDir = path_1.default.join(uploadDir, 'receipts');
                    // Créer le dossier des reçus s'il n'existe pas
                    if (!fs_1.default.existsSync(path_1.default.join(__dirname, '../../', receiptDir))) {
                        fs_1.default.mkdirSync(path_1.default.join(__dirname, '../../', receiptDir), { recursive: true });
                    }
                    // Supprimer l'ancien reçu s'il existe
                    if (existingContribution.receipt_url) {
                        const oldFilePath = path_1.default.join(__dirname, '../../', existingContribution.receipt_url);
                        if (fs_1.default.existsSync(oldFilePath)) {
                            fs_1.default.unlinkSync(oldFilePath);
                        }
                    }
                    // Générer un nom de fichier unique
                    const fileExtension = path_1.default.extname(req.file.originalname);
                    const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
                    const filePath = path_1.default.join(receiptDir, uniqueFilename);
                    // Déplacer le fichier téléchargé
                    fs_1.default.renameSync(req.file.path, path_1.default.join(__dirname, '../../', filePath));
                    updateData.receipt_url = filePath;
                }
                // Mettre à jour la contribution
                const updatedContribution = yield contributionModel_1.default.updateContribution(id, updateData);
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'update',
                    target_type: 'contribution',
                    target_id: id,
                    details: `Contribution mise à jour: ${JSON.stringify(updateData)}`
                });
                return res.status(200).json(updatedContribution);
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de la contribution ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la mise à jour de la contribution' });
            }
        });
    }
    /**
     * Supprimer une contribution
     */
    deleteContribution(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si la contribution existe
                const contribution = yield contributionModel_1.default.getContributionById(id);
                if (!contribution) {
                    return res.status(404).json({ message: 'Contribution non trouvée' });
                }
                // Supprimer le reçu de paiement s'il existe
                if (contribution.receipt_url) {
                    const filePath = path_1.default.join(__dirname, '../../', contribution.receipt_url);
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                }
                // Supprimer la contribution
                const deleted = yield contributionModel_1.default.deleteContribution(id);
                if (!deleted) {
                    return res.status(500).json({ message: 'Erreur lors de la suppression de la contribution' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'delete',
                    target_type: 'contribution',
                    target_id: id,
                    details: `Contribution de ${contribution.amount} ${contribution.payment_method} supprimée`
                });
                return res.status(200).json({ message: 'Contribution supprimée avec succès' });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de la contribution ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la suppression de la contribution' });
            }
        });
    }
    /**
     * Télécharger le reçu d'une contribution
     */
    downloadReceipt(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Récupérer les informations de la contribution
                const contribution = yield contributionModel_1.default.getContributionById(id);
                if (!contribution) {
                    res.status(404).json({ message: 'Contribution non trouvée' });
                    return;
                }
                // Vérifier si un reçu est disponible
                if (!contribution.receipt_url) {
                    res.status(404).json({ message: 'Aucun reçu disponible pour cette contribution' });
                    return;
                }
                // Chemin complet du fichier
                const filePath = path_1.default.join(__dirname, '../../', contribution.receipt_url);
                // Vérifier si le fichier existe
                if (!fs_1.default.existsSync(filePath)) {
                    res.status(404).json({ message: 'Fichier de reçu non trouvé sur le serveur' });
                    return;
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'download',
                    target_type: 'contribution_receipt',
                    target_id: id,
                    details: `Reçu de contribution téléchargé par l'utilisateur`
                });
                // Envoyer le fichier au client
                res.download(filePath, `recu-${id}${path_1.default.extname(contribution.receipt_url)}`, (err) => {
                    if (err) {
                        console.error('Erreur lors du téléchargement du reçu:', err);
                        res.status(500).json({ message: 'Erreur lors du téléchargement du reçu' });
                    }
                });
            }
            catch (error) {
                console.error(`Erreur lors du téléchargement du reçu de la contribution ${req.params.id}:`, error);
                res.status(500).json({ message: 'Erreur lors du téléchargement du reçu' });
            }
        });
    }
    /**
     * Obtenir un résumé financier global
     */
    getFinancialSummary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const summary = yield contributionModel_1.default.getFinancialSummary();
                return res.status(200).json(summary);
            }
            catch (error) {
                console.error('Erreur lors de la récupération du résumé financier:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération du résumé financier' });
            }
        });
    }
    /**
     * Obtenir un résumé financier pour un utilisateur spécifique
     */
    getUserFinancialSummary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const summary = yield contributionModel_1.default.getUserFinancialSummary(userId);
                return res.status(200).json(summary);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération du résumé financier de l'utilisateur ${req.params.userId}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération du résumé financier de l\'utilisateur' });
            }
        });
    }
    /**
     * Obtenir un résumé financier par mois
     */
    getMonthlyFinancialSummary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const year = req.query.year ? parseInt(req.query.year) : undefined;
                const summary = yield contributionModel_1.default.getMonthlyFinancialSummary(year);
                return res.status(200).json(summary);
            }
            catch (error) {
                console.error('Erreur lors de la récupération du résumé financier mensuel:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération du résumé financier mensuel' });
            }
        });
    }
    /**
     * Obtenir un résumé financier par année
     */
    getYearlyFinancialSummary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const summary = yield contributionModel_1.default.getYearlyFinancialSummary();
                return res.status(200).json(summary);
            }
            catch (error) {
                console.error('Erreur lors de la récupération du résumé financier annuel:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération du résumé financier annuel' });
            }
        });
    }
    /**
     * Obtenir les statistiques de paiement par méthode
     */
    getPaymentMethodStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield contributionModel_1.default.getPaymentMethodStats();
                return res.status(200).json(stats);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des statistiques de méthode de paiement:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des statistiques de méthode de paiement' });
            }
        });
    }
    /**
     * Obtenir les top contributeurs
     */
    getTopContributors(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const contributors = yield contributionModel_1.default.getTopContributors(limit);
                return res.status(200).json(contributors);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des top contributeurs:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des top contributeurs' });
            }
        });
    }
}
exports.ContributionController = ContributionController;
exports.default = new ContributionController();
