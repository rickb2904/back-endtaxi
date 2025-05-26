// ──────────────────────────────────────────────────────────────────────────────
// models/paiement.model.js
// ──────────────────────────────────────────────────────────────────────────────
const { pool: poolP } = require('../config/db');

exports.create = async ({ reservation_id, montant, methode }) => (await poolP.query(`
  INSERT INTO Paiement (reservation_id, montant, statut, methode)
  VALUES ($1,$2,'en attente',$3) RETURNING *;`, [reservation_id, montant, methode])).rows[0];

exports.updateStatus = async (id, statut) => (await poolP.query(`
  UPDATE Paiement SET statut=$1 WHERE id=$2 RETURNING *;`, [statut, id])).rows[0];