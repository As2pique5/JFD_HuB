import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Créer une pool de connexion pour les tests
const testPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/**
 * Initialise la base de données de test
 */
export async function initTestDb(): Promise<void> {
  try {
    // Vérifier si la base de données existe, sinon la créer
    const dbExists = await checkIfDbExists();
    if (!dbExists) {
      await createTestDb();
    }
    
    // Exécuter les scripts de création de tables
    await createTables();
    
    console.log('Base de données de test initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données de test:', error);
    throw error;
  }
}

/**
 * Vérifie si la base de données de test existe
 */
async function checkIfDbExists(): Promise<boolean> {
  const client = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres', // Se connecter à la base postgres par défaut
  });
  
  try {
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.DB_NAME]
    );
    return result.rowCount !== null && result.rowCount > 0;
  } finally {
    client.end();
  }
}

/**
 * Crée la base de données de test
 */
async function createTestDb(): Promise<void> {
  const client = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres', // Se connecter à la base postgres par défaut
  });
  
  try {
    await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    console.log(`Base de données ${process.env.DB_NAME} créée avec succès`);
  } finally {
    client.end();
  }
}

/**
 * Crée les tables nécessaires pour les tests
 */
async function createTables(): Promise<void> {
  // Exécuter les scripts SQL de création de tables
  const sqlPath = path.join(__dirname, '../../../db/schema.sql');
  
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await testPool.query(sql);
  } else {
    console.warn('Fichier schema.sql non trouvé. Création manuelle des tables requises pour les tests.');
    await createRequiredTables();
  }
}

/**
 * Crée manuellement les tables minimales requises pour les tests
 */
async function createRequiredTables(): Promise<void> {
  // Créer les tables minimales nécessaires pour les tests
  const queries = [
    // Table des utilisateurs
    `CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) NOT NULL DEFAULT 'member',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Table des membres de la famille
    `CREATE TABLE IF NOT EXISTS family_members (
      id UUID PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      birth_date DATE,
      death_date DATE,
      gender VARCHAR(10),
      photo_url VARCHAR(255),
      bio TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Table des relations familiales
    `CREATE TABLE IF NOT EXISTS family_relationships (
      id UUID PRIMARY KEY,
      member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
      related_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
      relationship_type VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(member_id, related_member_id, relationship_type)
    )`,
    
    // Table d'audit
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY,
      action VARCHAR(50) NOT NULL,
      user_id UUID,
      target_id UUID,
      target_type VARCHAR(50),
      details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  
  for (const query of queries) {
    await testPool.query(query);
  }
}

/**
 * Nettoie la base de données de test en supprimant toutes les données
 */
export async function cleanTestDb(): Promise<void> {
  const tables = [
    'audit_logs',
    'family_relationships',
    'family_members',
    'profiles'
  ];
  
  try {
    // Désactiver temporairement les contraintes de clé étrangère
    await testPool.query('SET session_replication_role = replica;');
    
    // Vider les tables
    for (const table of tables) {
      await testPool.query(`TRUNCATE TABLE ${table} CASCADE`);
    }
    
    // Réactiver les contraintes de clé étrangère
    await testPool.query('SET session_replication_role = DEFAULT;');
    
    console.log('Base de données de test nettoyée avec succès');
  } catch (error) {
    console.error('Erreur lors du nettoyage de la base de données de test:', error);
    throw error;
  }
}

/**
 * Ferme la connexion à la base de données de test
 */
export async function closeTestDb(): Promise<void> {
  await testPool.end();
}

// Exporter le pool pour l'utiliser dans les tests
export { testPool };
