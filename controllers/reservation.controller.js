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

exports.updateStatut = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { statut } = req.body;
        const updated = await reservationSvc.updateStatut(id, statut);
        res.json(updated);
    } catch (e) {
        res.status(404).json({ message: e.message });
    }
};



exports.validateByClient = async (req, res, next) => {
    try {
        const { statut, message } = req.body;

        if (statut !== 'terminée' && statut !== 'litige') {
            return res.status(400).json({ error: 'Statut invalide' });
        }

        const result = await reservationSvc.validateByClient(req.params.id, req.user.id, statut, message);
        res.json({ message: `Réservation marquée comme ${statut}`, reservation: result });
    } catch (e) {
        next(e);
    }
};

exports.autoComplete = async (req, res, next) => {
    try {
        const count = await reservationSvc.autoCompleteOldReservations();
        res.json({ message: `${count} réservation(s) terminée(s) automatiquement.` });
    } catch (e) {
        next(e);
    }
};

