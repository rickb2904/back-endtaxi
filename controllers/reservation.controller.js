// ──────────────────────────────────────────────────────────────────────────────
// controllers/reservation.controller.js
// ──────────────────────────────────────────────────────────────────────────────
const reservationSvc = require('../services/reservation.service');

exports.create = async (req, res, next) => {
    try {
        const reservation = await reservationSvc.create(req.body);
        res.status(201).json({ message: 'Réservation créée', reservation });
    } catch (e) { next(e); }
};

exports.cancel = async (req, res, next) => {
    try {
        await reservationSvc.cancel(req.params.id, req.user.id);
        res.json({ message: 'Réservation annulée' });
    } catch (e) { next(e); }
};

exports.listForUser = async (req, res, next) => {
    try {
        const data = await reservationSvc.listForUser(parseInt(req.params.id, 10), req.user.role);
        res.json(data);
    } catch (e) { next(e); }
};

exports.updateStatut = async (req, res, next) => {
    try {
        const updated = await reservationSvc.updateStatut(req.params.id, req.user.id, req.body.statut);
        res.json({ message: `Réservation ${req.body.statut}`, reservation: updated });
    } catch (e) { next(e); }
};