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
const { pool: poolR } = require('../config/db');

exports.updateStatut = async (id, newStatut) => {
    console.log("🟡 ID reçu pour updateStatut :", id);

    // Vérifie si la réservation existe
    const { rows } = await poolR.query(
        `SELECT * FROM Reservation WHERE id = $1`,
        [id]
    );

    if (rows.length === 0) {
        console.error("🔴 Aucune réservation trouvée avec l'ID :", id);
        throw new Error("Réservation introuvable");
    }

    // Mise à jour du statut
    const updated = await poolR.query(
        `UPDATE Reservation SET statut = $1 WHERE id = $2 RETURNING *`,
        [newStatut, id]
    );

    return updated.rows[0];
};



exports.validateByClient = async (id, clientId, statut, message = null) => {
    const res = await Reservation.findById(id);
    if (!res || res.id_utilisateur !== clientId)
        throw new Error('Réservation non trouvée ou interdite');

    const updated = await Reservation.updateStatus(id, statut);

    if (statut === 'litige' && message) {
        await Reservation.setLitigeMessage(id, message);
    }

    await Notification.create({
        reservation_id: id,
        titre: `Réservation ${statut}`,
        message: statut === 'litige'
            ? `Le client a signalé un problème sur cette course.`
            : `Le client a confirmé la fin de la course.`
    });

    return updated;
};

exports.autoCompleteOldReservations = async () => {
    const { rows } = await poolR.query(`
        UPDATE Reservation
        SET statut = 'terminée'
        WHERE statut = 'acceptée'
          AND date_prise_en_charge < NOW() - INTERVAL '48 hours'
        RETURNING id;
    `);

    for (const r of rows) {
        await Notification.create({
            reservation_id: r.id,
            titre: 'Réservation terminée automatiquement',
            message: 'La réservation a été marquée comme terminée après 48h sans validation manuelle.'
        });
    }

    return rows.length;
};

exports.cancel = async (id, userId) => {
    const r = await Reservation.findById(id);

    if (!r || (r.id_utilisateur !== userId && r.id_taxi !== userId))
        throw new Error('Réservation non trouvée ou interdite');

    const now = new Date();
    const datePrise = new Date(r.date_prise_en_charge);
    const diffMinutes = (datePrise - now) / 60000;

    if (diffMinutes < 5) {
        throw new Error('Impossible d’annuler moins de 5 minutes avant la prise en charge.');
    }

    await Reservation.delete(id);
    await Notification.create({
        reservation_id: id,
        titre : 'Réservation annulée',
        message: 'La réservation a été annulée par un utilisateur.'
    });
};
