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
const bcrypt_1 = __importDefault(require("bcrypt"));
class UserModel {
    /**
     * Trouve un utilisateur par son email
     */
    findByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
                return result.rows.length ? result.rows[0] : null;
            }
            catch (error) {
                console.error('Erreur lors de la recherche d\'utilisateur par email:', error);
                throw error;
            }
        });
    }
    /**
     * Trouve un utilisateur par son ID
     */
    findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('SELECT * FROM users WHERE id = $1', [id]);
                return result.rows.length ? result.rows[0] : null;
            }
            catch (error) {
                console.error('Erreur lors de la recherche d\'utilisateur par ID:', error);
                throw error;
            }
        });
    }
    /**
     * Récupère tous les utilisateurs avec filtres optionnels
     */
    findAll(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let query = 'SELECT * FROM users';
                const queryParams = [];
                const conditions = [];
                if ((filters === null || filters === void 0 ? void 0 : filters.role) && filters.role !== 'all') {
                    queryParams.push(filters.role);
                    conditions.push(`role = $${queryParams.length}`);
                }
                if ((filters === null || filters === void 0 ? void 0 : filters.status) && filters.status !== 'all') {
                    queryParams.push(filters.status);
                    conditions.push(`status = $${queryParams.length}`);
                }
                if (filters === null || filters === void 0 ? void 0 : filters.search) {
                    queryParams.push(`%${filters.search}%`);
                    queryParams.push(`%${filters.search}%`);
                    conditions.push(`(name ILIKE $${queryParams.length - 1} OR email ILIKE $${queryParams.length})`);
                }
                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }
                query += ' ORDER BY name ASC';
                const result = yield db_1.default.query(query, queryParams);
                return result.rows;
            }
            catch (error) {
                console.error('Erreur lors de la récupération des utilisateurs:', error);
                throw error;
            }
        });
    }
    /**
     * Crée un nouvel utilisateur
     */
    create(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Vérifier si l'email existe déjà
                const existingUser = yield this.findByEmail(userData.email);
                if (existingUser) {
                    throw new Error('Un utilisateur avec cet email existe déjà');
                }
                // Hachage du mot de passe
                const hashedPassword = yield bcrypt_1.default.hash(userData.password, 10);
                const result = yield db_1.default.query(`INSERT INTO users (
          id, email, password, name, role, phone, birth_date, address, bio, avatar_url, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`, [
                    (0, uuid_1.v4)(),
                    userData.email,
                    hashedPassword,
                    userData.name,
                    userData.role,
                    userData.phone || null,
                    userData.birth_date ? new Date(userData.birth_date) : null,
                    userData.address || null,
                    userData.bio || null,
                    userData.avatar_url || null,
                    'active'
                ]);
                return result.rows[0];
            }
            catch (error) {
                console.error('Erreur lors de la création d\'un utilisateur:', error);
                throw error;
            }
        });
    }
    /**
     * Met à jour un utilisateur existant
     */
    update(id, userData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Vérifier si l'utilisateur existe
                const existingUser = yield this.findById(id);
                if (!existingUser) {
                    throw new Error('Utilisateur non trouvé');
                }
                // Construire la requête de mise à jour
                const updates = [];
                const values = [];
                let paramIndex = 1;
                // Ajouter chaque champ à mettre à jour
                if (userData.email) {
                    updates.push(`email = $${paramIndex}`);
                    values.push(userData.email);
                    paramIndex++;
                }
                if (userData.password) {
                    const hashedPassword = yield bcrypt_1.default.hash(userData.password, 10);
                    updates.push(`password = $${paramIndex}`);
                    values.push(hashedPassword);
                    paramIndex++;
                }
                if (userData.name) {
                    updates.push(`name = $${paramIndex}`);
                    values.push(userData.name);
                    paramIndex++;
                }
                if (userData.role) {
                    updates.push(`role = $${paramIndex}`);
                    values.push(userData.role);
                    paramIndex++;
                }
                if (userData.phone !== undefined) {
                    updates.push(`phone = $${paramIndex}`);
                    values.push(userData.phone || null);
                    paramIndex++;
                }
                if (userData.birth_date !== undefined) {
                    updates.push(`birth_date = $${paramIndex}`);
                    values.push(userData.birth_date ? new Date(userData.birth_date) : null);
                    paramIndex++;
                }
                if (userData.address !== undefined) {
                    updates.push(`address = $${paramIndex}`);
                    values.push(userData.address || null);
                    paramIndex++;
                }
                if (userData.bio !== undefined) {
                    updates.push(`bio = $${paramIndex}`);
                    values.push(userData.bio || null);
                    paramIndex++;
                }
                if (userData.avatar_url !== undefined) {
                    updates.push(`avatar_url = $${paramIndex}`);
                    values.push(userData.avatar_url || null);
                    paramIndex++;
                }
                // Si aucun champ à mettre à jour, retourner l'utilisateur existant
                if (updates.length === 0) {
                    return existingUser;
                }
                // Ajouter l'ID à la fin des valeurs
                values.push(id);
                const query = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *
      `;
                const result = yield db_1.default.query(query, values);
                return result.rows[0];
            }
            catch (error) {
                console.error('Erreur lors de la mise à jour d\'un utilisateur:', error);
                throw error;
            }
        });
    }
    /**
     * Met à jour le statut d'un utilisateur
     */
    updateStatus(id, status) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('UPDATE users SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
                if (result.rows.length === 0) {
                    throw new Error('Utilisateur non trouvé');
                }
                return result.rows[0];
            }
            catch (error) {
                console.error('Erreur lors de la mise à jour du statut d\'un utilisateur:', error);
                throw error;
            }
        });
    }
    /**
     * Supprime un utilisateur
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.default.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
                if (result.rows.length === 0) {
                    throw new Error('Utilisateur non trouvé');
                }
            }
            catch (error) {
                console.error('Erreur lors de la suppression d\'un utilisateur:', error);
                throw error;
            }
        });
    }
    /**
     * Vérifie les identifiants d'un utilisateur
     */
    verifyCredentials(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.findByEmail(email);
                if (!user) {
                    return null;
                }
                // Récupérer le mot de passe haché
                const result = yield db_1.default.query('SELECT password FROM users WHERE id = $1', [user.id]);
                const hashedPassword = result.rows[0].password;
                const isPasswordValid = yield bcrypt_1.default.compare(password, hashedPassword);
                if (!isPasswordValid) {
                    return null;
                }
                return user;
            }
            catch (error) {
                console.error('Erreur lors de la vérification des identifiants:', error);
                throw error;
            }
        });
    }
}
exports.default = new UserModel();
