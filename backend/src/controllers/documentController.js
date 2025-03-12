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
exports.DocumentController = void 0;
const documentModel_1 = require("../models/documentModel");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const audit_1 = require("../utils/audit");
class DocumentController {
    constructor() {
        this.documentModel = new documentModel_1.DocumentModel();
        this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    }
    // ========== Méthodes pour les documents ==========
    getAllDocuments(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const documents = yield this.documentModel.getAllDocuments();
                return res.status(200).json(documents);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des documents:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des documents' });
            }
        });
    }
    getDocumentById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const document = yield this.documentModel.getDocumentById(id);
                if (!document) {
                    return res.status(404).json({ message: 'Document non trouvé' });
                }
                return res.status(200).json(document);
            }
            catch (error) {
                console.error('Erreur lors de la récupération du document:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération du document' });
            }
        });
    }
    getDocumentsByCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { categoryId } = req.params;
                const documents = yield this.documentModel.getDocumentsByCategory(categoryId);
                return res.status(200).json(documents);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des documents par catégorie:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des documents par catégorie' });
            }
        });
    }
    getDocumentsByUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const documents = yield this.documentModel.getDocumentsByUser(userId);
                return res.status(200).json(documents);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des documents par utilisateur:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des documents par utilisateur' });
            }
        });
    }
    uploadDocument(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Vérifier si un fichier a été téléchargé
                if (!req.file) {
                    return res.status(400).json({ message: 'Aucun fichier n\'a été téléchargé' });
                }
                const { title, description, category_id } = req.body;
                const userId = req.user.id; // Récupérer l'ID de l'utilisateur à partir du token JWT
                // Générer un nom de fichier unique pour éviter les collisions
                const fileExtension = path_1.default.extname(req.file.originalname);
                const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
                // Chemin où le fichier sera stocké
                const filePath = path_1.default.join(this.uploadDir, uniqueFilename);
                // Déplacer le fichier téléchargé vers le dossier de destination
                fs_1.default.renameSync(req.file.path, path_1.default.join(__dirname, '../../', filePath));
                // Créer l'entrée dans la base de données
                const newDocument = yield this.documentModel.createDocument({
                    title,
                    description,
                    file_path: filePath,
                    file_type: req.file.mimetype,
                    file_size: req.file.size,
                    category_id: category_id || undefined,
                    uploaded_by: userId
                });
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'create',
                    target_type: 'document',
                    target_id: newDocument.id,
                    details: `Document "${title}" téléchargé`
                });
                return res.status(201).json(newDocument);
            }
            catch (error) {
                console.error('Erreur lors du téléchargement du document:', error);
                return res.status(500).json({ message: 'Erreur lors du téléchargement du document' });
            }
        });
    }
    updateDocument(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { title, description, category_id } = req.body;
                const userId = req.user.id;
                // Vérifier si le document existe
                const existingDocument = yield this.documentModel.getDocumentById(id);
                if (!existingDocument) {
                    return res.status(404).json({ message: 'Document non trouvé' });
                }
                // Préparer les données à mettre à jour
                const updateData = {};
                if (title !== undefined)
                    updateData.title = title;
                if (description !== undefined)
                    updateData.description = description;
                if (category_id !== undefined)
                    updateData.category_id = category_id || null;
                // Si un nouveau fichier est téléchargé
                if (req.file) {
                    // Supprimer l'ancien fichier
                    const oldFilePath = path_1.default.join(__dirname, '../../', existingDocument.file_path);
                    if (fs_1.default.existsSync(oldFilePath)) {
                        fs_1.default.unlinkSync(oldFilePath);
                    }
                    // Générer un nom de fichier unique pour le nouveau fichier
                    const fileExtension = path_1.default.extname(req.file.originalname);
                    const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
                    const filePath = path_1.default.join(this.uploadDir, uniqueFilename);
                    // Déplacer le nouveau fichier
                    fs_1.default.renameSync(req.file.path, path_1.default.join(__dirname, '../../', filePath));
                    // Mettre à jour les informations du fichier
                    updateData.file_path = filePath;
                    updateData.file_type = req.file.mimetype;
                    updateData.file_size = req.file.size;
                }
                // Mettre à jour le document dans la base de données
                const updatedDocument = yield this.documentModel.updateDocument(id, updateData);
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'update',
                    target_type: 'document',
                    target_id: id,
                    details: `Document "${existingDocument.title}" mis à jour`
                });
                return res.status(200).json(updatedDocument);
            }
            catch (error) {
                console.error('Erreur lors de la mise à jour du document:', error);
                return res.status(500).json({ message: 'Erreur lors de la mise à jour du document' });
            }
        });
    }
    deleteDocument(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si le document existe
                const document = yield this.documentModel.getDocumentById(id);
                if (!document) {
                    return res.status(404).json({ message: 'Document non trouvé' });
                }
                // Supprimer le fichier physique
                const filePath = path_1.default.join(__dirname, '../../', document.file_path);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
                // Supprimer l'entrée dans la base de données
                const deleted = yield this.documentModel.deleteDocument(id);
                if (!deleted) {
                    return res.status(500).json({ message: 'Erreur lors de la suppression du document' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'delete',
                    target_type: 'document',
                    target_id: id,
                    details: `Document "${document.title}" supprimé`
                });
                return res.status(200).json({ message: 'Document supprimé avec succès' });
            }
            catch (error) {
                console.error('Erreur lors de la suppression du document:', error);
                return res.status(500).json({ message: 'Erreur lors de la suppression du document' });
            }
        });
    }
    downloadDocument(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Récupérer les informations du document
                const document = yield this.documentModel.getDocumentById(id);
                if (!document) {
                    res.status(404).json({ message: 'Document non trouvé' });
                    return;
                }
                // Chemin complet du fichier
                const filePath = path_1.default.join(__dirname, '../../', document.file_path);
                // Vérifier si le fichier existe
                if (!fs_1.default.existsSync(filePath)) {
                    res.status(404).json({ message: 'Fichier non trouvé sur le serveur' });
                    return;
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'download',
                    target_type: 'document',
                    target_id: id,
                    details: `Document "${document.title}" téléchargé par l'utilisateur`
                });
                // Envoyer le fichier au client
                res.download(filePath, document.title + path_1.default.extname(document.file_path), (err) => {
                    if (err) {
                        console.error('Erreur lors du téléchargement du fichier:', err);
                        res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
                    }
                });
            }
            catch (error) {
                console.error('Erreur lors du téléchargement du document:', error);
                res.status(500).json({ message: 'Erreur lors du téléchargement du document' });
            }
        });
    }
    // ========== Méthodes pour les catégories de documents ==========
    getAllCategories(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const categories = yield this.documentModel.getAllCategories();
                return res.status(200).json(categories);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des catégories:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
            }
        });
    }
    getCategoryById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const category = yield this.documentModel.getCategoryById(id);
                if (!category) {
                    return res.status(404).json({ message: 'Catégorie non trouvée' });
                }
                return res.status(200).json(category);
            }
            catch (error) {
                console.error('Erreur lors de la récupération de la catégorie:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération de la catégorie' });
            }
        });
    }
    createCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, description } = req.body;
                const userId = req.user.id;
                if (!name) {
                    return res.status(400).json({ message: 'Le nom de la catégorie est requis' });
                }
                const newCategory = yield this.documentModel.createCategory({
                    name,
                    description,
                    created_by: userId
                });
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'create',
                    target_type: 'document_category',
                    target_id: newCategory.id,
                    details: `Catégorie de document "${name}" créée`
                });
                return res.status(201).json(newCategory);
            }
            catch (error) {
                console.error('Erreur lors de la création de la catégorie:', error);
                return res.status(500).json({ message: 'Erreur lors de la création de la catégorie' });
            }
        });
    }
    updateCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { name, description } = req.body;
                const userId = req.user.id;
                // Vérifier si la catégorie existe
                const existingCategory = yield this.documentModel.getCategoryById(id);
                if (!existingCategory) {
                    return res.status(404).json({ message: 'Catégorie non trouvée' });
                }
                // Préparer les données à mettre à jour
                const updateData = {};
                if (name !== undefined)
                    updateData.name = name;
                if (description !== undefined)
                    updateData.description = description;
                // Mettre à jour la catégorie dans la base de données
                const updatedCategory = yield this.documentModel.updateCategory(id, updateData);
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'update',
                    target_type: 'document_category',
                    target_id: id,
                    details: `Catégorie de document "${existingCategory.name}" mise à jour`
                });
                return res.status(200).json(updatedCategory);
            }
            catch (error) {
                console.error('Erreur lors de la mise à jour de la catégorie:', error);
                return res.status(500).json({ message: 'Erreur lors de la mise à jour de la catégorie' });
            }
        });
    }
    deleteCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si la catégorie existe
                const category = yield this.documentModel.getCategoryById(id);
                if (!category) {
                    return res.status(404).json({ message: 'Catégorie non trouvée' });
                }
                // Supprimer la catégorie
                const deleted = yield this.documentModel.deleteCategory(id);
                if (!deleted) {
                    return res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'delete',
                    target_type: 'document_category',
                    target_id: id,
                    details: `Catégorie de document "${category.name}" supprimée`
                });
                return res.status(200).json({ message: 'Catégorie supprimée avec succès' });
            }
            catch (error) {
                console.error('Erreur lors de la suppression de la catégorie:', error);
                return res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
            }
        });
    }
}
exports.DocumentController = DocumentController;
