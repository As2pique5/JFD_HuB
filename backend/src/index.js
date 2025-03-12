"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Import des routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const monthlyContributionRoutes_1 = __importDefault(require("./routes/monthlyContributionRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const contributionRoutes_1 = __importDefault(require("./routes/contributionRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const familyRoutes_1 = __importDefault(require("./routes/familyRoutes"));
// Chargement des variables d'environnement
dotenv_1.default.config();
// Création de l'application Express
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middlewares
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Configuration de Morgan pour les logs
const accessLogStream = fs_1.default.createWriteStream(path_1.default.join(__dirname, '../logs/access.log'), { flags: 'a' });
app.use((0, morgan_1.default)('combined', { stream: accessLogStream }));
// Création du dossier uploads s'il n'existe pas
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs_1.default.existsSync(path_1.default.join(__dirname, '..', uploadDir))) {
    fs_1.default.mkdirSync(path_1.default.join(__dirname, '..', uploadDir), { recursive: true });
}
// Création du dossier temporaire pour les uploads
if (!fs_1.default.existsSync(path_1.default.join(__dirname, '..', uploadDir, 'temp'))) {
    fs_1.default.mkdirSync(path_1.default.join(__dirname, '..', uploadDir, 'temp'), { recursive: true });
}
// Création du dossier pour les reçus de paiement
if (!fs_1.default.existsSync(path_1.default.join(__dirname, '..', uploadDir, 'receipts'))) {
    fs_1.default.mkdirSync(path_1.default.join(__dirname, '..', uploadDir, 'receipts'), { recursive: true });
}
// Création du dossier pour les pièces jointes des messages
if (!fs_1.default.existsSync(path_1.default.join(__dirname, '..', uploadDir, 'attachments'))) {
    fs_1.default.mkdirSync(path_1.default.join(__dirname, '..', uploadDir, 'attachments'), { recursive: true });
}
// Création du dossier pour les photos des membres de la famille
if (!fs_1.default.existsSync(path_1.default.join(__dirname, '..', uploadDir, 'family_photos'))) {
    fs_1.default.mkdirSync(path_1.default.join(__dirname, '..', uploadDir, 'family_photos'), { recursive: true });
}
// Création du dossier logs s'il n'existe pas
if (!fs_1.default.existsSync(path_1.default.join(__dirname, '../logs'))) {
    fs_1.default.mkdirSync(path_1.default.join(__dirname, '../logs'), { recursive: true });
}
// Route de test
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenue sur l\'API JFD\'HuB!' });
});
// Routes de l'API
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/monthly-contributions', monthlyContributionRoutes_1.default);
app.use('/api/events', eventRoutes_1.default);
app.use('/api/projects', projectRoutes_1.default);
app.use('/api/documents', documentRoutes_1.default);
app.use('/api/contributions', contributionRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/family', familyRoutes_1.default);
// Gestion des erreurs
app.use((err, req, res, next) => {
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
