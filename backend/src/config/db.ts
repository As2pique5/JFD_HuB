import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuration de la connexion à PostgreSQL
const pool = new Pool({
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

export default pool;