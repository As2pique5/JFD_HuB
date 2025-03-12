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
class EventModel {
    /**
     * Récupérer tous les événements
     */
    getAllEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM events ORDER BY start_date DESC');
                return result.rows;
            }
            catch (error) {
                console.error('Erreur lors de la récupération des événements:', error);
                throw error;
            }
        });
    }
    /**
     * Récupérer un événement par son ID
     */
    getEventById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM events WHERE id = $1', [id]);
                if (result.rows.length === 0) {
                    return null;
                }
                return result.rows[0];
            }
            catch (error) {
                console.error(`Erreur lors de la récupération de l'événement ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Créer un nouvel événement
     */
    createEvent(eventData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = (0, uuid_1.v4)();
                const { name, description, location, start_date, end_date, target_amount, status, created_by } = eventData;
                const result = yield db_1.default.query(`INSERT INTO events 
         (id, name, description, location, start_date, end_date, target_amount, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`, [id, name, description, location, start_date, end_date, target_amount, status, created_by]);
                return result.rows[0];
            }
            catch (error) {
                console.error('Erreur lors de la création de l\'événement:', error);
                throw error;
            }
        });
    }
    /**
     * Mettre à jour un événement
     */
    updateEvent(id, eventData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Vérifier si l'événement existe
                const existingEvent = yield this.getEventById(id);
                if (!existingEvent) {
                    return null;
                }
                // Construire la requête de mise à jour dynamiquement
                const updates = [];
                const values = [];
                let paramIndex = 1;
                Object.entries(eventData).forEach(([key, value]) => {
                    if (value !== undefined) {
                        updates.push(`${key} = $${paramIndex}`);
                        values.push(value);
                        paramIndex++;
                    }
                });
                if (updates.length === 0) {
                    return existingEvent;
                }
                values.push(id);
                const result = yield db_1.default.query(`UPDATE events 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`, values);
                return result.rows[0];
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de l'événement ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Supprimer un événement
     */
    deleteEvent(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
                return result.rowCount !== null && result.rowCount > 0;
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de l'événement ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Récupérer tous les participants d'un événement
     */
    getEventParticipants(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM event_participants WHERE event_id = $1', [eventId]);
                return result.rows;
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des participants de l'événement ${eventId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Ajouter un participant à un événement
     */
    addParticipant(participantData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = (0, uuid_1.v4)();
                const { event_id, user_id, status } = participantData;
                const result = yield db_1.default.query(`INSERT INTO event_participants 
         (id, event_id, user_id, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [id, event_id, user_id, status]);
                return result.rows[0];
            }
            catch (error) {
                console.error('Erreur lors de l\'ajout du participant:', error);
                throw error;
            }
        });
    }
    /**
     * Mettre à jour le statut d'un participant
     */
    updateParticipantStatus(id, status) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query(`UPDATE event_participants 
         SET status = $1
         WHERE id = $2
         RETURNING *`, [status, id]);
                if (result.rows.length === 0) {
                    return null;
                }
                return result.rows[0];
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour du statut du participant ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Supprimer un participant d'un événement
     */
    removeParticipant(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('DELETE FROM event_participants WHERE id = $1 RETURNING *', [id]);
                return result.rowCount !== null && result.rowCount > 0;
            }
            catch (error) {
                console.error(`Erreur lors de la suppression du participant ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Récupérer toutes les contributions d'un événement
     */
    getEventContributions(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM event_contributions WHERE event_id = $1 ORDER BY payment_date DESC', [eventId]);
                return result.rows;
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des contributions de l'événement ${eventId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Ajouter une contribution à un événement
     */
    addContribution(contributionData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = (0, uuid_1.v4)();
                const { event_id, user_id, amount, payment_date, payment_method, status, notes } = contributionData;
                const result = yield db_1.default.query(`INSERT INTO event_contributions 
         (id, event_id, user_id, amount, payment_date, payment_method, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`, [id, event_id, user_id, amount, payment_date, payment_method, status, notes]);
                return result.rows[0];
            }
            catch (error) {
                console.error('Erreur lors de l\'ajout de la contribution:', error);
                throw error;
            }
        });
    }
    /**
     * Mettre à jour une contribution
     */
    updateContribution(id, contributionData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Construire la requête de mise à jour dynamiquement
                const updates = [];
                const values = [];
                let paramIndex = 1;
                Object.entries(contributionData).forEach(([key, value]) => {
                    if (value !== undefined) {
                        updates.push(`${key} = $${paramIndex}`);
                        values.push(value);
                        paramIndex++;
                    }
                });
                if (updates.length === 0) {
                    const existingContribution = yield db_1.default.query('SELECT * FROM event_contributions WHERE id = $1', [id]);
                    return existingContribution.rows[0] || null;
                }
                values.push(id);
                const result = yield db_1.default.query(`UPDATE event_contributions 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`, values);
                if (result.rows.length === 0) {
                    return null;
                }
                return result.rows[0];
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de la contribution ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Supprimer une contribution
     */
    deleteContribution(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('DELETE FROM event_contributions WHERE id = $1 RETURNING *', [id]);
                return result.rowCount !== null && result.rowCount > 0;
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de la contribution ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Récupérer toutes les assignations de contributions d'un événement
     */
    getContributionAssignments(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM event_contribution_assignments WHERE event_id = $1', [eventId]);
                return result.rows;
            }
            catch (error) {
                console.error(`Erreur lors de la récupération des assignations de l'événement ${eventId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Créer une assignation de contribution
     */
    createAssignment(assignmentData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = (0, uuid_1.v4)();
                const { event_id, user_id, amount, due_date } = assignmentData;
                const result = yield db_1.default.query(`INSERT INTO event_contribution_assignments 
         (id, event_id, user_id, amount, due_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`, [id, event_id, user_id, amount, due_date]);
                return result.rows[0];
            }
            catch (error) {
                console.error('Erreur lors de la création de l\'assignation:', error);
                throw error;
            }
        });
    }
    /**
     * Mettre à jour une assignation de contribution
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
                    const existingAssignment = yield db_1.default.query('SELECT * FROM event_contribution_assignments WHERE id = $1', [id]);
                    return existingAssignment.rows[0] || null;
                }
                values.push(id);
                const result = yield db_1.default.query(`UPDATE event_contribution_assignments 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`, values);
                if (result.rows.length === 0) {
                    return null;
                }
                return result.rows[0];
            }
            catch (error) {
                console.error(`Erreur lors de la mise à jour de l'assignation ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Supprimer une assignation de contribution
     */
    deleteAssignment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('DELETE FROM event_contribution_assignments WHERE id = $1 RETURNING *', [id]);
                return result.rowCount !== null && result.rowCount > 0;
            }
            catch (error) {
                console.error(`Erreur lors de la suppression de l'assignation ${id}:`, error);
                throw error;
            }
        });
    }
}
exports.default = new EventModel();
