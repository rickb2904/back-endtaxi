// ============================
// paiement.service.js (modifié)
// ============================

const { pool } = require('../config/db');
const stripe = require('../config/stripe');

exports.createPaymentIntent = async (reservationId, amount) => {
    console.log('▶️ [paiement.service.js] ➜ Début création PaymentIntent');
    console.log('ℹ️ Données reçues : reservationId =', reservationId, ', amount =', amount);

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat)) {
        console.error('❌ Montant invalide (non numérique) reçu :', amount);
        throw new Error('Montant invalide');
    }

    const amountInCents = Math.round(amountFloat * 100);
    console.log('💰 Montant converti en centimes pour Stripe :', amountInCents);

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'eur',
            capture_method: 'manual',
        });

        console.log('✅ PaymentIntent créé avec ID Stripe :', paymentIntent.id);

        await pool.query(`
            INSERT INTO paiement (reservation_id, montant, statut, methode, stripe_payment_intent_id)
            VALUES ($1, $2, 'en attente', 'CB', $3)
        `, [reservationId, amountFloat, paymentIntent.id]);

        await pool.query(`
            UPDATE reservation
            SET stripe_payment_intent_id = $1
            WHERE id = $2
        `, [paymentIntent.id, reservationId]);

        console.log('🗃️ Paiement enregistré et lié à la réservation.');
        return paymentIntent.client_secret;
    } catch (error) {
        console.error('❌ Erreur Stripe ou BDD :', error.message);
        throw error;
    }
};

exports.capturePayment = async (paymentIntentId) => {
    const intent = await stripe.paymentIntents.capture(paymentIntentId);

    await pool.query(`
        UPDATE paiement
        SET statut = 'validé', updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = $1
    `, [paymentIntentId]);

    return intent;
};

exports.refundPayment = async (paymentIntentId) => {
    const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
    });

    await pool.query(`
        UPDATE paiement
        SET statut = 'remboursé', stripe_refund_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = $2
    `, [refund.id, paymentIntentId]);

    return refund;
};