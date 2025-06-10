const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiement.controller');

// Création du PaymentIntent (pré-autorisation)
router.post('/create-intent', paiementController.createIntent);

// Capture du paiement à la fin de la course
router.post('/capture', paiementController.capturePayment);

// Remboursement en cas d’annulation/refus
router.post('/refund', paiementController.refundPayment);

module.exports = router;
