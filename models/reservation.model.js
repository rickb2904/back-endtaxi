const { pool: poolR } = require('../config/db');

/* ---------------------  helpers --------------------------- */
// baseCols inclut maintenant 'handicap', 'stripe_payment_intent_id', et les nouvelles colonnes de confirmation
const baseCols = `
  r.id, r.id_utilisateur, r.id_taxi,
  r.depart, r.arrivee, r.distance, r.prix,
  r.statut, r.date_prise_en_charge,
  r.nb_personnes, r.animaux, r.handicap,
  r.date_creation, r.stripe_payment_intent_id,
  r.client_confirmation, r.chauffeur_confirmation -- NOUVELLES COLONNES
`;

/* ---------------------  insertion ------------------------- */
exports.create = async (dto) => {
    const {
        id_utilisateur, id_taxi, depart, arrivee,
        distance, prix, date_prise_en_charge,
        nb_personnes, animaux, handicap
    } = dto;

    const { rows } = await poolR.query(`
    INSERT INTO Reservation (
      id_utilisateur, id_taxi, depart, arrivee,
      distance, prix, statut, date_prise_en_charge,
      nb_personnes, animaux, handicap, date_creation,
      client_confirmation, chauffeur_confirmation -- NOUVEAUX CHAMPS PAR DÉFAUT
    )
    VALUES ($1,$2,$3,$4,$5,$6,'demandée',$7,$8,$9,$10, NOW(), FALSE, FALSE) -- Statut initial, confirmations à FALSE
    RETURNING *;`,
        [ id_utilisateur, id_taxi, depart, arrivee,
            distance, prix, date_prise_en_charge,
            nb_personnes, animaux, handicap ]);
    return rows[0];
};

/* ----------------------- CRUD basique ---------------------- */
exports.findById     = async (id) => (await poolR.query(
    `SELECT * FROM Reservation WHERE id = $1`, [id])).rows[0];

exports.delete       = async (id) =>
    poolR.query(`DELETE FROM Reservation WHERE id = $1`, [id]);

// Mise à jour générique du statut (utilisée pour 'acceptée', 'refusée', 'annulée')
exports.updateStatus = async (id, s) => (await poolR.query(
    `UPDATE Reservation SET statut = $1, date_modification = NOW() WHERE id = $2 RETURNING *;`, [s, id])).rows[0];

// Nouvelle fonction pour mettre à jour la confirmation côté client
exports.setClientConfirmation = async (id, confirmed) => (await poolR.query(
    `UPDATE Reservation SET client_confirmation = $1, date_modification = NOW() WHERE id = $2 RETURNING *;`,
    [confirmed, id]
)).rows[0];

// Nouvelle fonction pour mettre à jour la confirmation côté chauffeur
exports.setChauffeurConfirmation = async (id, confirmed) => (await poolR.query(
    `UPDATE Reservation SET chauffeur_confirmation = $1, date_modification = NOW() WHERE id = $2 RETURNING *;`,
    [confirmed, id]
)).rows[0];

// Fonction pour récupérer l'ID du Payment Intent d'une réservation spécifique
exports.getPaymentIntentId = async (reservationId) => {
    const { rows } = await poolR.query(
        `SELECT stripe_payment_intent_id FROM Reservation WHERE id = $1;`,
        [reservationId]
    );
    return rows[0] ? rows[0].stripe_payment_intent_id : null;
};

// Fonction pour définir le message de litige d'une réservation
exports.setLitigeMessage = async (id, message) =>
    poolR.query(`UPDATE Reservation SET litige_message = $1, date_modification = NOW() WHERE id = $2`, [message, id]);


/* ---------------------- Sélections “full” avec filtrage statut ------------------ */
exports.forClientFull = async (userId, statut = null) => {
    let query = `
        SELECT ${baseCols},
               json_build_object(
                       'prenom', chUser.prenom,
                       'nom', chUser.nom,
                       'email', chUser.email,
                       'telephone', chUser.telephone,
                       'photo_de_profil', chUser.photo_de_profil
               ) AS chauffeur_info
        FROM   Reservation r
                   JOIN   Chauffeur    ch     ON r.id_taxi   = ch.id
                   JOIN   "user"       chUser ON ch.user_id  = chUser.id
        WHERE  r.id_utilisateur = $1`;
    const params = [userId];

    if (statut) {
        query += ` AND r.statut = $2`;
        params.push(statut);
    }
    query += ` ORDER BY r.date_prise_en_charge DESC;`;

    const { rows } = await poolR.query(query, params);
    return rows;
};


exports.forChauffeurFull = async (userUserId, statut = null) => {
    let query = `
        SELECT ${baseCols},
               json_build_object(
                       'prenom', cli.prenom,
                       'nom', cli.nom,
                       'email', cli.email,
                       'telephone', cli.telephone,
                       'photo_de_profil', cli.photo_de_profil
               ) AS client_info
        FROM   Chauffeur    ch
                   JOIN   Reservation  r   ON ch.id = r.id_taxi
                   JOIN   "user"       cli ON cli.id = r.id_utilisateur
        WHERE  ch.user_id = $1`;
    const params = [userUserId];

    if (statut) {
        query += ` AND r.statut = $2`;
        params.push(statut);
    }
    query += ` ORDER BY r.date_prise_en_charge DESC;`;

    const { rows } = await poolR.query(query, params);
    return rows;
};

exports.allFull = async (statut = null) => {
    let query = `
        SELECT ${baseCols},
               cli.nom       AS client_nom,
               cli.prenom    AS client_prenom,
               chUser.nom    AS chauffeur_nom,
               chUser.prenom AS chauffeur_prenom
        FROM   Reservation  r
                   JOIN   "user"       cli    ON cli.id = r.id_utilisateur
                   JOIN   Chauffeur    ch     ON ch.id  = r.id_taxi
                   JOIN   "user"       chUser ON ch.user_id = chUser.id`;
    const params = [];

    if (statut) {
        query += ` WHERE r.statut = $1`;
        params.push(statut);
    }
    query += ` ORDER BY r.date_prise_en_charge DESC;`;

    const { rows } = await poolR.query(query, params);
    return rows;
};