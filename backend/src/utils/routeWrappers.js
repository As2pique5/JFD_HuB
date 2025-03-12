"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapAuthorize = exports.wrapController = exports.wrapMiddleware = void 0;
const authorize_1 = require("../middleware/authorize");
/**
 * Wrapper pour les middlewares
 */
const wrapMiddleware = (middleware) => {
    return (req, res, next) => {
        Promise.resolve(middleware(req, res, next)).catch(next);
    };
};
exports.wrapMiddleware = wrapMiddleware;
/**
 * Wrapper pour les méthodes du contrôleur
 */
const wrapController = (controller) => {
    return (req, res, next) => {
        Promise.resolve(controller(req, res)).catch(next);
    };
};
exports.wrapController = wrapController;
/**
 * Wrapper spécifique pour le middleware d'autorisation
 */
const wrapAuthorize = (roles) => {
    return (req, res, next) => {
        Promise.resolve((0, authorize_1.authorize)(roles)(req, res, next)).catch(next);
    };
};
exports.wrapAuthorize = wrapAuthorize;
