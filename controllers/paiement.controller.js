// ──────────────────────────────────────────────────────────────────────────────
// controllers/paiement.controller.js
// ──────────────────────────────────────────────────────────────────────────────
const paiementSvc = require('../services/paiement.service');
exports.create = async (req, res, next) => {
    try { res.status(201).json(await paiementSvc.create(req.body)); }
    catch (e) { next(e); }
};
exports.updateStatus = async (req, res, next) => {
    try { res.json(await paiementSvc.changeStatus(req.params.id, req.body.statut)); }
    catch (e) { next(e); }
};