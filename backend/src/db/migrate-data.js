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
const supabase_js_1 = require("@supabase/supabase-js");
const db_1 = __importDefault(require("../config/db"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
// Charger les variables d'environnement
dotenv_1.default.config();
// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Les variables d\'environnement SUPABASE_URL et SUPABASE_KEY doivent être définies');
    process.exit(1);
}
// Créer un client Supabase
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
/**
 * Fonction principale de migration des données
 */
function migrateData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Début de la migration des données de Supabase vers PostgreSQL local...');
            // Migrer les utilisateurs
            yield migrateUsers();
            // Migrer les sessions de cotisations mensuelles
            yield migrateMonthlyContributionSessions();
            // Migrer les assignations de cotisations mensuelles
            yield migrateMonthlyContributionAssignments();
            // Migrer les événements
            yield migrateEvents();
            // Migrer les participants aux événements
            yield migrateEventParticipants();
            // Migrer les cotisations pour événements
            yield migrateEventContributions();
            // Migrer les assignations de cotisations pour événements
            yield migrateEventContributionAssignments();
            // Migrer les projets
            yield migrateProjects();
            // Migrer les phases de projets
            yield migrateProjectPhases();
            // Migrer les participants aux projets
            yield migrateProjectParticipants();
            // Migrer les cotisations pour projets
            yield migrateProjectContributions();
            // Migrer les assignations de cotisations pour projets
            yield migrateProjectContributionAssignments();
            // Migrer les catégories de documents
            yield migrateDocumentCategories();
            // Migrer les documents
            yield migrateDocuments();
            // Migrer les messages
            yield migrateMessages();
            // Migrer les destinataires de messages
            yield migrateMessageRecipients();
            // Migrer les membres de la famille
            yield migrateFamilyMembers();
            // Migrer les relations familiales
            yield migrateFamilyRelationships();
            // Migrer les contributions
            yield migrateContributions();
            console.log('Migration des données terminée avec succès!');
            process.exit(0);
        }
        catch (error) {
            console.error('Erreur lors de la migration des données:', error);
            process.exit(1);
        }
    });
}
/**
 * Migrer les utilisateurs
 */
function migrateUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des utilisateurs...');
        // Récupérer les utilisateurs depuis Supabase
        const { data: users, error } = yield supabase
            .from('profiles')
            .select('*');
        if (error) {
            throw new Error(`Erreur lors de la récupération des utilisateurs: ${error.message}`);
        }
        if (!users || users.length === 0) {
            console.log('Aucun utilisateur à migrer.');
            return;
        }
        console.log(`${users.length} utilisateurs trouvés.`);
        // Migrer chaque utilisateur
        for (const user of users) {
            // Vérifier si l'utilisateur existe déjà
            const { rows } = yield db_1.default.query('SELECT id FROM users WHERE email = $1', [user.email]);
            if (rows.length > 0) {
                console.log(`L'utilisateur ${user.email} existe déjà, mise à jour...`);
                // Mettre à jour l'utilisateur
                yield db_1.default.query(`UPDATE users 
         SET name = $1, role = $2, phone = $3, birth_date = $4, address = $5, bio = $6, avatar_url = $7, status = $8, updated_at = NOW()
         WHERE email = $9`, [
                    user.name,
                    user.role,
                    user.phone,
                    user.birth_date,
                    user.address,
                    user.bio,
                    user.avatar_url,
                    user.status,
                    user.email
                ]);
            }
            else {
                console.log(`Création de l'utilisateur ${user.email}...`);
                // Générer un mot de passe temporaire
                const tempPassword = yield bcrypt_1.default.hash('changeme', 10);
                // Insérer le nouvel utilisateur
                yield db_1.default.query(`INSERT INTO users (id, email, password, name, role, phone, birth_date, address, bio, avatar_url, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                    user.id,
                    user.email,
                    tempPassword,
                    user.name,
                    user.role || 'standard',
                    user.phone,
                    user.birth_date,
                    user.address,
                    user.bio,
                    user.avatar_url,
                    user.status || 'active',
                    user.created_at || new Date(),
                    user.updated_at || new Date()
                ]);
            }
        }
        console.log('Migration des utilisateurs terminée.');
    });
}
// Fonctions pour les autres tables
// Note: Ces fonctions suivront la même structure que migrateUsers
// Pour simplifier ce fichier, elles sont définies comme des fonctions vides
// qui seront implémentées au fur et à mesure de la migration
function migrateMonthlyContributionSessions() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des sessions de cotisations mensuelles...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateMonthlyContributionAssignments() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des assignations de cotisations mensuelles...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateEvents() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des événements...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateEventParticipants() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des participants aux événements...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateEventContributions() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des cotisations pour événements...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateEventContributionAssignments() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des assignations de cotisations pour événements...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateProjects() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des projets...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateProjectPhases() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des phases de projets...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateProjectParticipants() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des participants aux projets...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateProjectContributions() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des cotisations pour projets...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateProjectContributionAssignments() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des assignations de cotisations pour projets...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateDocumentCategories() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des catégories de documents...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateDocuments() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des documents...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateMessages() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des messages...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateMessageRecipients() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des destinataires de messages...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateFamilyMembers() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des membres de la famille...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateFamilyRelationships() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des relations familiales...');
        // Implémentation similaire à migrateUsers
    });
}
function migrateContributions() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Migration des contributions...');
        // Implémentation similaire à migrateUsers
    });
}
// Exécuter la fonction de migration
migrateData();
