// ──────────────────────────────────────────────────────────────────────────────
// models/vehicule.model.js
// ──────────────────────────────────────────────────────────────────────────────
const { pool: poolV } = require('../config/db');
exports.findById = async (id) => (await poolV.query(`SELECT * FROM Vehicule WHERE id=$1`, [id])).rows[0];