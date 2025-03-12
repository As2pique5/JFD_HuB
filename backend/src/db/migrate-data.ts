import { createClient } from '@supabase/supabase-js';
import pool from '../config/db';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Les variables d\'environnement SUPABASE_URL et SUPABASE_KEY doivent être définies');
  process.exit(1);
}

// Créer un client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fonction principale de migration des données
 */
async function migrateData() {
  try {
    console.log('Début de la migration des données de Supabase vers PostgreSQL local...');
    
    // Migrer les utilisateurs
    await migrateUsers();
    
    // Migrer les sessions de cotisations mensuelles
    await migrateMonthlyContributionSessions();
    
    // Migrer les assignations de cotisations mensuelles
    await migrateMonthlyContributionAssignments();
    
    // Migrer les événements
    await migrateEvents();
    
    // Migrer les participants aux événements
    await migrateEventParticipants();
    
    // Migrer les cotisations pour événements
    await migrateEventContributions();
    
    // Migrer les assignations de cotisations pour événements
    await migrateEventContributionAssignments();
    
    // Migrer les projets
    await migrateProjects();
    
    // Migrer les phases de projets
    await migrateProjectPhases();
    
    // Migrer les participants aux projets
    await migrateProjectParticipants();
    
    // Migrer les cotisations pour projets
    await migrateProjectContributions();
    
    // Migrer les assignations de cotisations pour projets
    await migrateProjectContributionAssignments();
    
    // Migrer les catégories de documents
    await migrateDocumentCategories();
    
    // Migrer les documents
    await migrateDocuments();
    
    // Migrer les messages
    await migrateMessages();
    
    // Migrer les destinataires de messages
    await migrateMessageRecipients();
    
    // Migrer les membres de la famille
    await migrateFamilyMembers();
    
    // Migrer les relations familiales
    await migrateFamilyRelationships();
    
    // Migrer les contributions
    await migrateContributions();
    
    console.log('Migration des données terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la migration des données:', error);
    process.exit(1);
  }
}

/**
 * Migrer les utilisateurs
 */
async function migrateUsers() {
  console.log('Migration des utilisateurs...');
  
  // Récupérer les utilisateurs depuis Supabase
  const { data: users, error } = await supabase
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
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
    
    if (rows.length > 0) {
      console.log(`L'utilisateur ${user.email} existe déjà, mise à jour...`);
      
      // Mettre à jour l'utilisateur
      await pool.query(
        `UPDATE users 
         SET name = $1, role = $2, phone = $3, birth_date = $4, address = $5, bio = $6, avatar_url = $7, status = $8, updated_at = NOW()
         WHERE email = $9`,
        [
          user.name,
          user.role,
          user.phone,
          user.birth_date,
          user.address,
          user.bio,
          user.avatar_url,
          user.status,
          user.email
        ]
      );
    } else {
      console.log(`Création de l'utilisateur ${user.email}...`);
      
      // Générer un mot de passe temporaire
      const tempPassword = await bcrypt.hash('changeme', 10);
      
      // Insérer le nouvel utilisateur
      await pool.query(
        `INSERT INTO users (id, email, password, name, role, phone, birth_date, address, bio, avatar_url, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
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
        ]
      );
    }
  }
  
  console.log('Migration des utilisateurs terminée.');
}

// Fonctions pour les autres tables
// Note: Ces fonctions suivront la même structure que migrateUsers
// Pour simplifier ce fichier, elles sont définies comme des fonctions vides
// qui seront implémentées au fur et à mesure de la migration

async function migrateMonthlyContributionSessions() {
  console.log('Migration des sessions de cotisations mensuelles...');
  // Implémentation similaire à migrateUsers
}

async function migrateMonthlyContributionAssignments() {
  console.log('Migration des assignations de cotisations mensuelles...');
  // Implémentation similaire à migrateUsers
}

async function migrateEvents() {
  console.log('Migration des événements...');
  // Implémentation similaire à migrateUsers
}

async function migrateEventParticipants() {
  console.log('Migration des participants aux événements...');
  // Implémentation similaire à migrateUsers
}

async function migrateEventContributions() {
  console.log('Migration des cotisations pour événements...');
  // Implémentation similaire à migrateUsers
}

async function migrateEventContributionAssignments() {
  console.log('Migration des assignations de cotisations pour événements...');
  // Implémentation similaire à migrateUsers
}

async function migrateProjects() {
  console.log('Migration des projets...');
  // Implémentation similaire à migrateUsers
}

async function migrateProjectPhases() {
  console.log('Migration des phases de projets...');
  // Implémentation similaire à migrateUsers
}

async function migrateProjectParticipants() {
  console.log('Migration des participants aux projets...');
  // Implémentation similaire à migrateUsers
}

async function migrateProjectContributions() {
  console.log('Migration des cotisations pour projets...');
  // Implémentation similaire à migrateUsers
}

async function migrateProjectContributionAssignments() {
  console.log('Migration des assignations de cotisations pour projets...');
  // Implémentation similaire à migrateUsers
}

async function migrateDocumentCategories() {
  console.log('Migration des catégories de documents...');
  // Implémentation similaire à migrateUsers
}

async function migrateDocuments() {
  console.log('Migration des documents...');
  // Implémentation similaire à migrateUsers
}

async function migrateMessages() {
  console.log('Migration des messages...');
  // Implémentation similaire à migrateUsers
}

async function migrateMessageRecipients() {
  console.log('Migration des destinataires de messages...');
  // Implémentation similaire à migrateUsers
}

async function migrateFamilyMembers() {
  console.log('Migration des membres de la famille...');
  // Implémentation similaire à migrateUsers
}

async function migrateFamilyRelationships() {
  console.log('Migration des relations familiales...');
  // Implémentation similaire à migrateUsers
}

async function migrateContributions() {
  console.log('Migration des contributions...');
  // Implémentation similaire à migrateUsers
}

// Exécuter la fonction de migration
migrateData();
