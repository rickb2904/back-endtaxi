// ──────────────────────────────────────────────────────────────────────────────
// controllers/notification.controller.js
// ──────────────────────────────────────────────────────────────────────────────
const notifSvc = require('../services/notification.service');
exports.create = async (req, res, next) => {
    try { res.status(201).json(await notifSvc.send(req.body)); }
    catch (e) { next(e); }
};