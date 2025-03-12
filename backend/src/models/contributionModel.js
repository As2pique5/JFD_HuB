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
exports.ContributionModel = void 0;
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../config/db"));
/**
 * Modèle pour la gestion des contributions financières
 */
class ContributionModel {
    constructor() {
        this.pool = db_1.default;
    }
    /**
     * Récupérer toutes les contributions
     */
    getAllContributions() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT c.*, p.full_name as user_name
      FROM contributions c
      LEFT JOIN profiles p ON c.user_id = p.id
      ORDER BY c.payment_date DESC
    `;
            const result = yield this.pool.query(query);
            return result.rows;
        });
    }
    /**
     * Récupérer une contribution par son ID
     */
    getContributionById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT c.*, p.full_name as user_name
      FROM contributions c
      LEFT JOIN profiles p ON c.user_id = p.id
      WHERE c.id = $1
    `;
            const result = yield this.pool.query(query, [id]);
            return result.rowCount !== null && result.rowCount > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Récupérer les contributions d'un utilisateur
     */
    getContributionsByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT c.*, p.full_name as user_name
      FROM contributions c
      LEFT JOIN profiles p ON c.user_id = p.id
      WHERE c.user_id = $1
      ORDER BY c.payment_date DESC
    `;
            const result = yield this.pool.query(query, [userId]);
            return result.rows;
        });
    }
    /**
     * Récupérer les contributions par source (mensuelle, événement, projet)
     */
    getContributionsBySource(sourceType, sourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = `
      SELECT c.*, p.full_name as user_name
      FROM contributions c
      LEFT JOIN profiles p ON c.user_id = p.id
      WHERE c.source_type = $1
    `;
            const params = [sourceType];
            if (sourceId) {
                query += ` AND c.source_id = $2`;
                params.push(sourceId);
            }
            query += ` ORDER BY c.payment_date DESC`;
            const result = yield this.pool.query(query, params);
            return result.rows;
        });
    }
    /**
     * Créer une nouvelle contribution
     */
    createContribution(contributionData) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = (0, uuid_1.v4)();
            const now = new Date();
            const query = `
      INSERT INTO contributions (
        id, user_id, amount, payment_date, payment_method, status,
        source_type, source_id, notes, receipt_url, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
            const values = [
                id,
                contributionData.user_id,
                contributionData.amount,
                contributionData.payment_date,
                contributionData.payment_method,
                contributionData.status,
                contributionData.source_type,
                contributionData.source_id || null,
                contributionData.notes || null,
                contributionData.receipt_url || null,
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
      UPDATE contributions
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
            const query = 'DELETE FROM contributions WHERE id = $1 RETURNING id';
            const result = yield this.pool.query(query, [id]);
            return result.rowCount !== null && result.rowCount > 0;
        });
    }
    /**
     * Obtenir un résumé financier global
     */
    getFinancialSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT
        COALESCE(SUM(amount), 0) as total_contributions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_completed,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as total_refunded,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END), 0) as total_cancelled,
        COALESCE(SUM(CASE WHEN source_type = 'monthly' THEN amount ELSE 0 END), 0) as monthly_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'event' THEN amount ELSE 0 END), 0) as event_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'project' THEN amount ELSE 0 END), 0) as project_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'other' THEN amount ELSE 0 END), 0) as other_contributions
      FROM contributions
      WHERE status != 'cancelled'
    `;
            const result = yield this.pool.query(query);
            return result.rows[0];
        });
    }
    /**
     * Obtenir un résumé financier pour un utilisateur spécifique
     */
    getUserFinancialSummary(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT
        COALESCE(SUM(amount), 0) as total_contributions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_completed,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as total_refunded,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END), 0) as total_cancelled,
        COALESCE(SUM(CASE WHEN source_type = 'monthly' THEN amount ELSE 0 END), 0) as monthly_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'event' THEN amount ELSE 0 END), 0) as event_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'project' THEN amount ELSE 0 END), 0) as project_contributions,
        COALESCE(SUM(CASE WHEN source_type = 'other' THEN amount ELSE 0 END), 0) as other_contributions
      FROM contributions
      WHERE user_id = $1 AND status != 'cancelled'
    `;
            const result = yield this.pool.query(query, [userId]);
            return result.rows[0];
        });
    }
    /**
     * Obtenir un résumé financier par mois
     */
    getMonthlyFinancialSummary(year) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = `
      SELECT
        TO_CHAR(payment_date, 'YYYY-MM') as period,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM contributions
      WHERE status != 'cancelled'
    `;
            const params = [];
            if (year) {
                query += ` AND EXTRACT(YEAR FROM payment_date) = $1`;
                params.push(year);
            }
            query += `
      GROUP BY period
      ORDER BY period DESC
    `;
            const result = yield this.pool.query(query, params);
            return result.rows;
        });
    }
    /**
     * Obtenir un résumé financier par année
     */
    getYearlyFinancialSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT
        TO_CHAR(payment_date, 'YYYY') as period,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM contributions
      WHERE status != 'cancelled'
      GROUP BY period
      ORDER BY period DESC
    `;
            const result = yield this.pool.query(query);
            return result.rows;
        });
    }
    /**
     * Obtenir les statistiques de paiement par méthode
     */
    getPaymentMethodStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM contributions
      WHERE status = 'completed'
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;
            const result = yield this.pool.query(query);
            return result.rows;
        });
    }
    /**
     * Obtenir les top contributeurs
     */
    getTopContributors() {
        return __awaiter(this, arguments, void 0, function* (limit = 10) {
            const query = `
      SELECT
        c.user_id,
        p.full_name,
        COUNT(*) as contribution_count,
        COALESCE(SUM(c.amount), 0) as total_amount
      FROM contributions c
      JOIN profiles p ON c.user_id = p.id
      WHERE c.status = 'completed'
      GROUP BY c.user_id, p.full_name
      ORDER BY total_amount DESC
      LIMIT $1
    `;
            const result = yield this.pool.query(query, [limit]);
            return result.rows;
        });
    }
}
exports.ContributionModel = ContributionModel;
exports.default = new ContributionModel();
