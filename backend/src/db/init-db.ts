import fs from 'fs';
import path from 'path';
import pool from '../config/db';

/**
 * Script pour initialiser la base de données avec le schéma
 */
async function initDatabase() {
  try {
    console.log('Initialisation de la base de données...');
    
    // Lecture du fichier schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Exécution du script SQL
    await pool.query(schema);
    
    console.log('Base de données initialisée avec succès!');
    
    // Création d'un utilisateur super_admin par défaut si aucun n'existe
    const { rows } = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['super_admin']);
    
    if (parseInt(rows[0].count) === 0) {
      console.log('Création d\'un utilisateur super_admin par défaut...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)',
        ['admin@jfdhub.com', hashedPassword, 'Admin', 'super_admin']
      );
      
      console.log('Utilisateur super_admin créé avec succès!');
      console.log('Email: admin@jfdhub.com');
      console.log('Mot de passe: admin123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

// Exécution de la fonction d'initialisation
initDatabase();
