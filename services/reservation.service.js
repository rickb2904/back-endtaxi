// ─────────────────────────────────────────────────────────────
// services/reservation.service.js   (version corrigée)
// ─────────────────────────────────────────────────────────────
const Reservation  = require('../models/reservation.model');
const Notification = require('../models/notification.model');

/* ---------------------- création -------------------------- */
exports.create = async (dto) => {
    const res = await Reservation.create(dto);
    await Notification.create({
        reservation_id: res.id,
        titre : 'Nouvelle réservation',
        message: 'Une nouvelle réservation a été créée.'
    });
    return res;
};

/* --------------------- annulation client ------------------ */
exports.cancel = async (id, userId) => {
    const r = await Reservation.findById(id);
    if (!r || r.id_utilisateur !== userId)
        throw new Error('Réservation non trouvée ou interdite');

    await Reservation.delete(id);
    await Notification.create({
        reservation_id: id,
        titre : 'Réservation annulée',
        message: 'Le client a annulé sa réservation.'
    });
};

/* ----------------------- listing -------------------------- */
exports.listForUser = async (userId, role) => {
    if (role === 'client')    return Reservation.forClientFull(userId);
    if (role === 'chauffeur') return Reservation.forChauffeurFull(userId);
    return Reservation.allFull();                 // admin
};

/* ------------------- chauffeur : statut ------------------- */
exports.updateStatut = async (id, chauffeurUserId, statut) => {
    // On vérifie que ce chauffeur (user_id) possède bien la réservation
    const list = await Reservation.forChauffeurFull(chauffeurUserId);
    if (!list.find(r => r.id === +id))
        throw new Error('Réservation introuvable');

    const updated = await Reservation.updateStatus(id, statut);
    await Notification.create({
        reservation_id: id,
        titre   : `Réservation ${statut}`,
        message : `Le chauffeur a ${statut} la réservation.`
    });
    return updated;
};
