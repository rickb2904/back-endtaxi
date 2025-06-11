const { pool } = require('../config/db');

/**
 * Renvoie tous les chauffeurs disponibles (disponibilite = TRUE)
 * avec leur photo de profil et les détails de leur véhicule.
 */
exports.listDisponibles = async () =>
    (await pool.query(`
        SELECT
            c.id AS id,
            c.user_id,
            u.nom,
            u.prenom,
            u.latitude,
            u.longitude,
            u.photo_de_profil,  -- <<< Ajout de la photo de profil
            v.marque AS vehicule_marque,   -- <<< Ajout des détails du véhicule
            v.modele AS vehicule_modele,
            v.immatriculation AS vehicule_immatriculation,
            v.couleur AS vehicule_couleur
        FROM Chauffeur c
                 JOIN "user" u ON u.id = c.user_id
                 JOIN Vehicule v ON v.id = c.vehicule_id -- <<< Ajout de la jointure avec la table Vehicule
        WHERE c.disponibilite = TRUE;
    `)).rows;