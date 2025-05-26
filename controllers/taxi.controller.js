// controllers/taxi.controller.js
const taxiSvc = require('../services/taxi.service');

exports.list = async (_req, res, next) => {
    try   { res.json(await taxiSvc.getDisponibles()); }
    catch (e) { next(e); }
};
