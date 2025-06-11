// ──────────────────────────────────────────────────────────────────────────────
// services/paiement.service.js (Complet et Corrigé)
// ──────────────────────────────────────────────────────────────────────────────
const { pool } = require('../config/db'); // Assurez-vous que 'pool' est bien importé d'ici
const stripe = require('../config/stripe'); // Assurez-vous que Stripe est initialisé ici

// Crée un Payment Intent (pré-autorisation)
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
            capture_method: 'manual', // Indique que le paiement doit être capturé manuellement plus tard
        });

        console.log('✅ PaymentIntent créé avec ID Stripe :', paymentIntent.id);

        // Créez l'entrée de paiement initiale dans la BDD avec le statut 'préautorisé'.
        // reservation_id peut être NULL à ce stade, il sera lié plus tard via linkIntentToReservation.
        await pool.query(`
            INSERT INTO paiement (reservation_id, montant, statut, methode, stripe_payment_intent_id)
            VALUES ($1, $2, 'préautorisé', 'CB', $3)
        `, [reservationId, amountFloat, paymentIntent.id]); // $1 sera null si reservationId est null

        console.log('🗃️ Paiement enregistré (pré-autorisation). Liaison à la réservation en attente si nécessaire.');

        return paymentIntent.client_secret; // Le client secret est envoyé au frontend pour la Payment Sheet
    } catch (error) {
        console.error('❌ Erreur Stripe ou BDD lors de la création du PaymentIntent :', error.message);
        throw error;
    }
};

// Capture un Payment Intent après la double validation
exports.capturePayment = async (paymentIntentId) => {
    console.log(`▶️ [paiement.service.js] ➜ Début capture PaymentIntent: ${paymentIntentId}`);
    try {
        const intent = await stripe.paymentIntents.capture(paymentIntentId);

        await pool.query(`
            UPDATE paiement
            SET statut = 'validé', updated_at = CURRENT_TIMESTAMP
            WHERE stripe_payment_intent_id = $1
        `, [paymentIntentId]);

        console.log(`✅ PaymentIntent ${paymentIntentId} capturé. Statut BDD mis à jour.`);
        return intent;
    } catch (error) {
        console.error(`❌ Erreur Stripe ou BDD lors de la capture du PaymentIntent ${paymentIntentId}:`, error.message);
        throw error;
    }
};

// Rembourse un Payment Intent (utilisé en cas d'annulation totale ou litige)
exports.refundPayment = async (paymentIntentId) => {
    console.log(`▶️ [paiement.service.js] ➜ Début remboursement PaymentIntent: ${paymentIntentId}`);
    try {
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            // amount: amountToRefund, // Optionnel: spécifier un montant de remboursement partiel
        });

        await pool.query(`
            UPDATE paiement
            SET statut = 'remboursé', stripe_refund_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE stripe_payment_intent_id = $2
        `, [refund.id, paymentIntentId]);

        console.log(`✅ PaymentIntent ${paymentIntentId} remboursé. Statut BDD mis à jour.`);
        return refund;
    } catch (error) {
        console.error(`❌ Erreur Stripe ou BDD lors du remboursement du PaymentIntent ${paymentIntentId}:`, error.message);
        throw error;
    }
};

// ANNULE un Payment Intent (utilisé si la pré-autorisation est annulée avant capture)
exports.cancelPaymentIntent = async (paymentIntentId) => {
    console.log(`▶️ [paiement.service.js] ➜ Début annulation PaymentIntent: ${paymentIntentId}`);
    try {
        const canceledIntent = await stripe.paymentIntents.cancel(paymentIntentId);
        // Mettre à jour le statut dans la BDD
        await pool.query(`
            UPDATE paiement
            SET statut = 'annulé', updated_at = CURRENT_TIMESTAMP
            WHERE stripe_payment_intent_id = $1
        `, [paymentIntentId]);
        console.log(`✅ PaymentIntent ${paymentIntentId} annulé.`);
        return canceledIntent;
    } catch (error) {
        console.error(`❌ Erreur lors de l'annulation du PaymentIntent ${paymentIntentId}:`, error.message);
        throw error;
    }
};


// Lie un Payment Intent pré-autorisé à une réservation existante
exports.linkIntentToReservation = async (clientSecret, reservationId) => {
    console.log(`▶️ [paiement.service.js] ➜ Début liaison PaymentIntent à Réservation ${reservationId}`);
    // Le clientSecret est de la forme pi_xxxx_secret_yyyy. On extrait l'ID de l'Intent.
    const paymentIntentId = clientSecret.split('_secret_')[0];

    // Mettre à jour la table 'paiement' avec le reservation_id
    await pool.query(`
        UPDATE paiement
        SET reservation_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = $2
            RETURNING *;
    `, [reservationId, paymentIntentId]);

    // Mettre à jour la table 'reservation' avec le stripe_payment_intent_id
    await pool.query(`
        UPDATE reservation
        SET stripe_payment_intent_id = $1, date_modification = NOW()
        WHERE id = $2;
    `, [paymentIntentId, reservationId]);

    console.log(`🔗 Payment Intent ${paymentIntentId} lié à la réservation ${reservationId} en BDD.`);
    return { success: true };
};
