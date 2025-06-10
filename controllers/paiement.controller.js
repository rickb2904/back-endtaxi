const paiementService = require('../services/paiement.service');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createIntent = async (req, res) => {
    try {
        // reservationId est maintenant optionnel à ce stade
        const { amount, reservationId = null } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(amount) * 100), // en centimes
            currency: 'eur',
            capture_method: 'manual', // ← important
            // metadata: { reservationId } // Ne pas mettre ici si reservationId n'est pas encore créé
        });

        // Appelez le service pour enregistrer l'intent initial sans reservationId si besoin
        // Le reservationId sera lié plus tard
        await paiementService.createPaymentIntent(reservationId, amount);


        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error('Erreur Stripe (createIntent):', err);
        res.status(500).json({ error: 'Erreur lors de la création de l\'intent' });
    }
};


exports.capturePayment = async (req, res) => {
    const { paymentIntentId } = req.body;

    try {
        const result = await paiementService.capturePayment(paymentIntentId);
        res.json(result);
    } catch (error) {
        console.error('Erreur Stripe (capturePayment):', error);
        res.status(500).json({ error: 'Erreur lors de la capture du paiement' });
    }
};

exports.refundPayment = async (req, res) => {
    const { paymentIntentId } = req.body;

    try {
        const result = await paiementService.refundPayment(paymentIntentId);
        res.json(result);
    } catch (error) {
        console.error('Erreur Stripe (refundPayment):', error);
        res.status(500).json({ error: 'Erreur lors du remboursement' });
    }
};

// --- NOUVELLE FONCTION AJOUTÉE ---
exports.linkIntentToReservation = async (req, res, next) => {
    try {
        const { clientSecret, reservationId } = req.body;
        if (!clientSecret || !reservationId) {
            return res.status(400).json({ message: 'clientSecret et reservationId sont requis.' });
        }
        await paiementService.linkIntentToReservation(clientSecret, reservationId);
        res.json({ success: true, message: 'Liaison Payment Intent - Réservation réussie.' });
    } catch (e) {
        console.error('Erreur lors de la liaison Payment Intent - Réservation:', e);
        next(e); // Passe l'erreur au middleware suivant
    }
};
