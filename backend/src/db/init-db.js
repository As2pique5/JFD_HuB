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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("../config/db"));
/**
 * Script pour initialiser la base de données avec le schéma
 */
function initDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Initialisation de la base de données...');
            // Lecture du fichier schema.sql
            const schemaPath = path_1.default.join(__dirname, 'schema.sql');
            const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
            // Exécution du script SQL
            yield db_1.default.query(schema);
            console.log('Base de données initialisée avec succès!');
            // Création d'un utilisateur super_admin par défaut si aucun n'existe
            const { rows } = yield db_1.default.query('SELECT COUNT(*) FROM users WHERE role = $1', ['super_admin']);
            if (parseInt(rows[0].count) === 0) {
                console.log('Création d\'un utilisateur super_admin par défaut...');
                const bcrypt = require('bcrypt');
                const hashedPassword = yield bcrypt.hash('admin123', 10);
                yield db_1.default.query('INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)', ['admin@jfdhub.com', hashedPassword, 'Admin', 'super_admin']);
                console.log('Utilisateur super_admin créé avec succès!');
                console.log('Email: admin@jfdhub.com');
                console.log('Mot de passe: admin123');
            }
            process.exit(0);
        }
        catch (error) {
            console.error('Erreur lors de l\'initialisation de la base de données:', error);
            process.exit(1);
        }
    });
}
// Exécution de la fonction d'initialisation
initDatabase();
