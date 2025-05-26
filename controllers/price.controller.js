// ──────────────────────────────────────────────────────────────────────────────
// controllers/price.controller.js
// ──────────────────────────────────────────────────────────────────────────────
const priceSvc = require('../services/price.service');

/**
 * POST /api/calculate-price
 * → { km, distance (alias), rate, rateType, price, night }
 */
exports.postCalculatePrice = (req, res) => {
    try {
        const out = priceSvc.computePrice(req.body);   // { km, rate, … }
        // ▸ compatibilité descendante : on ajoute "distance"
        res.json({ ...out, distance: out.km });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};
