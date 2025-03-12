import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement depuis .env.test s'il existe, sinon depuis .env
const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

// Augmenter le timeout pour les tests
jest.setTimeout(30000);

// Supprimer les logs pendant les tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Conserver les erreurs et les avertissements pour le débogage
  warn: console.warn,
  error: console.error,
};
