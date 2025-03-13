import pool from '../src/config/db';
import bcrypt from 'bcrypt';
import userModel from '../src/models/userModel';

async function resetPassword() {
  try {
    const email = 'lesaintdjc@hotmail.fr';
    const newPassword = 'atomejfd';
    
    // Trouver l'utilisateur
    const user = await userModel.findByEmail(email);
    
    if (!user) {
      console.log('Utilisateur non trouvé');
      return;
    }
    
    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour le mot de passe
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    console.log('Mot de passe réinitialisé avec succès pour', email);
    console.log('Nouveau mot de passe:', newPassword);
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
  } finally {
    // Fermer la connexion à la base de données
    pool.end();
  }
}

resetPassword();
