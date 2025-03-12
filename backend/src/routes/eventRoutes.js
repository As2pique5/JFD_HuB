"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const eventController_1 = __importDefault(require("../controllers/eventController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
/**
 * @route   GET /api/events
 * @desc    Récupérer tous les événements
 * @access  Privé
 */
router.get('/', authMiddleware_1.authenticate, (req, res, next) => {
    eventController_1.default.getAllEvents(req, res)
        .catch(next);
});
/**
 * @route   GET /api/events/:id
 * @desc    Récupérer un événement par son ID
 * @access  Privé
 */
router.get('/:id', authMiddleware_1.authenticate, (req, res, next) => {
    eventController_1.default.getEventById(req, res)
        .catch(next);
});
/**
 * @route   POST /api/events
 * @desc    Créer un nouvel événement
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post('/', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    eventController_1.default.createEvent(req, res)
        .catch(next);
});
/**
 * @route   PUT /api/events/:id
 * @desc    Mettre à jour un événement
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put('/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    eventController_1.default.updateEvent(req, res)
        .catch(next);
});
/**
 * @route   DELETE /api/events/:id
 * @desc    Supprimer un événement
 * @access  Privé (Admin uniquement)
 */
router.delete('/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin']), (req, res, next) => {
    eventController_1.default.deleteEvent(req, res)
        .catch(next);
});
/**
 * @route   GET /api/events/:eventId/participants
 * @desc    Récupérer tous les participants d'un événement
 * @access  Privé
 */
router.get('/:eventId/participants', authMiddleware_1.authenticate, (req, res, next) => {
    eventController_1.default.getEventParticipants(req, res)
        .catch(next);
});
/**
 * @route   POST /api/events/participants
 * @desc    Ajouter un participant à un événement
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post('/participants', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    eventController_1.default.addParticipant(req, res)
        .catch(next);
});
/**
 * @route   PUT /api/events/participants/:id
 * @desc    Mettre à jour le statut d'un participant
 * @access  Privé (Admin, Intermédiaire ou le participant lui-même)
 */
router.put('/participants/:id', authMiddleware_1.authenticate, (req, res, next) => {
    eventController_1.default.updateParticipantStatus(req, res)
        .catch(next);
});
/**
 * @route   DELETE /api/events/participants/:id
 * @desc    Supprimer un participant d'un événement
 * @access  Privé (Admin uniquement)
 */
router.delete('/participants/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin']), (req, res, next) => {
    eventController_1.default.removeParticipant(req, res)
        .catch(next);
});
/**
 * @route   GET /api/events/:eventId/contributions
 * @desc    Récupérer toutes les contributions d'un événement
 * @access  Privé
 */
router.get('/:eventId/contributions', authMiddleware_1.authenticate, (req, res, next) => {
    eventController_1.default.getEventContributions(req, res)
        .catch(next);
});
/**
 * @route   POST /api/events/contributions
 * @desc    Ajouter une contribution à un événement
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post('/contributions', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    eventController_1.default.addContribution(req, res)
        .catch(next);
});
/**
 * @route   PUT /api/events/contributions/:id
 * @desc    Mettre à jour une contribution
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put('/contributions/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    eventController_1.default.updateContribution(req, res)
        .catch(next);
});
/**
 * @route   DELETE /api/events/contributions/:id
 * @desc    Supprimer une contribution
 * @access  Privé (Admin uniquement)
 */
router.delete('/contributions/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin']), (req, res, next) => {
    eventController_1.default.deleteContribution(req, res)
        .catch(next);
});
/**
 * @route   GET /api/events/:eventId/assignments
 * @desc    Récupérer toutes les assignations de contributions d'un événement
 * @access  Privé
 */
router.get('/:eventId/assignments', authMiddleware_1.authenticate, (req, res, next) => {
    eventController_1.default.getContributionAssignments(req, res)
        .catch(next);
});
/**
 * @route   POST /api/events/assignments
 * @desc    Créer une assignation de contribution
 * @access  Privé (Admin ou Intermédiaire)
 */
router.post('/assignments', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    eventController_1.default.createAssignment(req, res)
        .catch(next);
});
/**
 * @route   PUT /api/events/assignments/:id
 * @desc    Mettre à jour une assignation de contribution
 * @access  Privé (Admin ou Intermédiaire)
 */
router.put('/assignments/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin', 'intermediate']), (req, res, next) => {
    eventController_1.default.updateAssignment(req, res)
        .catch(next);
});
/**
 * @route   DELETE /api/events/assignments/:id
 * @desc    Supprimer une assignation de contribution
 * @access  Privé (Admin uniquement)
 */
router.delete('/assignments/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(['super_admin']), (req, res, next) => {
    eventController_1.default.deleteAssignment(req, res)
        .catch(next);
});
exports.default = router;
