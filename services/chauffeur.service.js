// ──────────────────────────────────────────────────────────────────────────────
// services/chauffeur.service.js
// ──────────────────────────────────────────────────────────────────────────────
const Chauffeur = require('../models/chauffeur.model');
exports.getByUserId         = async (uid) => Chauffeur.findByUserId(uid);
exports.setDisponibilite    = async (uid, dispo) => Chauffeur.updateDisponibilite(uid, dispo);
exports.pendingReservations = async (cid) => Chauffeur.pendingReservations(cid);
exports.acceptedReservations= async (cid) => Chauffeur.acceptedReservations(cid);