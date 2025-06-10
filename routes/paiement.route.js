const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiement.controller');
const auth = require('../middlewares/auth.middleware'); // Assurez-vous d'importer le middleware d'authentification

// Création du PaymentIntent (pré-autorisation)
router.post('/create-intent', auth, paiementController.createIntent);

// Capture du paiement à la fin de la course
router.post('/capture', auth, paiementController.capturePayment); // Assurez-vous que le rôle est approprié pour capturer

// Remboursement en cas d’annulation/refus
router.post('/refund', auth, paiementController.refundPayment); // Assurez-vous que le rôle est approprié pour rembourser

// --- NOUVELLE ROUTE AJOUTÉE ---
// Route pour lier un Payment Intent à une réservation après confirmation de paiement
router.put('/link-intent-to-reservation', auth, paiementController.linkIntentToReservation);

module.exports = router;
