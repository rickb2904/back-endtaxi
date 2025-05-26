// ──────────────────────────────────────────────────────────────────────────────
// models/notification.model.js
// ──────────────────────────────────────────────────────────────────────────────
const { pool: poolN } = require('../config/db');

exports.create = async ({ reservation_id, titre, message }) => (await poolN.query(`
  INSERT INTO Notifications (reservation_id, titre, message)
  VALUES ($1,$2,$3) RETURNING *;`, [reservation_id, titre, message])).rows[0];