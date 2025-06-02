// ─────────────────────────────────────────────────────────────
// models/reservation.model.js   (version corrigée)
// ─────────────────────────────────────────────────────────────
const { pool: poolR } = require('../config/db');

/* ---------------------  helpers --------------------------- */
const baseCols = `
  r.id, r.id_utilisateur, r.id_taxi,
  r.depart, r.arrivee, r.distance, r.prix,
  r.statut, r.date_prise_en_charge,
  r.nb_personnes, r.animaux,
  r.date_creation
`;

/* ---------------------  insertion ------------------------- */
exports.create = async (dto) => {
    const {
        id_utilisateur, id_taxi, depart, arrivee,
        distance, prix, date_prise_en_charge,
        nb_personnes, animaux
    } = dto;

    const { rows } = await poolR.query(`
    INSERT INTO Reservation (
      id_utilisateur, id_taxi, depart, arrivee,
      distance, prix, statut, date_prise_en_charge,
      nb_personnes, animaux
    )
    VALUES ($1,$2,$3,$4,$5,$6,'demandée',$7,$8,$9)
    RETURNING *;`,
        [ id_utilisateur, id_taxi, depart, arrivee,
            distance, prix, date_prise_en_charge,
            nb_personnes, animaux ]);
    return rows[0];
};

/* ----------------------- CRUD basique ---------------------- */
exports.findById     = async (id) => (await poolR.query(
    `SELECT * FROM Reservation WHERE id = $1`, [id])).rows[0];

exports.delete       = async (id) =>
    poolR.query(`DELETE FROM Reservation WHERE id = $1`, [id]);

exports.updateStatus = async (id, s) => (await poolR.query(
    `UPDATE Reservation SET statut = $1 WHERE id = $2 RETURNING *;`, [s, id])).rows[0];

/* ---------------------- Sélections “full” ------------------ */
exports.forClientFull = async (userId) => {
    const { rows } = await poolR.query(`
    SELECT ${baseCols},
           json_build_object(
             'prenom', chUser.prenom,
             'nom', chUser.nom,
             'email', chUser.email,
             'telephone', chUser.telephone,
             'photo_de_profil', chUser.photo_de_profil
           ) AS utilisateur
    FROM   Reservation r
    JOIN   Chauffeur    ch     ON r.id_taxi   = ch.id
    JOIN   "user"       chUser ON ch.user_id  = chUser.id
    WHERE  r.id_utilisateur = $1
    ORDER  BY r.date_prise_en_charge DESC;
  `, [userId]);

    return rows;
};


exports.forChauffeurFull = async (userUserId) => {
    const { rows } = await poolR.query(`
    SELECT ${baseCols},
           json_build_object(
             'prenom', cli.prenom,
             'nom', cli.nom,
             'email', cli.email,
             'telephone', cli.telephone,
             'photo_de_profil', cli.photo_de_profil
           ) AS utilisateur
    FROM   Chauffeur    ch
    JOIN   Reservation  r   ON ch.id = r.id_taxi
    JOIN   "user"       cli ON cli.id = r.id_utilisateur
    WHERE  ch.user_id = $1
    ORDER  BY r.date_prise_en_charge DESC;
  `, [userUserId]);

    return rows;
};

exports.allFull = async () => (await poolR.query(`
  SELECT ${baseCols},
         cli.nom       AS client_nom,
         cli.prenom    AS client_prenom,
         chUser.nom    AS chauffeur_nom,
         chUser.prenom AS chauffeur_prenom
  FROM   Reservation  r
  JOIN   "user"       cli    ON cli.id = r.id_utilisateur
  JOIN   Chauffeur    ch     ON ch.id  = r.id_taxi
  JOIN   "user"       chUser ON ch.user_id = chUser.id
  ORDER  BY r.date_prise_en_charge DESC;`)).rows;

exports.setLitigeMessage = async (id, message) =>
    poolR.query(`UPDATE Reservation SET litige_message = $1 WHERE id = $2`, [message, id]);
