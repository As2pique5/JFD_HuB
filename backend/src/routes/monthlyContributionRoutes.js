"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const monthlyContributionController_1 = __importDefault(require("../controllers/monthlyContributionController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
/**
 * @route   GET /api/monthly-contributions
 * @desc    Récupérer toutes les sessions de cotisations mensuelles
 * @access  Privé
 */
router.get('/', authMiddleware_1.authenticate, (req, res, next) => {
    monthlyContributionController_1.default.getAllSessions(req, res)
        .catch(next);
});
/**
 * @route   GET /api/monthly-contributions/:id
 * @desc    Récupérer une session de cotisations mensuelles par son ID
 * @access  Privé
 */
router.get('/:id', authMiddleware_1.authenticate, (req, res, next) => {
    monthlyContributionController_1.default.getSessionById(req, res)
        .catch(next);
});
/**
 * @route   POST /api/monthly-contributions
 * @desc    Créer une nouvelle session de cotisations mensuelles
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post('/', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    monthlyContributionController_1.default.createSession(req, res)
        .catch(next);
});
/**
 * @route   PUT /api/monthly-contributions/:id
 * @desc    Mettre à jour une session de cotisations mensuelles
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put('/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    monthlyContributionController_1.default.updateSession(req, res)
        .catch(next);
});
/**
 * @route   DELETE /api/monthly-contributions/:id
 * @desc    Supprimer une session de cotisations mensuelles
 * @access  Privé (Admin uniquement)
 */
router.delete('/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin']), (req, res, next) => {
    monthlyContributionController_1.default.deleteSession(req, res)
        .catch(next);
});
/**
 * @route   GET /api/monthly-contributions/:sessionId/assignments
 * @desc    Récupérer toutes les assignations pour une session
 * @access  Privé
 */
router.get('/:sessionId/assignments', authMiddleware_1.authenticate, (req, res, next) => {
    monthlyContributionController_1.default.getAssignmentsBySessionId(req, res)
        .catch(next);
});
/**
 * @route   POST /api/monthly-contributions/assignments
 * @desc    Créer une nouvelle assignation de cotisation mensuelle
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post('/assignments', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    monthlyContributionController_1.default.createAssignment(req, res)
        .catch(next);
});
/**
 * @route   PUT /api/monthly-contributions/assignments/:id
 * @desc    Mettre à jour une assignation de cotisation mensuelle
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put('/assignments/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    monthlyContributionController_1.default.updateAssignment(req, res)
        .catch(next);
});
/**
 * @route   DELETE /api/monthly-contributions/assignments/:id
 * @desc    Supprimer une assignation de cotisation mensuelle
 * @access  Privé (Admin uniquement)
 */
router.delete('/assignments/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin']), (req, res, next) => {
    monthlyContributionController_1.default.deleteAssignment(req, res)
        .catch(next);
});
exports.default = router;
