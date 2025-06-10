const { pool } = require('../config/db');

exports.findByUserId = async (userId) =>
    (await pool.query(
        `SELECT * FROM chauffeur WHERE user_id = $1`,
        [userId]
    )).rows[0];

exports.updateDisponibilite = async (userId, dispo) => {
    const result = await pool.query(
        `UPDATE chauffeur SET disponibilite = $1 WHERE user_id = $2 RETURNING disponibilite`,
        [dispo, userId]
    );
    console.log('🔄 Résultat updateDisponibilite:', result.rows[0]);
    return result.rows[0];
};

exports.pendingReservations = async (chauffeurId) =>
    (await pool.query(
        `
            SELECT  r.*,
                    u.nom  AS client_nom,
                    u.prenom AS client_prenom
            FROM    reservation r
                        JOIN    "user" u ON u.id = r.id_utilisateur
            WHERE   r.id_taxi = $1
              AND   r.statut  = 'demandée'
            ORDER BY r.date_creation DESC
        `,
        [chauffeurId]
    )).rows;

exports.acceptedReservations = async (chauffeurId) =>
    (await pool.query(
        `
            SELECT  r.*,
                    u.nom  AS client_nom,
                    u.prenom AS client_prenom
            FROM    reservation r
                        JOIN    "user" u ON u.id = r.id_utilisateur
            WHERE   r.id_taxi = $1
              AND   r.statut  = 'acceptée'
            ORDER BY r.date_creation DESC
        `,
        [chauffeurId]
    )).rows;
