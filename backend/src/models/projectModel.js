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
/**
 * Modèle pour la gestion des projets familiaux
 */
class ProjectModel {
    constructor() {
        this.pool = db_1.default;
    }
    /**
     * Récupérer tous les projets
     */
    getAllProjects() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM projects
      ORDER BY created_at DESC
    `;
            const result = yield this.pool.query(query);
            return result.rows;
        });
    }
    /**
     * Récupérer un projet par son ID
     */
    getProjectById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM projects
      WHERE id = $1
    `;
            const result = yield this.pool.query(query, [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Créer un nouveau projet
     */
    createProject(projectData) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = (0, uuid_1.v4)();
            const now = new Date();
            const query = `
      INSERT INTO projects (
        id, name, description, start_date, end_date, 
        target_amount, status, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
            const values = [
                id,
                projectData.name,
                projectData.description || null,
                projectData.start_date,
                projectData.end_date || null,
                projectData.target_amount || null,
                projectData.status,
                projectData.created_by,
                now,
                now
            ];
            const result = yield this.pool.query(query, values);
            return result.rows[0];
        });
    }
    /**
     * Mettre à jour un projet
     */
    updateProject(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Construire les parties de la requête de mise à jour
            const updateFields = [];
            const values = [];
            let paramCounter = 1;
            // Ajouter chaque champ à mettre à jour
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    updateFields.push(`${key} = $${paramCounter}`);
                    values.push(value);
                    paramCounter++;
                }
            });
            // Ajouter la date de mise à jour
            updateFields.push(`updated_at = $${paramCounter}`);
            values.push(new Date());
            paramCounter++;
            // Ajouter l'ID du projet comme dernier paramètre
            values.push(id);
            // Si aucun champ à mettre à jour, retourner null
            if (updateFields.length === 1) {
                return null;
            }
            const query = `
      UPDATE projects
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter - 1}
      RETURNING *
    `;
            const result = yield this.pool.query(query, values);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Supprimer un projet
     */
    deleteProject(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // Supprimer d'abord les données associées
            yield this.pool.query('DELETE FROM project_contribution_assignments WHERE project_id = $1', [id]);
            yield this.pool.query('DELETE FROM project_contributions WHERE project_id = $1', [id]);
            yield this.pool.query('DELETE FROM project_participants WHERE project_id = $1', [id]);
            yield this.pool.query('DELETE FROM project_phases WHERE project_id = $1', [id]);
            // Supprimer le projet
            const query = 'DELETE FROM projects WHERE id = $1 RETURNING id';
            const result = yield this.pool.query(query, [id]);
            return result.rowCount ? result.rowCount > 0 : false;
        });
    }
    /**
     * Récupérer toutes les phases d'un projet
     */
    getProjectPhases(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM project_phases
      WHERE project_id = $1
      ORDER BY start_date ASC
    `;
            const result = yield this.pool.query(query, [projectId]);
            return result.rows;
        });
    }
    /**
     * Créer une nouvelle phase de projet
     */
    createPhase(phaseData) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = (0, uuid_1.v4)();
            const now = new Date();
            const query = `
      INSERT INTO project_phases (
        id, project_id, name, description, start_date, 
        end_date, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
            const values = [
                id,
                phaseData.project_id,
                phaseData.name,
                phaseData.description || null,
                phaseData.start_date,
                phaseData.end_date || null,
                phaseData.status,
                now,
                now
            ];
            const result = yield this.pool.query(query, values);
            return result.rows[0];
        });
    }
    /**
     * Mettre à jour une phase de projet
     */
    updatePhase(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Construire les parties de la requête de mise à jour
            const updateFields = [];
            const values = [];
            let paramCounter = 1;
            // Ajouter chaque champ à mettre à jour
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    updateFields.push(`${key} = $${paramCounter}`);
                    values.push(value);
                    paramCounter++;
                }
            });
            // Ajouter la date de mise à jour
            updateFields.push(`updated_at = $${paramCounter}`);
            values.push(new Date());
            paramCounter++;
            // Ajouter l'ID de la phase comme dernier paramètre
            values.push(id);
            // Si aucun champ à mettre à jour, retourner null
            if (updateFields.length === 1) {
                return null;
            }
            const query = `
      UPDATE project_phases
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter - 1}
      RETURNING *
    `;
            const result = yield this.pool.query(query, values);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Supprimer une phase de projet
     */
    deletePhase(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'DELETE FROM project_phases WHERE id = $1 RETURNING id';
            const result = yield this.pool.query(query, [id]);
            return result.rowCount ? result.rowCount > 0 : false;
        });
    }
    /**
     * Récupérer tous les participants d'un projet
     */
    getProjectParticipants(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT pp.*, p.email, p.first_name, p.last_name
      FROM project_participants pp
      JOIN profiles p ON pp.user_id = p.id
      WHERE pp.project_id = $1
      ORDER BY pp.created_at ASC
    `;
            const result = yield this.pool.query(query, [projectId]);
            return result.rows;
        });
    }
    /**
     * Ajouter un participant à un projet
     */
    addParticipant(participantData) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = (0, uuid_1.v4)();
            const now = new Date();
            const query = `
      INSERT INTO project_participants (
        id, project_id, user_id, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
            const values = [
                id,
                participantData.project_id,
                participantData.user_id,
                participantData.status,
                now,
                now
            ];
            const result = yield this.pool.query(query, values);
            return result.rows[0];
        });
    }
    /**
     * Mettre à jour le statut d'un participant
     */
    updateParticipantStatus(id, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const query = `
      UPDATE project_participants
      SET status = $1, updated_at = $2
      WHERE id = $3
      RETURNING *
    `;
            const result = yield this.pool.query(query, [status, now, id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Supprimer un participant d'un projet
     */
    removeParticipant(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'DELETE FROM project_participants WHERE id = $1 RETURNING id';
            const result = yield this.pool.query(query, [id]);
            return result.rowCount ? result.rowCount > 0 : false;
        });
    }
    /**
     * Récupérer toutes les contributions d'un projet
     */
    getProjectContributions(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT pc.*, p.email, p.first_name, p.last_name
      FROM project_contributions pc
      JOIN profiles p ON pc.user_id = p.id
      WHERE pc.project_id = $1
      ORDER BY pc.payment_date DESC
    `;
            const result = yield this.pool.query(query, [projectId]);
            return result.rows;
        });
    }
    /**
     * Ajouter une contribution à un projet
     */
    addContribution(contributionData) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = (0, uuid_1.v4)();
            const now = new Date();
            const query = `
      INSERT INTO project_contributions (
        id, project_id, user_id, amount, payment_date, 
        payment_method, status, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
            const values = [
                id,
                contributionData.project_id,
                contributionData.user_id,
                contributionData.amount,
                contributionData.payment_date,
                contributionData.payment_method,
                contributionData.status,
                contributionData.notes || null,
                now,
                now
            ];
            const result = yield this.pool.query(query, values);
            return result.rows[0];
        });
    }
    /**
     * Mettre à jour une contribution
     */
    updateContribution(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Construire les parties de la requête de mise à jour
            const updateFields = [];
            const values = [];
            let paramCounter = 1;
            // Ajouter chaque champ à mettre à jour
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    updateFields.push(`${key} = $${paramCounter}`);
                    values.push(value);
                    paramCounter++;
                }
            });
            // Ajouter la date de mise à jour
            updateFields.push(`updated_at = $${paramCounter}`);
            values.push(new Date());
            paramCounter++;
            // Ajouter l'ID de la contribution comme dernier paramètre
            values.push(id);
            // Si aucun champ à mettre à jour, retourner null
            if (updateFields.length === 1) {
                return null;
            }
            const query = `
      UPDATE project_contributions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter - 1}
      RETURNING *
    `;
            const result = yield this.pool.query(query, values);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Supprimer une contribution
     */
    deleteContribution(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'DELETE FROM project_contributions WHERE id = $1 RETURNING id';
            const result = yield this.pool.query(query, [id]);
            return result.rowCount ? result.rowCount > 0 : false;
        });
    }
    /**
     * Récupérer toutes les assignations de contributions d'un projet
     */
    getContributionAssignments(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT pca.*, p.email, p.first_name, p.last_name
      FROM project_contribution_assignments pca
      JOIN profiles p ON pca.user_id = p.id
      WHERE pca.project_id = $1
      ORDER BY pca.created_at DESC
    `;
            const result = yield this.pool.query(query, [projectId]);
            return result.rows;
        });
    }
    /**
     * Créer une assignation de contribution
     */
    createAssignment(assignmentData) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = (0, uuid_1.v4)();
            const now = new Date();
            const query = `
      INSERT INTO project_contribution_assignments (
        id, project_id, user_id, amount, due_date, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
            const values = [
                id,
                assignmentData.project_id,
                assignmentData.user_id,
                assignmentData.amount,
                assignmentData.due_date || null,
                now,
                now
            ];
            const result = yield this.pool.query(query, values);
            return result.rows[0];
        });
    }
    /**
     * Mettre à jour une assignation de contribution
     */
    updateAssignment(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Construire les parties de la requête de mise à jour
            const updateFields = [];
            const values = [];
            let paramCounter = 1;
            // Ajouter chaque champ à mettre à jour
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    updateFields.push(`${key} = $${paramCounter}`);
                    values.push(value);
                    paramCounter++;
                }
            });
            // Ajouter la date de mise à jour
            updateFields.push(`updated_at = $${paramCounter}`);
            values.push(new Date());
            paramCounter++;
            // Ajouter l'ID de l'assignation comme dernier paramètre
            values.push(id);
            // Si aucun champ à mettre à jour, retourner null
            if (updateFields.length === 1) {
                return null;
            }
            const query = `
      UPDATE project_contribution_assignments
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter - 1}
      RETURNING *
    `;
            const result = yield this.pool.query(query, values);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Supprimer une assignation de contribution
     */
    deleteAssignment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'DELETE FROM project_contribution_assignments WHERE id = $1 RETURNING id';
            const result = yield this.pool.query(query, [id]);
            return result.rowCount ? result.rowCount > 0 : false;
        });
    }
}
exports.default = new ProjectModel();
