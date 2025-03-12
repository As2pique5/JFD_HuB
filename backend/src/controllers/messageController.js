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
exports.MessageController = void 0;
const messageModel_1 = __importDefault(require("../models/messageModel"));
const audit_1 = require("../utils/audit");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
class MessageController {
    /**
     * Récupérer tous les messages
     */
    getAllMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const messages = yield messageModel_1.default.getAllMessages();
                return res.status(200).json(messages);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des messages:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
            }
        });
    }
    /**
     * Récupérer un message par son ID
     */
    getMessageById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                const message = yield messageModel_1.default.getMessageById(id);
                if (!message) {
                    return res.status(404).json({ message: 'Message non trouvé' });
                }
                // Vérifier si l'utilisateur est autorisé à voir ce message
                const isRecipient = message.recipients.some(r => r.recipient_id === userId);
                const isSender = message.sender_id === userId;
                if (!isRecipient && !isSender) {
                    return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à voir ce message' });
                }
                // Si l'utilisateur est un destinataire, marquer le message comme lu
                if (isRecipient) {
                    yield messageModel_1.default.markMessageAsRead(id, userId);
                }
                return res.status(200).json(message);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération du message ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération du message' });
            }
        });
    }
    /**
     * Récupérer les messages envoyés par l'utilisateur
     */
    getSentMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const messages = yield messageModel_1.default.getSentMessages(userId);
                return res.status(200).json(messages);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des messages envoyés:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des messages envoyés' });
            }
        });
    }
    /**
     * Récupérer les messages reçus par l'utilisateur
     */
    getReceivedMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const messages = yield messageModel_1.default.getReceivedMessages(userId);
                return res.status(200).json(messages);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des messages reçus:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des messages reçus' });
            }
        });
    }
    /**
     * Récupérer les messages supprimés par l'utilisateur
     */
    getDeletedMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const messages = yield messageModel_1.default.getDeletedMessages(userId);
                return res.status(200).json(messages);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des messages supprimés:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des messages supprimés' });
            }
        });
    }
    /**
     * Récupérer un fil de discussion
     */
    getMessageThread(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si l'utilisateur est autorisé à voir ce message
                const message = yield messageModel_1.default.getMessageById(id);
                if (!message) {
                    return res.status(404).json({ message: 'Message non trouvé' });
                }
                const isRecipient = message.recipients.some(r => r.recipient_id === userId);
                const isSender = message.sender_id === userId;
                if (!isRecipient && !isSender) {
                    return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à voir ce fil de discussion' });
                }
                const thread = yield messageModel_1.default.getMessageThread(id);
                return res.status(200).json(thread);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération du fil de discussion ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération du fil de discussion' });
            }
        });
    }
    /**
     * Créer un nouveau message
     */
    createMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { subject, content, recipient_ids, parent_id } = req.body;
                // Validation des données
                if (!subject || !content || !recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
                    return res.status(400).json({ message: 'Données incomplètes pour la création du message' });
                }
                let attachments = [];
                // Traitement des pièces jointes si présentes
                if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
                    const attachmentsDir = path_1.default.join(uploadDir, 'attachments');
                    // Créer le dossier des pièces jointes s'il n'existe pas
                    if (!fs_1.default.existsSync(path_1.default.join(__dirname, '../../', attachmentsDir))) {
                        fs_1.default.mkdirSync(path_1.default.join(__dirname, '../../', attachmentsDir), { recursive: true });
                    }
                    for (const file of req.files) {
                        // Générer un nom de fichier unique
                        const fileExtension = path_1.default.extname(file.originalname);
                        const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
                        const filePath = path_1.default.join(attachmentsDir, uniqueFilename);
                        // Déplacer le fichier téléchargé
                        fs_1.default.renameSync(file.path, path_1.default.join(__dirname, '../../', filePath));
                        attachments.push({
                            file_name: file.originalname,
                            file_path: filePath,
                            file_size: file.size,
                            file_type: file.mimetype
                        });
                    }
                }
                // Créer le message
                const newMessage = yield messageModel_1.default.createMessage({
                    sender_id: userId,
                    subject,
                    content,
                    is_read: true, // Le message est lu par l'expéditeur
                    parent_id,
                    has_attachments: attachments.length > 0
                }, recipient_ids, attachments);
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'create',
                    target_type: 'message',
                    target_id: newMessage.id,
                    details: `Message créé avec le sujet "${subject}" et envoyé à ${recipient_ids.length} destinataire(s)`
                });
                return res.status(201).json(newMessage);
            }
            catch (error) {
                console.error('Erreur lors de la création du message:', error);
                return res.status(500).json({ message: 'Erreur lors de la création du message' });
            }
        });
    }
    /**
     * Marquer un message comme lu
     */
    markAsRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si l'utilisateur est un destinataire du message
                const message = yield messageModel_1.default.getMessageById(id);
                if (!message) {
                    return res.status(404).json({ message: 'Message non trouvé' });
                }
                const isRecipient = message.recipients.some(r => r.recipient_id === userId);
                if (!isRecipient) {
                    return res.status(403).json({ message: 'Vous n\'êtes pas un destinataire de ce message' });
                }
                const updated = yield messageModel_1.default.markMessageAsRead(id, userId);
                if (!updated) {
                    return res.status(500).json({ message: 'Erreur lors du marquage du message comme lu' });
                }
                return res.status(200).json({ message: 'Message marqué comme lu' });
            }
            catch (error) {
                console.error(`Erreur lors du marquage du message ${req.params.id} comme lu:`, error);
                return res.status(500).json({ message: 'Erreur lors du marquage du message comme lu' });
            }
        });
    }
    /**
     * Marquer un message comme supprimé
     */
    markAsDeleted(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si l'utilisateur est un destinataire du message
                const message = yield messageModel_1.default.getMessageById(id);
                if (!message) {
                    return res.status(404).json({ message: 'Message non trouvé' });
                }
                const isRecipient = message.recipients.some(r => r.recipient_id === userId);
                if (!isRecipient) {
                    return res.status(403).json({ message: 'Vous n\'êtes pas un destinataire de ce message' });
                }
                const updated = yield messageModel_1.default.markMessageAsDeleted(id, userId);
                if (!updated) {
                    return res.status(500).json({ message: 'Erreur lors du marquage du message comme supprimé' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'delete',
                    target_type: 'message',
                    target_id: id,
                    details: `Message "${message.subject}" marqué comme supprimé`
                });
                return res.status(200).json({ message: 'Message marqué comme supprimé' });
            }
            catch (error) {
                console.error(`Erreur lors du marquage du message ${req.params.id} comme supprimé:`, error);
                return res.status(500).json({ message: 'Erreur lors du marquage du message comme supprimé' });
            }
        });
    }
    /**
     * Restaurer un message supprimé
     */
    restoreMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si l'utilisateur est un destinataire du message
                const message = yield messageModel_1.default.getMessageById(id);
                if (!message) {
                    return res.status(404).json({ message: 'Message non trouvé' });
                }
                const isRecipient = message.recipients.some(r => r.recipient_id === userId);
                if (!isRecipient) {
                    return res.status(403).json({ message: 'Vous n\'êtes pas un destinataire de ce message' });
                }
                const updated = yield messageModel_1.default.restoreDeletedMessage(id, userId);
                if (!updated) {
                    return res.status(500).json({ message: 'Erreur lors de la restauration du message' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'restore',
                    target_type: 'message',
                    target_id: id,
                    details: `Message "${message.subject}" restauré`
                });
                return res.status(200).json({ message: 'Message restauré avec succès' });
            }
            catch (error) {
                console.error(`Erreur lors de la restauration du message ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la restauration du message' });
            }
        });
    }
    /**
     * Supprimer définitivement un message
     */
    deleteMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si l'utilisateur est l'expéditeur du message
                const message = yield messageModel_1.default.getMessageById(id);
                if (!message) {
                    return res.status(404).json({ message: 'Message non trouvé' });
                }
                if (message.sender_id !== userId) {
                    return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer définitivement ce message' });
                }
                // Supprimer les fichiers des pièces jointes
                for (const attachment of message.attachments) {
                    const filePath = path_1.default.join(__dirname, '../../', attachment.file_path);
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                }
                const deleted = yield messageModel_1.default.deleteMessage(id);
                if (!deleted) {
                    return res.status(500).json({ message: 'Erreur lors de la suppression définitive du message' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'permanent_delete',
                    target_type: 'message',
                    target_id: id,
                    details: `Message "${message.subject}" supprimé définitivement`
                });
                return res.status(200).json({ message: 'Message supprimé définitivement' });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression définitive du message ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la suppression définitive du message' });
            }
        });
    }
    /**
     * Télécharger une pièce jointe
     */
    downloadAttachment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { messageId, attachmentId } = req.params;
                const userId = req.user.id;
                // Vérifier si l'utilisateur est autorisé à voir ce message
                const message = yield messageModel_1.default.getMessageById(messageId);
                if (!message) {
                    res.status(404).json({ message: 'Message non trouvé' });
                    return;
                }
                const isRecipient = message.recipients.some(r => r.recipient_id === userId);
                const isSender = message.sender_id === userId;
                if (!isRecipient && !isSender) {
                    res.status(403).json({ message: 'Vous n\'êtes pas autorisé à télécharger cette pièce jointe' });
                    return;
                }
                // Trouver la pièce jointe
                const attachment = message.attachments.find(a => a.id === attachmentId);
                if (!attachment) {
                    res.status(404).json({ message: 'Pièce jointe non trouvée' });
                    return;
                }
                // Chemin complet du fichier
                const filePath = path_1.default.join(__dirname, '../../', attachment.file_path);
                // Vérifier si le fichier existe
                if (!fs_1.default.existsSync(filePath)) {
                    res.status(404).json({ message: 'Fichier non trouvé sur le serveur' });
                    return;
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'download',
                    target_type: 'message_attachment',
                    target_id: attachmentId,
                    details: `Pièce jointe "${attachment.file_name}" téléchargée`
                });
                // Envoyer le fichier au client
                res.download(filePath, attachment.file_name, (err) => {
                    if (err) {
                        console.error('Erreur lors du téléchargement de la pièce jointe:', err);
                        res.status(500).json({ message: 'Erreur lors du téléchargement de la pièce jointe' });
                    }
                });
            }
            catch (error) {
                console.error(`Erreur lors du téléchargement de la pièce jointe:`, error);
                res.status(500).json({ message: 'Erreur lors du téléchargement de la pièce jointe' });
            }
        });
    }
    /**
     * Compter les messages non lus
     */
    countUnreadMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const count = yield messageModel_1.default.countUnreadMessages(userId);
                return res.status(200).json({ count });
            }
            catch (error) {
                console.error('Erreur lors du comptage des messages non lus:', error);
                return res.status(500).json({ message: 'Erreur lors du comptage des messages non lus' });
            }
        });
    }
    /**
     * Rechercher des messages
     */
    searchMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { query } = req.query;
                if (!query || typeof query !== 'string') {
                    return res.status(400).json({ message: 'Terme de recherche requis' });
                }
                const messages = yield messageModel_1.default.searchMessages(userId, query);
                return res.status(200).json(messages);
            }
            catch (error) {
                console.error('Erreur lors de la recherche de messages:', error);
                return res.status(500).json({ message: 'Erreur lors de la recherche de messages' });
            }
        });
    }
}
exports.MessageController = MessageController;
exports.default = new MessageController();
