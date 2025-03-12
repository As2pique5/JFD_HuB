import pool from '../config/db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'intermediate' | 'standard';
  phone?: string;
  birth_date?: Date;
  address?: string;
  bio?: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface UserInput {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'intermediate' | 'standard';
  phone?: string;
  birth_date?: string;
  address?: string;
  bio?: string;
  avatar_url?: string;
  status?: 'active' | 'inactive';
}

class UserModel {
  /**
   * Trouve un utilisateur par son email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Erreur lors de la recherche d\'utilisateur par email:', error);
      throw error;
    }
  }
  
  /**
   * Trouve un utilisateur par son ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Erreur lors de la recherche d\'utilisateur par ID:', error);
      throw error;
    }
  }
  
  /**
   * Récupère tous les utilisateurs avec filtres optionnels
   */
  async findAll(filters?: { role?: string; status?: string; search?: string }): Promise<User[]> {
    try {
      let query = 'SELECT * FROM users';
      const queryParams: any[] = [];
      const conditions: string[] = [];
      
      if (filters?.role && filters.role !== 'all') {
        queryParams.push(filters.role);
        conditions.push(`role = $${queryParams.length}`);
      }
      
      if (filters?.status && filters.status !== 'all') {
        queryParams.push(filters.status);
        conditions.push(`status = $${queryParams.length}`);
      }
      
      if (filters?.search) {
        queryParams.push(`%${filters.search}%`);
        queryParams.push(`%${filters.search}%`);
        conditions.push(`(name ILIKE $${queryParams.length - 1} OR email ILIKE $${queryParams.length})`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY name ASC';
      
      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      throw error;
    }
  }
  
  /**
   * Crée un nouvel utilisateur
   */
  async create(userData: UserInput): Promise<User> {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }
      
      // Hachage du mot de passe
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const result = await pool.query(
        `INSERT INTO users (
          id, email, password, name, role, phone, birth_date, address, bio, avatar_url, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
        [
          uuidv4(),
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
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la création d\'un utilisateur:', error);
      throw error;
    }
  }
  
  /**
   * Met à jour un utilisateur existant
   */
  async update(id: string, userData: Partial<UserInput>): Promise<User> {
    try {
      // Vérifier si l'utilisateur existe
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error('Utilisateur non trouvé');
      }
      
      // Construire la requête de mise à jour
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      // Ajouter chaque champ à mettre à jour
      if (userData.email) {
        updates.push(`email = $${paramIndex}`);
        values.push(userData.email);
        paramIndex++;
      }
      
      if (userData.password) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
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
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la mise à jour d\'un utilisateur:', error);
      throw error;
    }
  }
  
  /**
   * Met à jour le statut d'un utilisateur
   */
  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<User> {
    try {
      const result = await pool.query(
        'UPDATE users SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut d\'un utilisateur:', error);
      throw error;
    }
  }
  
  /**
   * Supprime un utilisateur
   */
  async delete(id: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression d\'un utilisateur:', error);
      throw error;
    }
  }
  
  /**
   * Vérifie les identifiants d'un utilisateur
   */
  async verifyCredentials(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);
      
      if (!user) {
        return null;
      }
      
      // Récupérer le mot de passe haché
      const result = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [user.id]
      );
      
      const hashedPassword = result.rows[0].password;
      const isPasswordValid = await bcrypt.compare(password, hashedPassword);
      
      if (!isPasswordValid) {
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('Erreur lors de la vérification des identifiants:', error);
      throw error;
    }
  }
}

export default new UserModel();
