"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Configuration de la connexion à PostgreSQL
const pool = new pg_1.Pool({
    user: process.env.DB_USER || 'job',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'JFD_HuB',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432'),
});
// Test de connexion
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erreur de connexion à PostgreSQL:', err);
        return;
    }
    console.log('Connexion à PostgreSQL établie avec succès!');
    release();
});
exports.default = pool;
