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
exports.FamilyController = void 0;
const familyModel_1 = __importDefault(require("../models/familyModel"));
const audit_1 = require("../utils/audit");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
class FamilyController {
    /**
     * Récupérer tous les membres de la famille
     */
    getAllFamilyMembers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const members = yield familyModel_1.default.getAllFamilyMembers();
                return res.status(200).json(members);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des membres de la famille:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des membres de la famille' });
            }
        });
    }
    /**
     * Récupérer un membre de la famille par son ID
     */
    getFamilyMemberById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const member = yield familyModel_1.default.getFamilyMemberById(id);
                if (!member) {
                    return res.status(404).json({ message: 'Membre de la famille non trouvé' });
                }
                return res.status(200).json(member);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération du membre de la famille ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération du membre de la famille' });
            }
        });
    }
    /**
     * Récupérer un membre de la famille avec toutes ses relations
     */
    getFamilyMemberWithRelations(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const memberWithRelations = yield familyModel_1.default.getFamilyMemberWithRelations(id);
                if (!memberWithRelations) {
                    return res.status(404).json({ message: 'Membre de la famille non trouvé' });
                }
                return res.status(200).json(memberWithRelations);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération du membre de la famille avec relations ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération du membre de la famille avec relations' });
            }
        });
    }
    /**
     * Récupérer les membres de la famille liés à un profil utilisateur
     */
    getFamilyMembersByProfileId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { profileId } = req.params;
                const members = yield familyModel_1.default.getFamilyMembersByProfileId(profileId);
                return res.status(200).json(members);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des membres de la famille pour le profil ${req.params.profileId}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des membres de la famille pour le profil' });
            }
        });
    }
    /**
     * Rechercher des membres de la famille
     */
    searchFamilyMembers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { query } = req.query;
                if (!query || typeof query !== 'string') {
                    return res.status(400).json({ message: 'Terme de recherche requis' });
                }
                const members = yield familyModel_1.default.searchFamilyMembers(query);
                return res.status(200).json(members);
            }
            catch (error) {
                console.error('Erreur lors de la recherche de membres de la famille:', error);
                return res.status(500).json({ message: 'Erreur lors de la recherche de membres de la famille' });
            }
        });
    }
    /**
     * Créer un nouveau membre de la famille
     */
    createFamilyMember(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { profile_id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, bio, is_alive } = req.body;
                // Validation des données
                if (!first_name || !last_name || !gender) {
                    return res.status(400).json({ message: 'Données incomplètes pour la création du membre de la famille' });
                }
                let photo_url = undefined;
                // Traitement de la photo si présente
                if (req.file) {
                    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
                    const photosDir = path_1.default.join(uploadDir, 'family_photos');
                    // Créer le dossier des photos s'il n'existe pas
                    if (!fs_1.default.existsSync(path_1.default.join(__dirname, '../../', photosDir))) {
                        fs_1.default.mkdirSync(path_1.default.join(__dirname, '../../', photosDir), { recursive: true });
                    }
                    // Générer un nom de fichier unique
                    const fileExtension = path_1.default.extname(req.file.originalname);
                    const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
                    const filePath = path_1.default.join(photosDir, uniqueFilename);
                    // Déplacer le fichier téléchargé
                    fs_1.default.renameSync(req.file.path, path_1.default.join(__dirname, '../../', filePath));
                    photo_url = filePath;
                }
                // Créer le membre de la famille
                const newMember = yield familyModel_1.default.createFamilyMember({
                    profile_id,
                    first_name,
                    last_name,
                    maiden_name,
                    gender: gender,
                    birth_date: birth_date ? new Date(birth_date) : undefined,
                    birth_place,
                    death_date: death_date ? new Date(death_date) : undefined,
                    death_place,
                    bio,
                    photo_url,
                    is_alive: is_alive !== undefined ? is_alive : true
                });
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'create',
                    target_type: 'family_member',
                    target_id: newMember.id,
                    details: `Membre de la famille créé: ${first_name} ${last_name}`
                });
                return res.status(201).json(newMember);
            }
            catch (error) {
                console.error('Erreur lors de la création du membre de la famille:', error);
                return res.status(500).json({ message: 'Erreur lors de la création du membre de la famille' });
            }
        });
    }
    /**
     * Mettre à jour un membre de la famille
     */
    updateFamilyMember(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si le membre existe
                const existingMember = yield familyModel_1.default.getFamilyMemberById(id);
                if (!existingMember) {
                    return res.status(404).json({ message: 'Membre de la famille non trouvé' });
                }
                const { profile_id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, bio, is_alive } = req.body;
                // Préparer les données à mettre à jour
                const updateData = {};
                if (profile_id !== undefined)
                    updateData.profile_id = profile_id;
                if (first_name !== undefined)
                    updateData.first_name = first_name;
                if (last_name !== undefined)
                    updateData.last_name = last_name;
                if (maiden_name !== undefined)
                    updateData.maiden_name = maiden_name;
                if (gender !== undefined)
                    updateData.gender = gender;
                if (birth_date !== undefined)
                    updateData.birth_date = birth_date ? new Date(birth_date) : undefined;
                if (birth_place !== undefined)
                    updateData.birth_place = birth_place;
                if (death_date !== undefined)
                    updateData.death_date = death_date ? new Date(death_date) : undefined;
                if (death_place !== undefined)
                    updateData.death_place = death_place;
                if (bio !== undefined)
                    updateData.bio = bio;
                if (is_alive !== undefined)
                    updateData.is_alive = is_alive;
                // Traitement de la photo si présente
                if (req.file) {
                    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
                    const photosDir = path_1.default.join(uploadDir, 'family_photos');
                    // Créer le dossier des photos s'il n'existe pas
                    if (!fs_1.default.existsSync(path_1.default.join(__dirname, '../../', photosDir))) {
                        fs_1.default.mkdirSync(path_1.default.join(__dirname, '../../', photosDir), { recursive: true });
                    }
                    // Supprimer l'ancienne photo s'il en existe une
                    if (existingMember.photo_url) {
                        const oldFilePath = path_1.default.join(__dirname, '../../', existingMember.photo_url);
                        if (fs_1.default.existsSync(oldFilePath)) {
                            fs_1.default.unlinkSync(oldFilePath);
                        }
                    }
                    // Générer un nom de fichier unique
                    const fileExtension = path_1.default.extname(req.file.originalname);
                    const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
                    const filePath = path_1.default.join(photosDir, uniqueFilename);
                    // Déplacer le fichier téléchargé
                    fs_1.default.renameSync(req.file.path, path_1.default.join(__dirname, '../../', filePath));
                    updateData.photo_url = filePath;
                }
                // Mettre à jour le membre de la famille
                const updatedMember = yield familyModel_1.default.updateFamilyMember(id, updateData);
                if (!updatedMember) {
                    return res.status(500).json({ message: 'Erreur lors de la mise à jour du membre de la famille' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'update',
                    target_type: 'family_member',
                    target_id: id,
                    details: `Membre de la famille mis à jour: ${updatedMember.first_name} ${updatedMember.last_name}`
                });
                return res.status(200).json(updatedMember);
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour du membre de la famille ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la mise à jour du membre de la famille' });
            }
        });
    }
    /**
     * Supprimer un membre de la famille
     */
    deleteFamilyMember(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si le membre existe
                const member = yield familyModel_1.default.getFamilyMemberById(id);
                if (!member) {
                    return res.status(404).json({ message: 'Membre de la famille non trouvé' });
                }
                // Supprimer la photo si elle existe
                if (member.photo_url) {
                    const filePath = path_1.default.join(__dirname, '../../', member.photo_url);
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                }
                // Supprimer le membre de la famille
                const deleted = yield familyModel_1.default.deleteFamilyMember(id);
                if (!deleted) {
                    return res.status(500).json({ message: 'Erreur lors de la suppression du membre de la famille' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'delete',
                    target_type: 'family_member',
                    target_id: id,
                    details: `Membre de la famille supprimé: ${member.first_name} ${member.last_name}`
                });
                return res.status(200).json({ message: 'Membre de la famille supprimé avec succès' });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression du membre de la famille ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la suppression du membre de la famille' });
            }
        });
    }
    /**
     * Télécharger la photo d'un membre de la famille
     */
    downloadFamilyMemberPhoto(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                // Récupérer les informations du membre
                const member = yield familyModel_1.default.getFamilyMemberById(id);
                if (!member) {
                    res.status(404).json({ message: 'Membre de la famille non trouvé' });
                    return;
                }
                // Vérifier si une photo est disponible
                if (!member.photo_url) {
                    res.status(404).json({ message: 'Aucune photo disponible pour ce membre de la famille' });
                    return;
                }
                // Chemin complet du fichier
                const filePath = path_1.default.join(__dirname, '../../', member.photo_url);
                // Vérifier si le fichier existe
                if (!fs_1.default.existsSync(filePath)) {
                    res.status(404).json({ message: 'Fichier de photo non trouvé sur le serveur' });
                    return;
                }
                // Envoyer le fichier au client
                res.download(filePath, `photo-${member.first_name}-${member.last_name}${path_1.default.extname(member.photo_url)}`, (err) => {
                    if (err) {
                        console.error('Erreur lors du téléchargement de la photo:', err);
                        res.status(500).json({ message: 'Erreur lors du téléchargement de la photo' });
                    }
                });
            }
            catch (error) {
                console.error(`Erreur lors du téléchargement de la photo du membre de la famille ${req.params.id}:`, error);
                res.status(500).json({ message: 'Erreur lors du téléchargement de la photo' });
            }
        });
    }
    /**
     * Récupérer toutes les relations familiales
     */
    getAllFamilyRelationships(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const relationships = yield familyModel_1.default.getAllFamilyRelationships();
                return res.status(200).json(relationships);
            }
            catch (error) {
                console.error('Erreur lors de la récupération des relations familiales:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des relations familiales' });
            }
        });
    }
    /**
     * Récupérer une relation familiale par son ID
     */
    getFamilyRelationshipById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const relationship = yield familyModel_1.default.getFamilyRelationshipById(id);
                if (!relationship) {
                    return res.status(404).json({ message: 'Relation familiale non trouvée' });
                }
                return res.status(200).json(relationship);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération de la relation familiale ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération de la relation familiale' });
            }
        });
    }
    /**
     * Récupérer les relations d'un membre de la famille
     */
    getFamilyRelationshipsByMemberId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { memberId } = req.params;
                const relationships = yield familyModel_1.default.getFamilyRelationshipsByMemberId(memberId);
                return res.status(200).json(relationships);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des relations du membre de la famille ${req.params.memberId}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération des relations du membre de la famille' });
            }
        });
    }
    /**
     * Créer une nouvelle relation familiale
     */
    createFamilyRelationship(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { from_member_id, to_member_id, relationship_type, relationship_details, start_date, end_date } = req.body;
                // Validation des données
                if (!from_member_id || !to_member_id || !relationship_type) {
                    return res.status(400).json({ message: 'Données incomplètes pour la création de la relation familiale' });
                }
                // Vérifier que les membres existent
                const fromMember = yield familyModel_1.default.getFamilyMemberById(from_member_id);
                const toMember = yield familyModel_1.default.getFamilyMemberById(to_member_id);
                if (!fromMember || !toMember) {
                    return res.status(404).json({ message: 'Un ou plusieurs membres de la famille non trouvés' });
                }
                // Vérifier que le type de relation est valide
                if (!['parent', 'child', 'spouse', 'sibling', 'other'].includes(relationship_type)) {
                    return res.status(400).json({ message: 'Type de relation invalide' });
                }
                // Créer la relation familiale
                let newRelationship;
                // Utiliser des méthodes spécifiques pour certains types de relations
                if (relationship_type === 'parent') {
                    const result = yield familyModel_1.default.addParentChildRelationship(to_member_id, // Le "to" devient le parent
                    from_member_id, // Le "from" devient l'enfant
                    relationship_details);
                    newRelationship = result.parent;
                }
                else if (relationship_type === 'child') {
                    const result = yield familyModel_1.default.addParentChildRelationship(from_member_id, // Le "from" devient le parent
                    to_member_id, // Le "to" devient l'enfant
                    relationship_details);
                    newRelationship = result.parent;
                }
                else if (relationship_type === 'sibling') {
                    const result = yield familyModel_1.default.addSiblingRelationship(from_member_id, to_member_id, relationship_details);
                    newRelationship = result.sibling1;
                }
                else if (relationship_type === 'spouse') {
                    const result = yield familyModel_1.default.addSpouseRelationship(from_member_id, to_member_id, start_date ? new Date(start_date) : undefined, end_date ? new Date(end_date) : undefined, relationship_details);
                    newRelationship = result.spouse1;
                }
                else {
                    // Pour les autres types de relations
                    newRelationship = yield familyModel_1.default.createFamilyRelationship({
                        from_member_id,
                        to_member_id,
                        relationship_type,
                        relationship_details,
                        start_date: start_date ? new Date(start_date) : undefined,
                        end_date: end_date ? new Date(end_date) : undefined
                    });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'create',
                    target_type: 'family_relationship',
                    target_id: newRelationship.id,
                    details: `Relation familiale créée: ${fromMember.first_name} ${fromMember.last_name} -> ${toMember.first_name} ${toMember.last_name} (${relationship_type})`
                });
                return res.status(201).json(newRelationship);
            }
            catch (error) {
                console.error('Erreur lors de la création de la relation familiale:', error);
                return res.status(500).json({ message: 'Erreur lors de la création de la relation familiale' });
            }
        });
    }
    /**
     * Mettre à jour une relation familiale
     */
    updateFamilyRelationship(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si la relation existe
                const existingRelationship = yield familyModel_1.default.getFamilyRelationshipById(id);
                if (!existingRelationship) {
                    return res.status(404).json({ message: 'Relation familiale non trouvée' });
                }
                const { relationship_details, start_date, end_date } = req.body;
                // Préparer les données à mettre à jour
                const updateData = {};
                if (relationship_details !== undefined)
                    updateData.relationship_details = relationship_details;
                if (start_date !== undefined)
                    updateData.start_date = start_date ? new Date(start_date) : undefined;
                if (end_date !== undefined)
                    updateData.end_date = end_date ? new Date(end_date) : undefined;
                // Mettre à jour la relation familiale
                const updatedRelationship = yield familyModel_1.default.updateFamilyRelationship(id, updateData);
                if (!updatedRelationship) {
                    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la relation familiale' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'update',
                    target_type: 'family_relationship',
                    target_id: id,
                    details: `Relation familiale mise à jour: ${updatedRelationship.relationship_type}`
                });
                return res.status(200).json(updatedRelationship);
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de la relation familiale ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la mise à jour de la relation familiale' });
            }
        });
    }
    /**
     * Supprimer une relation familiale
     */
    deleteFamilyRelationship(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const userId = req.user.id;
                // Vérifier si la relation existe
                const relationship = yield familyModel_1.default.getFamilyRelationshipById(id);
                if (!relationship) {
                    return res.status(404).json({ message: 'Relation familiale non trouvée' });
                }
                // Supprimer la relation familiale
                const deleted = yield familyModel_1.default.deleteFamilyRelationship(id);
                if (!deleted) {
                    return res.status(500).json({ message: 'Erreur lors de la suppression de la relation familiale' });
                }
                // Enregistrer l'action dans les logs d'audit
                yield (0, audit_1.createAuditLog)({
                    user_id: userId,
                    action: 'delete',
                    target_type: 'family_relationship',
                    target_id: id,
                    details: `Relation familiale supprimée: ${relationship.relationship_type}`
                });
                return res.status(200).json({ message: 'Relation familiale supprimée avec succès' });
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de la relation familiale ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la suppression de la relation familiale' });
            }
        });
    }
    /**
     * Récupérer l'arbre généalogique complet
     */
    getFamilyTree(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const familyTree = yield familyModel_1.default.getFamilyTree();
                return res.status(200).json(familyTree);
            }
            catch (error) {
                console.error('Erreur lors de la récupération de l\'arbre généalogique:', error);
                return res.status(500).json({ message: 'Erreur lors de la récupération de l\'arbre généalogique' });
            }
        });
    }
    /**
     * Récupérer l'arbre généalogique d'un membre spécifique
     */
    getMemberFamilyTree(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const degree = req.query.degree ? parseInt(req.query.degree) : 2;
                // Vérifier si le membre existe
                const member = yield familyModel_1.default.getFamilyMemberById(id);
                if (!member) {
                    return res.status(404).json({ message: 'Membre de la famille non trouvé' });
                }
                const familyTree = yield familyModel_1.default.getMemberFamilyTree(id, degree);
                return res.status(200).json(familyTree);
            }
            catch (error) {
                console.error(`Erreur lors de la récupération de l'arbre généalogique du membre ${req.params.id}:`, error);
                return res.status(500).json({ message: 'Erreur lors de la récupération de l\'arbre généalogique du membre' });
            }
        });
    }
}
exports.FamilyController = FamilyController;
exports.default = new FamilyController();
