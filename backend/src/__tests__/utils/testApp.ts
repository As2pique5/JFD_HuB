import express from 'express';
import request from 'supertest';
import cors from 'cors';
import helmet from 'helmet';
import jwt, { Secret } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

// Importer les routes
import familyRoutes from '../../routes/familyRoutes';

// Créer une application Express pour les tests
export function createTestApp() {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
  app.use(helmet());
  
  // Créer les dossiers d'upload pour les tests s'ils n'existent pas
  const testUploadDir = process.env.UPLOAD_DIR || './uploads/test';
  const familyPhotosDir = process.env.FAMILY_PHOTOS_DIR || './uploads/test/family';
  
  if (!fs.existsSync(testUploadDir)) {
    fs.mkdirSync(testUploadDir, { recursive: true });
  }
  
  if (!fs.existsSync(familyPhotosDir)) {
    fs.mkdirSync(familyPhotosDir, { recursive: true });
  }
  
  // Routes statiques pour les fichiers uploadés
  app.use('/uploads', express.static(path.join(process.cwd(), testUploadDir)));
  
  // Routes API
  app.use('/api/family', familyRoutes);
  
  // Route de test pour vérifier que l'application fonctionne
  app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'Test API is working' });
  });
  
  // Middleware de gestion des erreurs
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });
  
  return app;
}

/**
 * Génère un token JWT pour les tests
 * @param role Rôle de l'utilisateur (admin, member, etc.)
 * @returns Token JWT
 */
export function generateTestToken(role: string = 'member'): string {
  const userId = uuidv4();
  const payload = {
    id: userId,
    email: `test-${userId}@example.com`,
    role: role
  };
  
  const secret = process.env.JWT_SECRET || 'test_secret_key';
  return jwt.sign(
    payload, 
    secret
  );
}

/**
 * Crée un agent de test avec authentification
 * @param role Rôle de l'utilisateur
 * @returns Agent Supertest authentifié
 */
export function createAuthenticatedAgent(role: string = 'member') {
  const app = createTestApp();
  const agent = request.agent(app);
  const token = generateTestToken(role);
  
  // Ajouter le token à toutes les requêtes
  const originalGet = agent.get;
  const originalPost = agent.post;
  const originalPut = agent.put;
  const originalDelete = agent.delete;
  
  agent.get = function(url: string) {
    return originalGet.call(this, url)
      .set('Authorization', `Bearer ${token}`);
  };
  
  agent.post = function(url: string) {
    return originalPost.call(this, url)
      .set('Authorization', `Bearer ${token}`);
  };
  
  agent.put = function(url: string) {
    return originalPut.call(this, url)
      .set('Authorization', `Bearer ${token}`);
  };
  
  agent.delete = function(url: string) {
    return originalDelete.call(this, url)
      .set('Authorization', `Bearer ${token}`);
  };
  
  return agent;
}
