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
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../config/db"));
class FamilyModel {
    constructor() {
        this.pool = db_1.default;
    }
    /**
     * Récupérer tous les membres de la famille
     */
    getAllFamilyMembers() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM family_members
      ORDER BY last_name, first_name
    `;
            const result = yield this.pool.query(query);
            return result.rows;
        });
    }
    /**
     * Récupérer un membre de la famille par son ID
     */
    getFamilyMemberById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM family_members
      WHERE id = $1
    `;
            const result = yield this.pool.query(query, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        });
    }
    /**
     * Récupérer un membre de la famille avec toutes ses relations
     */
    getFamilyMemberWithRelations(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // Récupérer le membre
            const member = yield this.getFamilyMemberById(id);
            if (!member) {
                return null;
            }
            const memberWithRelations = Object.assign(Object.assign({}, member), { parents: [], children: [], spouses: [], siblings: [], others: [] });
            // Récupérer les parents
            const parentsQuery = `
      SELECT m.* FROM family_members m
      JOIN family_relationships r ON m.id = r.from_member_id
      WHERE r.to_member_id = $1 AND r.relationship_type = 'parent'
    `;
            const parentsResult = yield this.pool.query(parentsQuery, [id]);
            memberWithRelations.parents = parentsResult.rows;
            // Récupérer les enfants
            const childrenQuery = `
      SELECT m.* FROM family_members m
      JOIN family_relationships r ON m.id = r.to_member_id
      WHERE r.from_member_id = $1 AND r.relationship_type = 'child'
    `;
            const childrenResult = yield this.pool.query(childrenQuery, [id]);
            memberWithRelations.children = childrenResult.rows;
            // Récupérer les conjoints
            const spousesQuery = `
      SELECT m.* FROM family_members m
      JOIN family_relationships r ON m.id = r.to_member_id
      WHERE r.from_member_id = $1 AND r.relationship_type = 'spouse'
      UNION
      SELECT m.* FROM family_members m
      JOIN family_relationships r ON m.id = r.from_member_id
      WHERE r.to_member_id = $1 AND r.relationship_type = 'spouse'
    `;
            const spousesResult = yield this.pool.query(spousesQuery, [id]);
            memberWithRelations.spouses = spousesResult.rows;
            // Récupérer les frères et sœurs
            const siblingsQuery = `
      SELECT m.* FROM family_members m
      JOIN family_relationships r ON m.id = r.to_member_id
      WHERE r.from_member_id = $1 AND r.relationship_type = 'sibling'
      UNION
      SELECT m.* FROM family_members m
      JOIN family_relationships r ON m.id = r.from_member_id
      WHERE r.to_member_id = $1 AND r.relationship_type = 'sibling'
    `;
            const siblingsResult = yield this.pool.query(siblingsQuery, [id]);
            memberWithRelations.siblings = siblingsResult.rows;
            // Récupérer les autres relations
            const othersQuery = `
      SELECT m.*, r.relationship_type, r.relationship_details FROM family_members m
      JOIN family_relationships r ON m.id = r.to_member_id
      WHERE r.from_member_id = $1 AND r.relationship_type = 'other'
      UNION
      SELECT m.*, r.relationship_type, r.relationship_details FROM family_members m
      JOIN family_relationships r ON m.id = r.from_member_id
      WHERE r.to_member_id = $1 AND r.relationship_type = 'other'
    `;
            const othersResult = yield this.pool.query(othersQuery, [id]);
            memberWithRelations.others = othersResult.rows.map(row => ({
                member: {
                    id: row.id,
                    profile_id: row.profile_id,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    maiden_name: row.maiden_name,
                    gender: row.gender,
                    birth_date: row.birth_date,
                    birth_place: row.birth_place,
                    death_date: row.death_date,
                    death_place: row.death_place,
                    bio: row.bio,
                    photo_url: row.photo_url,
                    is_alive: row.is_alive,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                },
                relationship_type: row.relationship_type,
                relationship_details: row.relationship_details
            }));
            return memberWithRelations;
        });
    }
    /**
     * Récupérer les membres de la famille liés à un profil utilisateur
     */
    getFamilyMembersByProfileId(profileId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM family_members
      WHERE profile_id = $1
      ORDER BY last_name, first_name
    `;
            const result = yield this.pool.query(query, [profileId]);
            return result.rows;
        });
    }
    /**
     * Rechercher des membres de la famille
     */
    searchFamilyMembers(searchTerm) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM family_members
      WHERE 
        first_name ILIKE $1 OR 
        last_name ILIKE $1 OR 
        maiden_name ILIKE $1 OR
        birth_place ILIKE $1 OR
        death_place ILIKE $1 OR
        bio ILIKE $1
      ORDER BY last_name, first_name
    `;
            const result = yield this.pool.query(query, [`%${searchTerm}%`]);
            return result.rows;
        });
    }
    /**
     * Créer un nouveau membre de la famille
     */
    createFamilyMember(memberData) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = (0, uuid_1.v4)();
            const query = `
      INSERT INTO family_members (
        id, profile_id, first_name, last_name, maiden_name, gender, 
        birth_date, birth_place, death_date, death_place, bio, photo_url, 
        is_alive, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `;
            const result = yield this.pool.query(query, [
                id,
                memberData.profile_id || null,
                memberData.first_name,
                memberData.last_name,
                memberData.maiden_name || null,
                memberData.gender,
                memberData.birth_date || null,
                memberData.birth_place || null,
                memberData.death_date || null,
                memberData.death_place || null,
                memberData.bio || null,
                memberData.photo_url || null,
                memberData.is_alive
            ]);
            return result.rows[0];
        });
    }
    /**
     * Mettre à jour un membre de la famille
     */
    updateFamilyMember(id, memberData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Vérifier si le membre existe
            const existingMember = yield this.getFamilyMemberById(id);
            if (!existingMember) {
                return null;
            }
            // Construire la requête de mise à jour dynamiquement
            const updateFields = [];
            const values = [];
            let paramCount = 1;
            // Ajouter chaque champ à mettre à jour
            for (const [key, value] of Object.entries(memberData)) {
                if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(value === undefined ? null : value);
                    paramCount++;
                }
            }
            // Ajouter la mise à jour de updated_at
            updateFields.push(`updated_at = NOW()`);
            // Ajouter l'ID à la fin des valeurs pour la clause WHERE
            values.push(id);
            const query = `
      UPDATE family_members
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
            const result = yield this.pool.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        });
    }
    /**
     * Supprimer un membre de la famille
     */
    deleteFamilyMember(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                // Supprimer d'abord toutes les relations associées à ce membre
                const relationshipsQuery = `
        DELETE FROM family_relationships
        WHERE from_member_id = $1 OR to_member_id = $1
      `;
                yield client.query(relationshipsQuery, [id]);
                // Puis supprimer le membre
                const memberQuery = `
        DELETE FROM family_members
        WHERE id = $1
        RETURNING *
      `;
                const result = yield client.query(memberQuery, [id]);
                yield client.query('COMMIT');
                return result.rowCount !== null && result.rowCount > 0;
            }
            catch (error) {
                yield client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        });
    }
    /**
     * Récupérer toutes les relations familiales
     */
    getAllFamilyRelationships() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM family_relationships
      ORDER BY from_member_id, to_member_id
    `;
            const result = yield this.pool.query(query);
            return result.rows;
        });
    }
    /**
     * Récupérer une relation familiale par son ID
     */
    getFamilyRelationshipById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM family_relationships
      WHERE id = $1
    `;
            const result = yield this.pool.query(query, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        });
    }
    /**
     * Récupérer les relations d'un membre de la famille
     */
    getFamilyRelationshipsByMemberId(memberId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM family_relationships
      WHERE from_member_id = $1 OR to_member_id = $1
      ORDER BY relationship_type
    `;
            const result = yield this.pool.query(query, [memberId]);
            return result.rows;
        });
    }
    /**
     * Créer une nouvelle relation familiale
     */
    createFamilyRelationship(relationshipData) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = (0, uuid_1.v4)();
            const query = `
      INSERT INTO family_relationships (
        id, from_member_id, to_member_id, relationship_type, 
        relationship_details, start_date, end_date, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;
            const result = yield this.pool.query(query, [
                id,
                relationshipData.from_member_id,
                relationshipData.to_member_id,
                relationshipData.relationship_type,
                relationshipData.relationship_details || null,
                relationshipData.start_date || null,
                relationshipData.end_date || null
            ]);
            return result.rows[0];
        });
    }
    /**
     * Mettre à jour une relation familiale
     */
    updateFamilyRelationship(id, relationshipData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Vérifier si la relation existe
            const existingRelationship = yield this.getFamilyRelationshipById(id);
            if (!existingRelationship) {
                return null;
            }
            // Construire la requête de mise à jour dynamiquement
            const updateFields = [];
            const values = [];
            let paramCount = 1;
            // Ajouter chaque champ à mettre à jour
            for (const [key, value] of Object.entries(relationshipData)) {
                if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(value === undefined ? null : value);
                    paramCount++;
                }
            }
            // Ajouter la mise à jour de updated_at
            updateFields.push(`updated_at = NOW()`);
            // Ajouter l'ID à la fin des valeurs pour la clause WHERE
            values.push(id);
            const query = `
      UPDATE family_relationships
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
            const result = yield this.pool.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        });
    }
    /**
     * Supprimer une relation familiale
     */
    deleteFamilyRelationship(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      DELETE FROM family_relationships
      WHERE id = $1
      RETURNING *
    `;
            const result = yield this.pool.query(query, [id]);
            return result.rowCount !== null && result.rowCount > 0;
        });
    }
    /**
     * Récupérer l'arbre généalogique complet
     */
    getFamilyTree() {
        return __awaiter(this, void 0, void 0, function* () {
            const membersQuery = `
      SELECT * FROM family_members
      ORDER BY last_name, first_name
    `;
            const membersResult = yield this.pool.query(membersQuery);
            const relationshipsQuery = `
      SELECT * FROM family_relationships
    `;
            const relationshipsResult = yield this.pool.query(relationshipsQuery);
            return {
                members: membersResult.rows,
                relationships: relationshipsResult.rows
            };
        });
    }
    /**
     * Récupérer l'arbre généalogique d'un membre spécifique (jusqu'à un certain degré)
     */
    getMemberFamilyTree(memberId_1) {
        return __awaiter(this, arguments, void 0, function* (memberId, degree = 2) {
            // Récupérer tous les membres liés jusqu'au degré spécifié
            const query = `
      WITH RECURSIVE related_members AS (
        -- Membre initial
        SELECT id FROM family_members WHERE id = $1
        UNION
        -- Membres directement liés (degré 1)
        SELECT m.id
        FROM family_members m
        JOIN family_relationships r ON m.id = r.to_member_id OR m.id = r.from_member_id
        WHERE (r.from_member_id IN (SELECT id FROM related_members) OR r.to_member_id IN (SELECT id FROM related_members))
          AND m.id NOT IN (SELECT id FROM related_members)
        ${degree > 1 ? `
        UNION
        -- Membres indirectement liés (degré 2 et plus)
        SELECT m.id
        FROM family_members m
        JOIN family_relationships r ON m.id = r.to_member_id OR m.id = r.from_member_id
        WHERE (r.from_member_id IN (
            SELECT rm.id FROM related_members rm
            WHERE rm.id != $1 AND rm.id NOT IN (
              SELECT m2.id
              FROM family_members m2
              JOIN family_relationships r2 ON m2.id = r2.to_member_id OR m2.id = r2.from_member_id
              WHERE (r2.from_member_id = $1 OR r2.to_member_id = $1)
            )
          ) OR r.to_member_id IN (
            SELECT rm.id FROM related_members rm
            WHERE rm.id != $1 AND rm.id NOT IN (
              SELECT m2.id
              FROM family_members m2
              JOIN family_relationships r2 ON m2.id = r2.to_member_id OR m2.id = r2.from_member_id
              WHERE (r2.from_member_id = $1 OR r2.to_member_id = $1)
            )
          ))
          AND m.id NOT IN (SELECT id FROM related_members)
        ` : ''}
      )
      SELECT * FROM family_members
      WHERE id IN (SELECT id FROM related_members)
      ORDER BY last_name, first_name
    `;
            const membersResult = yield this.pool.query(query, [memberId]);
            // Récupérer toutes les relations entre ces membres
            const memberIds = membersResult.rows.map(m => m.id);
            const relationshipsQuery = `
      SELECT * FROM family_relationships
      WHERE from_member_id = ANY($1) AND to_member_id = ANY($1)
    `;
            const relationshipsResult = yield this.pool.query(relationshipsQuery, [memberIds]);
            return {
                members: membersResult.rows,
                relationships: relationshipsResult.rows
            };
        });
    }
    /**
     * Ajouter une relation parent-enfant avec création automatique de la relation inverse
     */
    addParentChildRelationship(parentId, childId, details) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                // Créer la relation parent -> enfant
                const parentRelationshipId = (0, uuid_1.v4)();
                const parentQuery = `
        INSERT INTO family_relationships (
          id, from_member_id, to_member_id, relationship_type, 
          relationship_details, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'child', $4, NOW(), NOW())
        RETURNING *
      `;
                const parentResult = yield client.query(parentQuery, [
                    parentRelationshipId,
                    parentId,
                    childId,
                    details || null
                ]);
                // Créer la relation enfant -> parent
                const childRelationshipId = (0, uuid_1.v4)();
                const childQuery = `
        INSERT INTO family_relationships (
          id, from_member_id, to_member_id, relationship_type, 
          relationship_details, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'parent', $4, NOW(), NOW())
        RETURNING *
      `;
                const childResult = yield client.query(childQuery, [
                    childRelationshipId,
                    childId,
                    parentId,
                    details || null
                ]);
                yield client.query('COMMIT');
                return {
                    parent: parentResult.rows[0],
                    child: childResult.rows[0]
                };
            }
            catch (error) {
                yield client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        });
    }
    /**
     * Ajouter une relation de fratrie bidirectionnelle
     */
    addSiblingRelationship(member1Id, member2Id, details) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                // Créer la relation membre1 -> membre2
                const sibling1RelationshipId = (0, uuid_1.v4)();
                const sibling1Query = `
        INSERT INTO family_relationships (
          id, from_member_id, to_member_id, relationship_type, 
          relationship_details, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'sibling', $4, NOW(), NOW())
        RETURNING *
      `;
                const sibling1Result = yield client.query(sibling1Query, [
                    sibling1RelationshipId,
                    member1Id,
                    member2Id,
                    details || null
                ]);
                // Créer la relation membre2 -> membre1
                const sibling2RelationshipId = (0, uuid_1.v4)();
                const sibling2Query = `
        INSERT INTO family_relationships (
          id, from_member_id, to_member_id, relationship_type, 
          relationship_details, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'sibling', $4, NOW(), NOW())
        RETURNING *
      `;
                const sibling2Result = yield client.query(sibling2Query, [
                    sibling2RelationshipId,
                    member2Id,
                    member1Id,
                    details || null
                ]);
                yield client.query('COMMIT');
                return {
                    sibling1: sibling1Result.rows[0],
                    sibling2: sibling2Result.rows[0]
                };
            }
            catch (error) {
                yield client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        });
    }
    /**
     * Ajouter une relation de conjoint bidirectionnelle
     */
    addSpouseRelationship(member1Id, member2Id, startDate, endDate, details) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                // Créer la relation membre1 -> membre2
                const spouse1RelationshipId = (0, uuid_1.v4)();
                const spouse1Query = `
        INSERT INTO family_relationships (
          id, from_member_id, to_member_id, relationship_type, 
          relationship_details, start_date, end_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'spouse', $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;
                const spouse1Result = yield client.query(spouse1Query, [
                    spouse1RelationshipId,
                    member1Id,
                    member2Id,
                    details || null,
                    startDate || null,
                    endDate || null
                ]);
                // Créer la relation membre2 -> membre1
                const spouse2RelationshipId = (0, uuid_1.v4)();
                const spouse2Query = `
        INSERT INTO family_relationships (
          id, from_member_id, to_member_id, relationship_type, 
          relationship_details, start_date, end_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'spouse', $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;
                const spouse2Result = yield client.query(spouse2Query, [
                    spouse2RelationshipId,
                    member2Id,
                    member1Id,
                    details || null,
                    startDate || null,
                    endDate || null
                ]);
                yield client.query('COMMIT');
                return {
                    spouse1: spouse1Result.rows[0],
                    spouse2: spouse2Result.rows[0]
                };
            }
            catch (error) {
                yield client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        });
    }
}
exports.default = new FamilyModel();
