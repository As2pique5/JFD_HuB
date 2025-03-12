import pool from '../config/db';
import { v4 as uuidv4 } from 'uuid';

interface AuditLogData {
  action: string;
  user_id: string;
  target_id?: string;
  target_type?: string;
  details?: any;
}

/**
 * Enregistre un événement d'audit dans la base de données
 * @param action Type d'action (login, logout, create, update, delete, etc.)
 * @param userId ID de l'utilisateur qui a effectué l'action
 * @param targetId ID de l'objet cible de l'action (utilisateur, cotisation, etc.)
 * @param details Détails supplémentaires sur l'action (optionnel)
 */
export async function logAuditEvent(
  action: string,
  userId: string,
  targetId?: string,
  details?: any,
  targetType?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, action, user_id, target_id, target_type, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), action, userId, targetId || null, targetType || null, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'événement d\'audit:', error);
    // Ne pas propager l'erreur pour éviter d'interrompre le flux principal
  }
}

/**
 * Version améliorée pour créer un log d'audit avec une interface plus structurée
 * @param data Données d'audit à enregistrer
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const { action, user_id, target_id, target_type, details } = data;
    
    await pool.query(
      `INSERT INTO audit_logs (id, action, user_id, target_id, target_type, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), action, user_id, target_id || null, target_type || null, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Erreur lors de la création du log d\'audit:', error);
    // Ne pas propager l'erreur pour éviter d'interrompre le flux principal
  }
}
