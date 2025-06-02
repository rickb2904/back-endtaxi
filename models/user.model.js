const { pool } = require('../config/db');

exports.create = async ({ nom, prenom, email, password, tel, adresse, photo, role = 'client' }) => {
    const { rows } = await pool.query(`
        INSERT INTO "user" (nom, prenom, email, mot_de_passe, role, telephone, adresse, photo_de_profil)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, nom, prenom, email, role, photo_de_profil;
    `, [nom, prenom, email, password, role, tel, adresse, photo]);

    const user = rows[0];

    if (role === 'client') {
        await pool.query('INSERT INTO client (user_id) VALUES ($1)', [user.id]);
    } else if (role === 'chauffeur') {
        await pool.query('INSERT INTO chauffeur (user_id, numero_de_licence) VALUES ($1, $2)', [user.id, 'A-DEFINIR']);
    }

    return user;
};

exports.findByEmail = async (email) =>
    (await pool.query(`SELECT * FROM "user" WHERE email = $1`, [email])).rows[0];

exports.findById = async (id) =>
    (await pool.query(`SELECT * FROM "user" WHERE id = $1`, [id])).rows[0];

exports.updatePassword = async (id, hashedPassword) => {
    await pool.query(`UPDATE "user" SET mot_de_passe = $1 WHERE id = $2`, [hashedPassword, id]);
};

exports.update = async (id, data) => {
    const { nom, prenom, email, telephone, adresse } = data;
    const { rows } = await pool.query(`
        UPDATE "user"
        SET nom = $1, prenom = $2, email = $3, telephone = $4, adresse = $5
        WHERE id = $6
            RETURNING id, nom, prenom, email, telephone, adresse, role, photo_de_profil;
    `, [nom, prenom, email, telephone, adresse, id]);
    return rows[0];
};
