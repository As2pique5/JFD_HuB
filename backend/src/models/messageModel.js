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
class MessageModel {
    constructor() {
        this.pool = db_1.default;
    }
    /**
     * Récupérer tous les messages
     */
    getAllMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM messages
      ORDER BY created_at DESC
    `;
            const result = yield this.pool.query(query);
            return result.rows;
        });
    }
    /**
     * Récupérer un message par son ID
     */
    getMessageById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // Récupérer le message
            const messageQuery = `
      SELECT m.*, p.display_name as sender_name
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      WHERE m.id = $1
    `;
            const messageResult = yield this.pool.query(messageQuery, [id]);
            if (messageResult.rows.length === 0) {
                return null;
            }
            const message = messageResult.rows[0];
            // Récupérer les destinataires
            const recipientsQuery = `
      SELECT mr.*, p.display_name as recipient_name
      FROM message_recipients mr
      JOIN profiles p ON mr.recipient_id = p.id
      WHERE mr.message_id = $1
    `;
            const recipientsResult = yield this.pool.query(recipientsQuery, [id]);
            message.recipients = recipientsResult.rows.map(row => ({
                id: row.id,
                recipient_id: row.recipient_id,
                recipient_name: row.recipient_name,
                is_read: row.is_read
            }));
            // Récupérer les pièces jointes
            const attachmentsQuery = `
      SELECT * FROM message_attachments
      WHERE message_id = $1
    `;
            const attachmentsResult = yield this.pool.query(attachmentsQuery, [id]);
            message.attachments = attachmentsResult.rows;
            return message;
        });
    }
    /**
     * Récupérer les messages envoyés par un utilisateur
     */
    getSentMessages(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT 
        m.id, 
        m.sender_id, 
        p.display_name as sender_name,
        m.subject, 
        SUBSTRING(m.content, 1, 100) as preview,
        m.is_read, 
        m.created_at,
        m.has_attachments,
        COUNT(mr.id) as recipient_count
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      LEFT JOIN message_recipients mr ON m.id = mr.message_id
      WHERE m.sender_id = $1
      GROUP BY m.id, p.display_name
      ORDER BY m.created_at DESC
    `;
            const result = yield this.pool.query(query, [userId]);
            return result.rows;
        });
    }
    /**
     * Récupérer les messages reçus par un utilisateur
     */
    getReceivedMessages(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT 
        m.id, 
        m.sender_id, 
        p.display_name as sender_name,
        m.subject, 
        SUBSTRING(m.content, 1, 100) as preview,
        mr.is_read, 
        m.created_at,
        m.has_attachments,
        COUNT(mr2.id) as recipient_count
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      JOIN message_recipients mr ON m.id = mr.message_id AND mr.recipient_id = $1 AND mr.is_deleted = false
      LEFT JOIN message_recipients mr2 ON m.id = mr2.message_id
      GROUP BY m.id, p.display_name, mr.is_read
      ORDER BY m.created_at DESC
    `;
            const result = yield this.pool.query(query, [userId]);
            return result.rows;
        });
    }
    /**
     * Récupérer les messages supprimés par un utilisateur
     */
    getDeletedMessages(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT 
        m.id, 
        m.sender_id, 
        p.display_name as sender_name,
        m.subject, 
        SUBSTRING(m.content, 1, 100) as preview,
        mr.is_read, 
        m.created_at,
        m.has_attachments,
        COUNT(mr2.id) as recipient_count
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      JOIN message_recipients mr ON m.id = mr.message_id AND mr.recipient_id = $1 AND mr.is_deleted = true
      LEFT JOIN message_recipients mr2 ON m.id = mr2.message_id
      GROUP BY m.id, p.display_name, mr.is_read
      ORDER BY m.created_at DESC
    `;
            const result = yield this.pool.query(query, [userId]);
            return result.rows;
        });
    }
    /**
     * Récupérer un fil de discussion
     */
    getMessageThread(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Récupérer le message principal
            const mainMessageQuery = `
      SELECT * FROM messages
      WHERE id = $1
    `;
            const mainMessageResult = yield this.pool.query(mainMessageQuery, [messageId]);
            if (mainMessageResult.rows.length === 0) {
                throw new Error('Message non trouvé');
            }
            const mainMessage = mainMessageResult.rows[0];
            // Récupérer tous les messages du fil (parent et enfants)
            let threadMessages = [mainMessage];
            // Si c'est un message enfant, récupérer le parent
            if (mainMessage.parent_id) {
                const parentQuery = `
        SELECT * FROM messages
        WHERE id = $1
      `;
                const parentResult = yield this.pool.query(parentQuery, [mainMessage.parent_id]);
                if (parentResult.rows.length > 0) {
                    threadMessages.unshift(parentResult.rows[0]);
                }
            }
            // Récupérer les messages enfants
            const childrenQuery = `
      SELECT * FROM messages
      WHERE parent_id = $1
      ORDER BY created_at ASC
    `;
            const childrenResult = yield this.pool.query(childrenQuery, [messageId]);
            threadMessages = [...threadMessages, ...childrenResult.rows];
            // Récupérer tous les destinataires pour ces messages
            const messageIds = threadMessages.map(m => m.id);
            const recipientsQuery = `
      SELECT * FROM message_recipients
      WHERE message_id = ANY($1)
    `;
            const recipientsResult = yield this.pool.query(recipientsQuery, [messageIds]);
            // Récupérer toutes les pièces jointes pour ces messages
            const attachmentsQuery = `
      SELECT * FROM message_attachments
      WHERE message_id = ANY($1)
    `;
            const attachmentsResult = yield this.pool.query(attachmentsQuery, [messageIds]);
            return {
                messages: threadMessages,
                recipients: recipientsResult.rows,
                attachments: attachmentsResult.rows
            };
        });
    }
    /**
     * Créer un nouveau message
     */
    createMessage(messageData, recipientIds, attachments) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                // Insérer le message
                const messageId = (0, uuid_1.v4)();
                const messageQuery = `
        INSERT INTO messages (
          id, sender_id, subject, content, is_read, parent_id, has_attachments, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;
                const hasAttachments = attachments && attachments.length > 0;
                const messageResult = yield client.query(messageQuery, [
                    messageId,
                    messageData.sender_id,
                    messageData.subject,
                    messageData.content,
                    messageData.is_read,
                    messageData.parent_id || null,
                    hasAttachments
                ]);
                const message = messageResult.rows[0];
                // Insérer les destinataires
                for (const recipientId of recipientIds) {
                    const recipientQuery = `
          INSERT INTO message_recipients (
            id, message_id, recipient_id, is_read, is_deleted, created_at, updated_at
          )
          VALUES ($1, $2, $3, false, false, NOW(), NOW())
        `;
                    yield client.query(recipientQuery, [(0, uuid_1.v4)(), messageId, recipientId]);
                }
                // Insérer les pièces jointes si présentes
                if (attachments && attachments.length > 0) {
                    for (const attachment of attachments) {
                        const attachmentQuery = `
            INSERT INTO message_attachments (
              id, message_id, file_name, file_path, file_size, file_type, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          `;
                        yield client.query(attachmentQuery, [
                            (0, uuid_1.v4)(),
                            messageId,
                            attachment.file_name,
                            attachment.file_path,
                            attachment.file_size,
                            attachment.file_type
                        ]);
                    }
                }
                yield client.query('COMMIT');
                return message;
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
     * Marquer un message comme lu
     */
    markMessageAsRead(messageId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      UPDATE message_recipients
      SET is_read = true, updated_at = NOW()
      WHERE message_id = $1 AND recipient_id = $2
      RETURNING *
    `;
            const result = yield this.pool.query(query, [messageId, userId]);
            return result.rowCount !== null && result.rowCount > 0;
        });
    }
    /**
     * Marquer un message comme supprimé
     */
    markMessageAsDeleted(messageId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      UPDATE message_recipients
      SET is_deleted = true, updated_at = NOW()
      WHERE message_id = $1 AND recipient_id = $2
      RETURNING *
    `;
            const result = yield this.pool.query(query, [messageId, userId]);
            return result.rowCount !== null && result.rowCount > 0;
        });
    }
    /**
     * Restaurer un message supprimé
     */
    restoreDeletedMessage(messageId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      UPDATE message_recipients
      SET is_deleted = false, updated_at = NOW()
      WHERE message_id = $1 AND recipient_id = $2
      RETURNING *
    `;
            const result = yield this.pool.query(query, [messageId, userId]);
            return result.rowCount !== null && result.rowCount > 0;
        });
    }
    /**
     * Supprimer définitivement un message
     */
    deleteMessage(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                // Supprimer les pièces jointes
                const attachmentsQuery = `
        DELETE FROM message_attachments
        WHERE message_id = $1
      `;
                yield client.query(attachmentsQuery, [messageId]);
                // Supprimer les destinataires
                const recipientsQuery = `
        DELETE FROM message_recipients
        WHERE message_id = $1
      `;
                yield client.query(recipientsQuery, [messageId]);
                // Supprimer le message
                const messageQuery = `
        DELETE FROM messages
        WHERE id = $1
        RETURNING *
      `;
                const result = yield client.query(messageQuery, [messageId]);
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
     * Compter les messages non lus pour un utilisateur
     */
    countUnreadMessages(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT COUNT(*) as count
      FROM message_recipients
      WHERE recipient_id = $1 AND is_read = false AND is_deleted = false
    `;
            const result = yield this.pool.query(query, [userId]);
            return parseInt(result.rows[0].count);
        });
    }
    /**
     * Rechercher des messages
     */
    searchMessages(userId, searchTerm) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT 
        m.id, 
        m.sender_id, 
        p.display_name as sender_name,
        m.subject, 
        SUBSTRING(m.content, 1, 100) as preview,
        mr.is_read, 
        m.created_at,
        m.has_attachments,
        COUNT(mr2.id) as recipient_count
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      JOIN message_recipients mr ON m.id = mr.message_id 
        AND mr.recipient_id = $1 
        AND mr.is_deleted = false
      LEFT JOIN message_recipients mr2 ON m.id = mr2.message_id
      WHERE 
        (m.subject ILIKE $2 OR m.content ILIKE $2)
      GROUP BY m.id, p.display_name, mr.is_read
      ORDER BY m.created_at DESC
    `;
            const result = yield this.pool.query(query, [userId, `%${searchTerm}%`]);
            return result.rows;
        });
    }
}
exports.default = new MessageModel();
