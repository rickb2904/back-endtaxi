// ──────────────────────────────────────────────────────────────────────────────
// routes/paiement.route.js (Confirmé, pas de changement)
// ──────────────────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiement.controller');
const auth = require('../middlewares/auth.middleware'); // Assurez-vous d'importer le middleware d'authentification

// Création du PaymentIntent (pré-autorisation)
router.post('/create-intent', auth, paiementController.createIntent);

// Capture du paiement à la fin de la course (nécessitera un middleware de rôle si seuls les admins/chauffeurs peuvent capturer)
router.post('/capture', auth, paiementController.capturePayment);

// Remboursement (nécessitera un middleware de rôle si seuls les admins peuvent rembourser)
router.post('/refund', auth, paiementController.refundPayment);

// Route pour lier un Payment Intent à une réservation après confirmation de paiement
router.put('/link-intent-to-reservation', auth, paiementController.linkIntentToReservation);

module.exports = router;
