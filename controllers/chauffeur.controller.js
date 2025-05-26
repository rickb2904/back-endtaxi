// ──────────────────────────────────────────────────────────────────────────────
// controllers/chauffeur.controller.js
// ──────────────────────────────────────────────────────────────────────────────
const chauffeurSvc = require('../services/chauffeur.service');

/**
 * GET /api/chauffeur/status
 * Renvoie la disponibilité actuelle du chauffeur connecté.
 */
exports.status = async (req, res, next) => {
    try {
        const ch = await chauffeurSvc.getByUserId(req.user.id);
        if (!ch) return res.status(404).json({ message: 'Chauffeur non trouvé' });
        res.json({ disponibilite: ch.disponibilite });
    } catch (e) { next(e); }
};

/**
 * PUT /api/chauffeur/disponibilite
 * Modifie la disponibilité du chauffeur connecté.
 */
exports.setDisponibilite = async (req, res, next) => {
    try {
        const out = await chauffeurSvc.setDisponibilite(req.user.id, req.body.disponibilite);
        res.json({ message: 'Disponibilité mise à jour', disponibilite: out.disponibilite });
    } catch (e) { next(e); }
};

/**
 * GET /api/chauffeur/me
 * Renvoie l'ID chauffeur (table Chauffeur) lié au user courant.
 */
exports.me = async (req, res, next) => {
    try {
        const ch = await chauffeurSvc.getByUserId(req.user.id);
        if (!ch) return res.status(404).json({ message: 'Aucun chauffeur' });
        res.json({ chauffeurId: ch.id });
    } catch (e) { next(e); }
};

/**
 * GET /api/chauffeur/reservations/pending
 * Liste les réservations « demandée ».
 * - si ?chauffeurId=… fourni → celui-ci
 * - sinon → chauffeur connecté
 */
exports.pending = async (req, res, next) => {
    try {
        const cid = req.query.chauffeurId
            ? parseInt(req.query.chauffeurId, 10)
            : req.user.id;                         // fallback sur le user courant
        res.json(await chauffeurSvc.pendingReservations(cid));
    } catch (e) { next(e); }
};

/**
 * GET /api/chauffeur/reservations/accepted
 * Liste les réservations « acceptée ».
 * Même logique de fallback que ci-dessus.
 */
exports.accepted = async (req, res, next) => {
    try {
        const cid = req.query.chauffeurId
            ? parseInt(req.query.chauffeurId, 10)
            : req.user.id;
        res.json(await chauffeurSvc.acceptedReservations(cid));
    } catch (e) { next(e); }
};
