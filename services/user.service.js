// ──────────────────────────────────────────────────────────────────────────────
// services/user.service.js
// ──────────────────────────────────────────────────────────────────────────────
const UserModel = require('../models/user.model');
exports.updateProfile = async (id, data) => UserModel.update(id, data);
exports.getById       = async (id) => UserModel.findById(id);

// ──────────────────────────────────────────────────────────────────────────────
// services/price.service.js
// ──────────────────────────────────────────────────────────────────────────────
const { haversine, polylineKm } = require('../utils/distance');
const DAY_RATE = 1.04;
const NIGHT_RATE = 3.00;
const isNight = (d) => d.getHours() >= 22 || d.getHours() < 6;

exports.computePrice = ({ start, end, route = [], timestamp }) => {
    const km = route.length >= 2 ? polylineKm(route) : haversine(start, end);
    const refDate = timestamp ? new Date(timestamp) : new Date();
    const night = isNight(refDate);
    const rate = night ? NIGHT_RATE : DAY_RATE;
    return { km: +km.toFixed(2), rate: +rate.toFixed(2), rateType: night ? 'night' : 'day', night, price: +(km * rate).toFixed(2) };
};