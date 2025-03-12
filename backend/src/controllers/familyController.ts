import { Request, Response } from 'express';
import familyModel, { FamilyMember, FamilyRelationship } from '../models/familyModel';
import { createAuditLog } from '../utils/audit';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export class FamilyController {
  /**
   * Récupérer tous les membres de la famille
   */
  async getAllFamilyMembers(req: Request, res: Response): Promise<Response> {
    try {
      const members = await familyModel.getAllFamilyMembers();
      return res.status(200).json(members);
    } catch (error) {
      console.error('Erreur lors de la récupération des membres de la famille:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des membres de la famille' });
    }
  }

  /**
   * Récupérer un membre de la famille par son ID
   */
  async getFamilyMemberById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const member = await familyModel.getFamilyMemberById(id);
      
      if (!member) {
        return res.status(404).json({ message: 'Membre de la famille non trouvé' });
      }
      
      return res.status(200).json(member);
    } catch (error) {
      console.error(`Erreur lors de la récupération du membre de la famille ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du membre de la famille' });
    }
  }

  /**
   * Récupérer un membre de la famille avec toutes ses relations
   */
  async getFamilyMemberWithRelations(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const memberWithRelations = await familyModel.getFamilyMemberWithRelations(id);
      
      if (!memberWithRelations) {
        return res.status(404).json({ message: 'Membre de la famille non trouvé' });
      }
      
      return res.status(200).json(memberWithRelations);
    } catch (error) {
      console.error(`Erreur lors de la récupération du membre de la famille avec relations ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du membre de la famille avec relations' });
    }
  }

  /**
   * Récupérer les membres de la famille liés à un profil utilisateur
   */
  async getFamilyMembersByProfileId(req: Request, res: Response): Promise<Response> {
    try {
      const { profileId } = req.params;
      const members = await familyModel.getFamilyMembersByProfileId(profileId);
      return res.status(200).json(members);
    } catch (error) {
      console.error(`Erreur lors de la récupération des membres de la famille pour le profil ${req.params.profileId}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des membres de la famille pour le profil' });
    }
  }

  /**
   * Rechercher des membres de la famille
   */
  async searchFamilyMembers(req: Request, res: Response): Promise<Response> {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Terme de recherche requis' });
      }
      
      const members = await familyModel.searchFamilyMembers(query);
      return res.status(200).json(members);
    } catch (error) {
      console.error('Erreur lors de la recherche de membres de la famille:', error);
      return res.status(500).json({ message: 'Erreur lors de la recherche de membres de la famille' });
    }
  }

  /**
   * Créer un nouveau membre de la famille
   */
  async createFamilyMember(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const {
        profile_id,
        first_name,
        last_name,
        maiden_name,
        gender,
        birth_date,
        birth_place,
        death_date,
        death_place,
        bio,
        is_alive
      } = req.body;
      
      // Validation des données
      if (!first_name || !last_name || !gender) {
        return res.status(400).json({ message: 'Données incomplètes pour la création du membre de la famille' });
      }
      
      let photo_url: string | undefined = undefined;
      
      // Traitement de la photo si présente
      if (req.file) {
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        const photosDir = path.join(uploadDir, 'family_photos');
        
        // Créer le dossier des photos s'il n'existe pas
        if (!fs.existsSync(path.join(__dirname, '../../', photosDir))) {
          fs.mkdirSync(path.join(__dirname, '../../', photosDir), { recursive: true });
        }
        
        // Générer un nom de fichier unique
        const fileExtension = path.extname(req.file.originalname);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(photosDir, uniqueFilename);
        
        // Déplacer le fichier téléchargé
        fs.renameSync(req.file.path, path.join(__dirname, '../../', filePath));
        
        photo_url = filePath;
      }
      
      // Créer le membre de la famille
      const newMember = await familyModel.createFamilyMember({
        profile_id,
        first_name,
        last_name,
        maiden_name,
        gender: gender as 'male' | 'female' | 'other',
        birth_date: birth_date ? new Date(birth_date) : undefined,
        birth_place,
        death_date: death_date ? new Date(death_date) : undefined,
        death_place,
        bio,
        photo_url,
        is_alive: is_alive !== undefined ? is_alive : true
      });
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'create',
        target_type: 'family_member',
        target_id: newMember.id,
        details: `Membre de la famille créé: ${first_name} ${last_name}`
      });
      
      return res.status(201).json(newMember);
    } catch (error) {
      console.error('Erreur lors de la création du membre de la famille:', error);
      return res.status(500).json({ message: 'Erreur lors de la création du membre de la famille' });
    }
  }

  /**
   * Mettre à jour un membre de la famille
   */
  async updateFamilyMember(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si le membre existe
      const existingMember = await familyModel.getFamilyMemberById(id);
      if (!existingMember) {
        return res.status(404).json({ message: 'Membre de la famille non trouvé' });
      }
      
      const {
        profile_id,
        first_name,
        last_name,
        maiden_name,
        gender,
        birth_date,
        birth_place,
        death_date,
        death_place,
        bio,
        is_alive
      } = req.body;
      
      // Préparer les données à mettre à jour
      const updateData: Partial<FamilyMember> = {};
      
      if (profile_id !== undefined) updateData.profile_id = profile_id;
      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (maiden_name !== undefined) updateData.maiden_name = maiden_name;
      if (gender !== undefined) updateData.gender = gender;
      if (birth_date !== undefined) updateData.birth_date = birth_date ? new Date(birth_date) : undefined;
      if (birth_place !== undefined) updateData.birth_place = birth_place;
      if (death_date !== undefined) updateData.death_date = death_date ? new Date(death_date) : undefined;
      if (death_place !== undefined) updateData.death_place = death_place;
      if (bio !== undefined) updateData.bio = bio;
      if (is_alive !== undefined) updateData.is_alive = is_alive;
      
      // Traitement de la photo si présente
      if (req.file) {
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        const photosDir = path.join(uploadDir, 'family_photos');
        
        // Créer le dossier des photos s'il n'existe pas
        if (!fs.existsSync(path.join(__dirname, '../../', photosDir))) {
          fs.mkdirSync(path.join(__dirname, '../../', photosDir), { recursive: true });
        }
        
        // Supprimer l'ancienne photo s'il en existe une
        if (existingMember.photo_url) {
          const oldFilePath = path.join(__dirname, '../../', existingMember.photo_url);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        
        // Générer un nom de fichier unique
        const fileExtension = path.extname(req.file.originalname);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(photosDir, uniqueFilename);
        
        // Déplacer le fichier téléchargé
        fs.renameSync(req.file.path, path.join(__dirname, '../../', filePath));
        
        updateData.photo_url = filePath;
      }
      
      // Mettre à jour le membre de la famille
      const updatedMember = await familyModel.updateFamilyMember(id, updateData);
      
      if (!updatedMember) {
        return res.status(500).json({ message: 'Erreur lors de la mise à jour du membre de la famille' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'update',
        target_type: 'family_member',
        target_id: id,
        details: `Membre de la famille mis à jour: ${updatedMember.first_name} ${updatedMember.last_name}`
      });
      
      return res.status(200).json(updatedMember);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du membre de la famille ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du membre de la famille' });
    }
  }

  /**
   * Supprimer un membre de la famille
   */
  async deleteFamilyMember(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si le membre existe
      const member = await familyModel.getFamilyMemberById(id);
      if (!member) {
        return res.status(404).json({ message: 'Membre de la famille non trouvé' });
      }
      
      // Supprimer la photo si elle existe
      if (member.photo_url) {
        const filePath = path.join(__dirname, '../../', member.photo_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Supprimer le membre de la famille
      const deleted = await familyModel.deleteFamilyMember(id);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Erreur lors de la suppression du membre de la famille' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'delete',
        target_type: 'family_member',
        target_id: id,
        details: `Membre de la famille supprimé: ${member.first_name} ${member.last_name}`
      });
      
      return res.status(200).json({ message: 'Membre de la famille supprimé avec succès' });
    } catch (error) {
      console.error(`Erreur lors de la suppression du membre de la famille ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la suppression du membre de la famille' });
    }
  }

  /**
   * Télécharger la photo d'un membre de la famille
   */
  async downloadFamilyMemberPhoto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Récupérer les informations du membre
      const member = await familyModel.getFamilyMemberById(id);
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
      const filePath = path.join(__dirname, '../../', member.photo_url);
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ message: 'Fichier de photo non trouvé sur le serveur' });
        return;
      }
      
      // Envoyer le fichier au client
      res.download(filePath, `photo-${member.first_name}-${member.last_name}${path.extname(member.photo_url)}`, (err) => {
        if (err) {
          console.error('Erreur lors du téléchargement de la photo:', err);
          res.status(500).json({ message: 'Erreur lors du téléchargement de la photo' });
        }
      });
    } catch (error) {
      console.error(`Erreur lors du téléchargement de la photo du membre de la famille ${req.params.id}:`, error);
      res.status(500).json({ message: 'Erreur lors du téléchargement de la photo' });
    }
  }

  /**
   * Récupérer toutes les relations familiales
   */
  async getAllFamilyRelationships(req: Request, res: Response): Promise<Response> {
    try {
      const relationships = await familyModel.getAllFamilyRelationships();
      return res.status(200).json(relationships);
    } catch (error) {
      console.error('Erreur lors de la récupération des relations familiales:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des relations familiales' });
    }
  }

  /**
   * Récupérer une relation familiale par son ID
   */
  async getFamilyRelationshipById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const relationship = await familyModel.getFamilyRelationshipById(id);
      
      if (!relationship) {
        return res.status(404).json({ message: 'Relation familiale non trouvée' });
      }
      
      return res.status(200).json(relationship);
    } catch (error) {
      console.error(`Erreur lors de la récupération de la relation familiale ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération de la relation familiale' });
    }
  }

  /**
   * Récupérer les relations d'un membre de la famille
   */
  async getFamilyRelationshipsByMemberId(req: Request, res: Response): Promise<Response> {
    try {
      const { memberId } = req.params;
      const relationships = await familyModel.getFamilyRelationshipsByMemberId(memberId);
      return res.status(200).json(relationships);
    } catch (error) {
      console.error(`Erreur lors de la récupération des relations du membre de la famille ${req.params.memberId}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des relations du membre de la famille' });
    }
  }

  /**
   * Créer une nouvelle relation familiale
   */
  async createFamilyRelationship(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const {
        from_member_id,
        to_member_id,
        relationship_type,
        relationship_details,
        start_date,
        end_date
      } = req.body;
      
      // Validation des données
      if (!from_member_id || !to_member_id || !relationship_type) {
        return res.status(400).json({ message: 'Données incomplètes pour la création de la relation familiale' });
      }
      
      // Vérifier que les membres existent
      const fromMember = await familyModel.getFamilyMemberById(from_member_id);
      const toMember = await familyModel.getFamilyMemberById(to_member_id);
      
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
        const result = await familyModel.addParentChildRelationship(
          to_member_id, // Le "to" devient le parent
          from_member_id, // Le "from" devient l'enfant
          relationship_details
        );
        newRelationship = result.parent;
      } else if (relationship_type === 'child') {
        const result = await familyModel.addParentChildRelationship(
          from_member_id, // Le "from" devient le parent
          to_member_id, // Le "to" devient l'enfant
          relationship_details
        );
        newRelationship = result.parent;
      } else if (relationship_type === 'sibling') {
        const result = await familyModel.addSiblingRelationship(
          from_member_id,
          to_member_id,
          relationship_details
        );
        newRelationship = result.sibling1;
      } else if (relationship_type === 'spouse') {
        const result = await familyModel.addSpouseRelationship(
          from_member_id,
          to_member_id,
          start_date ? new Date(start_date) : undefined,
          end_date ? new Date(end_date) : undefined,
          relationship_details
        );
        newRelationship = result.spouse1;
      } else {
        // Pour les autres types de relations
        newRelationship = await familyModel.createFamilyRelationship({
          from_member_id,
          to_member_id,
          relationship_type,
          relationship_details,
          start_date: start_date ? new Date(start_date) : undefined,
          end_date: end_date ? new Date(end_date) : undefined
        });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'create',
        target_type: 'family_relationship',
        target_id: newRelationship.id,
        details: `Relation familiale créée: ${fromMember.first_name} ${fromMember.last_name} -> ${toMember.first_name} ${toMember.last_name} (${relationship_type})`
      });
      
      return res.status(201).json(newRelationship);
    } catch (error) {
      console.error('Erreur lors de la création de la relation familiale:', error);
      return res.status(500).json({ message: 'Erreur lors de la création de la relation familiale' });
    }
  }

  /**
   * Mettre à jour une relation familiale
   */
  async updateFamilyRelationship(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si la relation existe
      const existingRelationship = await familyModel.getFamilyRelationshipById(id);
      if (!existingRelationship) {
        return res.status(404).json({ message: 'Relation familiale non trouvée' });
      }
      
      const {
        relationship_details,
        start_date,
        end_date
      } = req.body;
      
      // Préparer les données à mettre à jour
      const updateData: Partial<FamilyRelationship> = {};
      
      if (relationship_details !== undefined) updateData.relationship_details = relationship_details;
      if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : undefined;
      if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : undefined;
      
      // Mettre à jour la relation familiale
      const updatedRelationship = await familyModel.updateFamilyRelationship(id, updateData);
      
      if (!updatedRelationship) {
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de la relation familiale' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'update',
        target_type: 'family_relationship',
        target_id: id,
        details: `Relation familiale mise à jour: ${updatedRelationship.relationship_type}`
      });
      
      return res.status(200).json(updatedRelationship);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la relation familiale ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour de la relation familiale' });
    }
  }

  /**
   * Supprimer une relation familiale
   */
  async deleteFamilyRelationship(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Vérifier si la relation existe
      const relationship = await familyModel.getFamilyRelationshipById(id);
      if (!relationship) {
        return res.status(404).json({ message: 'Relation familiale non trouvée' });
      }
      
      // Supprimer la relation familiale
      const deleted = await familyModel.deleteFamilyRelationship(id);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Erreur lors de la suppression de la relation familiale' });
      }
      
      // Enregistrer l'action dans les logs d'audit
      await createAuditLog({
        user_id: userId,
        action: 'delete',
        target_type: 'family_relationship',
        target_id: id,
        details: `Relation familiale supprimée: ${relationship.relationship_type}`
      });
      
      return res.status(200).json({ message: 'Relation familiale supprimée avec succès' });
    } catch (error) {
      console.error(`Erreur lors de la suppression de la relation familiale ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la suppression de la relation familiale' });
    }
  }

  /**
   * Récupérer l'arbre généalogique complet
   */
  async getFamilyTree(req: Request, res: Response): Promise<Response> {
    try {
      const familyTree = await familyModel.getFamilyTree();
      return res.status(200).json(familyTree);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'arbre généalogique:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération de l\'arbre généalogique' });
    }
  }

  /**
   * Récupérer l'arbre généalogique d'un membre spécifique
   */
  async getMemberFamilyTree(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const degree = req.query.degree ? parseInt(req.query.degree as string) : 2;
      
      // Vérifier si le membre existe
      const member = await familyModel.getFamilyMemberById(id);
      if (!member) {
        return res.status(404).json({ message: 'Membre de la famille non trouvé' });
      }
      
      const familyTree = await familyModel.getMemberFamilyTree(id, degree);
      return res.status(200).json(familyTree);
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'arbre généalogique du membre ${req.params.id}:`, error);
      return res.status(500).json({ message: 'Erreur lors de la récupération de l\'arbre généalogique du membre' });
    }
  }
}

export default new FamilyController();
