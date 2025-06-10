const paiementService = require('../services/paiement.service');


// controllers/paiement.controller.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createIntent = async (req, res) => {
    try {
        const { amount, reservationId } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(amount) * 100), // en centimes
            currency: 'eur',
            capture_method: 'manual', // ← important
            metadata: { reservationId }
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error('Erreur Stripe:', err);
        res.status(500).json({ error: 'Erreur lors de la création de l\'intent' });
    }
};


exports.capturePayment = async (req, res) => {
    const { paymentIntentId } = req.body;

    try {
        const result = await paiementService.capturePayment(paymentIntentId);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la capture du paiement' });
    }
};

exports.refundPayment = async (req, res) => {
    const { paymentIntentId } = req.body;

    try {
        const result = await paiementService.refundPayment(paymentIntentId);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du remboursement' });
    }
};
// ─────────────────────────────────────────────────────────────
// Contrôleur de test pour capturer manuellement un paiement
// ─────────────────────────────────────────────────────────────

