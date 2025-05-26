// ──────────────────────────────────────────────────────────────────────────────
// services/notification.service.js
// ──────────────────────────────────────────────────────────────────────────────
const Notification = require('../models/notification.model');
exports.send = async (dto) => Notification.create(dto);