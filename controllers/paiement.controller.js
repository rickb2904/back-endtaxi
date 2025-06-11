// ──────────────────────────────────────────────────────────────────────────────
// controllers/paiement.controller.js (Complet et Corrigé)
// ──────────────────────────────────────────────────────────────────────────────
const paiementService = require('../services/paiement.service');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // S'assurer que la clé secrète est bien chargée

exports.createIntent = async (req, res) => {
    try {
        // reservationId est optionnel ici car le PI est créé avant la réservation en BDD
        const { amount, reservationId = null } = req.body;

        // Le service gérera la création du PaymentIntent et l'enregistrement initial en BDD
        const clientSecret = await paiementService.createPaymentIntent(reservationId, amount);

        res.json({ clientSecret: clientSecret });
    } catch (err) {
        console.error('❌ Erreur dans le contrôleur (createIntent):', err);
        res.status(500).json({ error: 'Erreur lors de la création de l\'intent de paiement.' });
    }
};


exports.capturePayment = async (req, res) => {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
        return res.status(400).json({ error: 'Payment Intent ID manquant.' });
    }

    try {
        const result = await paiementService.capturePayment(paymentIntentId);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur dans le contrôleur (capturePayment):', error);
        res.status(500).json({ error: 'Erreur lors de la capture du paiement.' });
    }
};

exports.refundPayment = async (req, res) => {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
        return res.status(400).json({ error: 'Payment Intent ID manquant.' });
    }

    try {
        const result = await paiementService.refundPayment(paymentIntentId);
        res.json(result);
    } catch (error) {
        console.error('❌ Erreur dans le contrôleur (refundPayment):', error);
        res.status(500).json({ error: 'Erreur lors du remboursement.' });
    }
};

// Gère la liaison entre un Payment Intent existant et une réservation
exports.linkIntentToReservation = async (req, res, next) => {
    try {
        const { clientSecret, reservationId } = req.body;
        if (!clientSecret || !reservationId) {
            return res.status(400).json({ message: 'clientSecret et reservationId sont requis pour la liaison.' });
        }
        await paiementService.linkIntentToReservation(clientSecret, reservationId);
        res.json({ success: true, message: 'Liaison Payment Intent - Réservation réussie.' });
    } catch (e) {
        console.error('❌ Erreur lors de la liaison Payment Intent - Réservation:', e);
        next(e); // Passe l'erreur au middleware suivant pour une gestion centralisée
    }
};
