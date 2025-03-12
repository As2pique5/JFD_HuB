import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Import des routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import monthlyContributionRoutes from './routes/monthlyContributionRoutes';

// Chargement des variables d'environnement
dotenv.config();

// Création de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration de Morgan pour les logs
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, '../logs/access.log'),
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));

// Création du dossier uploads s'il n'existe pas
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(path.join(__dirname, '..', uploadDir))) {
  fs.mkdirSync(path.join(__dirname, '..', uploadDir), { recursive: true });
}

// Création du dossier logs s'il n'existe pas
if (!fs.existsSync(path.join(__dirname, '../logs'))) {
  fs.mkdirSync(path.join(__dirname, '../logs'), { recursive: true });
}

// Route de test
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Bienvenue sur l\'API JFD\'HuB!' });
});

// Routes de l'API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/monthly-contributions', monthlyContributionRoutes);

// Gestion des erreurs
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Une erreur est survenue',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
});
