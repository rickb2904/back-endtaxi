// ──────────────────────────────────────────────────────────────────────────────
// models/user.model.js
// ──────────────────────────────────────────────────────────────────────────────
const { pool } = require('../config/db');

exports.create = async ({ nom, prenom, email, password, tel, adresse, photo, role = 'client' }) => {
    const { rows } = await pool.query(`
    INSERT INTO "User" (nom, prenom, email, mot_de_passe, role, telephone, adresse, photo_de_profil)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING id, nom, prenom, email, role, photo_de_profil;`,
        [nom, prenom, email, password, role, tel, adresse, photo]);
    return rows[0];
};

exports.findByEmail = async (email) => (await pool.query(`SELECT * FROM "User" WHERE email=$1`, [email])).rows[0];
exports.findById    = async (id)    => (await pool.query(`SELECT * FROM "User" WHERE id=$1`, [id])).rows[0];
exports.updatePassword = async (id, hashedPassword) => {
    const query = `
    UPDATE "User"
    SET mot_de_passe = $1
    WHERE id = $2
  `;
    await pool.query(query, [hashedPassword, id]);
};

exports.update = async (id, data) => {
    const { nom, prenom, email, telephone, adresse } = data;
    const { rows } = await pool.query(`
    UPDATE "User" SET nom=$1, prenom=$2, email=$3, telephone=$4, adresse=$5
    WHERE id=$6 RETURNING id, nom, prenom, email, telephone, adresse, role, photo_de_profil;`,
        [nom, prenom, email, telephone, adresse, id]);
    return rows[0];
};
