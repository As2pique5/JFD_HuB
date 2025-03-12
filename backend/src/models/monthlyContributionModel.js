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
const db_1 = __importDefault(require("../config/db"));
const uuid_1 = require("uuid");
class MonthlyContributionModel {
    /**
     * Récupérer toutes les sessions de cotisations mensuelles
     */
    getAllSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM monthly_contribution_sessions ORDER BY created_at DESC');
                return result.rows;
            }
            catch (error) {
                console.error('Erreur lors de la récupération des sessions de cotisations:', error);
                throw error;
            }
        });
    }
    /**
     * Récupérer une session de cotisations mensuelles par son ID
     */
    getSessionById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM monthly_contribution_sessions WHERE id = $1', [id]);
                if (result.rows.length === 0) {
                    return null;
                }
                return result.rows[0];
            }
            catch (error) {
                console.error(`Erreur lors de la récupération de la session de cotisations ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Créer une nouvelle session de cotisations mensuelles
     */
    createSession(sessionData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = (0, uuid_1.v4)();
                const { name, description, start_date, monthly_target_amount, duration_months, payment_deadline_day, status, created_by } = sessionData;
                const result = yield db_1.default.query(`INSERT INTO monthly_contribution_sessions 
         (id, name, description, start_date, monthly_target_amount, duration_months, payment_deadline_day, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`, [id, name, description, start_date, monthly_target_amount, duration_months, payment_deadline_day, status, created_by]);
                return result.rows[0];
            }
            catch (error) {
                console.error('Erreur lors de la création de la session de cotisations:', error);
                throw error;
            }
        });
    }
    /**
     * Mettre à jour une session de cotisations mensuelles
     */
    updateSession(id, sessionData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Vérifier si la session existe
                const existingSession = yield this.getSessionById(id);
                if (!existingSession) {
                    return null;
                }
                // Construire la requête de mise à jour dynamiquement
                const updates = [];
                const values = [];
                let paramIndex = 1;
                Object.entries(sessionData).forEach(([key, value]) => {
                    if (value !== undefined) {
                        updates.push(`${key} = $${paramIndex}`);
                        values.push(value);
                        paramIndex++;
                    }
                });
                if (updates.length === 0) {
                    return existingSession;
                }
                values.push(id);
                const result = yield db_1.default.query(`UPDATE monthly_contribution_sessions 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`, values);
                return result.rows[0];
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de la session de cotisations ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Supprimer une session de cotisations mensuelles
     */
    deleteSession(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('DELETE FROM monthly_contribution_sessions WHERE id = $1 RETURNING *', [id]);
                return result.rowCount !== null && result.rowCount > 0;
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de la session de cotisations ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Récupérer toutes les assignations pour une session
     */
    getAssignmentsBySessionId(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM monthly_contribution_assignments WHERE session_id = $1', [sessionId]);
                return result.rows;
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des assignations pour la session ${sessionId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Créer une nouvelle assignation de cotisation mensuelle
     */
    createAssignment(assignmentData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = (0, uuid_1.v4)();
                const { session_id, user_id, monthly_amount } = assignmentData;
                const result = yield db_1.default.query(`INSERT INTO monthly_contribution_assignments 
         (id, session_id, user_id, monthly_amount)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [id, session_id, user_id, monthly_amount]);
                return result.rows[0];
            }
            catch (error) {
                console.error('Erreur lors de la création de l\'assignation de cotisation:', error);
                throw error;
            }
        });
    }
    /**
     * Mettre à jour une assignation de cotisation mensuelle
     */
    updateAssignment(id, assignmentData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Construire la requête de mise à jour dynamiquement
                const updates = [];
                const values = [];
                let paramIndex = 1;
                Object.entries(assignmentData).forEach(([key, value]) => {
                    if (value !== undefined) {
                        updates.push(`${key} = $${paramIndex}`);
                        values.push(value);
                        paramIndex++;
                    }
                });
                if (updates.length === 0) {
                    const existingAssignment = yield db_1.default.query('SELECT * FROM monthly_contribution_assignments WHERE id = $1', [id]);
                    return existingAssignment.rows[0] || null;
                }
                values.push(id);
                const result = yield db_1.default.query(`UPDATE monthly_contribution_assignments 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`, values);
                if (result.rows.length === 0) {
                    return null;
                }
                return result.rows[0];
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de l'assignation de cotisation ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Supprimer une assignation de cotisation mensuelle
     */
    deleteAssignment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('DELETE FROM monthly_contribution_assignments WHERE id = $1 RETURNING *', [id]);
                return result.rowCount !== null && result.rowCount > 0;
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de l'assignation de cotisation ${id}:`, error);
                throw error;
            }
        });
    }
}
exports.default = new MonthlyContributionModel();
