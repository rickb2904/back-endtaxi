// models/taxi.model.js
const { pool } = require('../config/db');

/**
 * Renvoie tous les chauffeurs disponibles (disponibilite = TRUE).
 * On ne filtre PAS sur le rôle : la jointure Chauffeur suffit.
 */
exports.listDisponibles = async () =>
    (await pool.query(`
    SELECT u.id,
           u.nom,
           u.prenom,
           u.latitude,
           u.longitude
    FROM   "User"     u
    JOIN   Chauffeur  c ON u.id = c.user_id
    WHERE  c.disponibilite = TRUE;
  `)).rows;
