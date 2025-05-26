// ──────────────────────────────────────────────────────────────────────────────
// services/paiement.service.js
// ──────────────────────────────────────────────────────────────────────────────
const Paiement = require('../models/paiement.model');
exports.create        = async (dto) => Paiement.create(dto);
exports.changeStatus  = async (id, statut) => Paiement.updateStatus(id, statut);