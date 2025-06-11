const { pool } = require('../config/db');
const paiementService = require('./paiement.service'); // Importez le service de paiement
const reservationModel = require('../models/reservation.model'); // Importez le modèle de réservation

// Helper pour récupérer une réservation par ID avec les infos client/chauffeur
// Note: Cette fonction reste ici car elle est utilisée en interne par d'autres services.
async function getReservationById(id) {
    const res = await pool.query(`
        SELECT
            r.*,
            json_build_object('id', c.id, 'prenom', c.prenom, 'nom', c.nom, 'email', c.email, 'telephone', c.telephone, 'photo_de_profil', c.photo_de_profil) as client_info,
            json_build_object('id', chUser.id, 'prenom', chUser.prenom, 'nom', chUser.nom, 'email', chUser.email, 'telephone', chUser.telephone, 'photo_de_profil', chUser.photo_de_profil) as chauffeur_info
        FROM reservation r
        JOIN "user" c ON r.id_utilisateur = c.id
        JOIN "chauffeur" ch ON r.id_taxi = ch.id -- Jointure correcte avec la table chauffeur
        JOIN "user" chUser ON ch.user_id = chUser.id -- Jointure pour obtenir les infos de l'utilisateur chauffeur
        WHERE r.id = $1;
    `, [id]);
    return res.rows[0];
}

exports.create = async (reservationData) => {
    // Vérifier les champs obligatoires
    const { id_utilisateur, id_taxi, depart, arrivee, distance, prix, date_prise_en_charge, nb_personnes, animaux, handicap } = reservationData;
    if (!id_utilisateur || !id_taxi || !depart || !arrivee || !distance || !prix || !date_prise_en_charge || !nb_personnes) {
        throw new Error('Champs de réservation manquants ou invalides.');
    }

    const res = await pool.query(`
        INSERT INTO reservation (
            id_utilisateur, id_taxi, depart, arrivee, distance, prix, date_prise_en_charge,
            nb_personnes, animaux, handicap, statut, client_confirmation, chauffeur_confirmation, date_creation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'demandée', FALSE, FALSE, NOW())
        RETURNING *;
    `, [id_utilisateur, id_taxi, depart, arrivee, distance, prix, date_prise_en_charge, nb_personnes, animaux || false, handicap || false]);

    return res.rows[0];
};

exports.cancel = async (reservationId, userId) => {
    const reservation = await getReservationById(reservationId);

    if (!reservation) {
        throw new Error('Réservation non trouvée.');
    }

    // Vérifier si l'utilisateur est le client ou le chauffeur de cette réservation
    const isClient = reservation.id_utilisateur === userId;
    // Pour vérifier si l'utilisateur est le chauffeur, nous devons d'abord trouver l'ID utilisateur du chauffeur
    const chauffeurData = await pool.query(`SELECT user_id FROM chauffeur WHERE id = $1;`, [reservation.id_taxi]);
    const isChauffeur = chauffeurData.rows.length > 0 && chauffeurData.rows[0].user_id === userId;


    if (!isClient && !isChauffeur) {
        throw new Error('Non autorisé à annuler cette réservation.');
    }

    // Vérifier le statut actuel pour l'annulation
    if (reservation.statut === 'annulée' || reservation.statut === 'terminée' || reservation.statut === 'refusée') {
        throw new Error('Cette réservation ne peut plus être annulée.');
    }

    // Si la réservation est acceptée et annulée par le client hors délai, ou par le chauffeur
    // nous devons gérer le remboursement ou l'annulation du PaymentIntent.
    if (reservation.statut === 'acceptée') {
        if (reservation.stripe_payment_intent_id) {
            await paiementService.refundPayment(reservation.stripe_payment_intent_id);
        }
    } else if (reservation.statut === 'demandée' && reservation.stripe_payment_intent_id) {
        // Si c'est une demande et qu'un PI existe (pré-autorisation), l'annuler
        await paiementService.cancelPaymentIntent(reservation.stripe_payment_intent_id);
    }


    const result = await pool.query(`
        UPDATE reservation
        SET statut = 'annulée', date_modification = NOW()
        WHERE id = $1
        RETURNING *;
    `, [reservationId]);

    if (result.rowCount === 0) {
        throw new Error('Échec de l\'annulation de la réservation.');
    }
    return result.rows[0];
};

// Mise à jour simple du statut (utilisé pour acceptation initiale par chauffeur)
exports.updateStatus = async (reservationId, newStatus) => {
    const result = await pool.query(`
        UPDATE reservation
        SET statut = $1, date_modification = NOW()
        WHERE id = $2
            RETURNING *;
    `, [newStatus, reservationId]);

    if (result.rowCount === 0) {
        throw new Error('Échec de la mise à jour du statut.');
    }
    return result.rows[0];
};

// Modification de listForUser pour utiliser les fonctions du modèle
exports.listForUser = async (userId, role, statutFilter = null) => {
    let data;
    if (role === 'client') {
        data = await reservationModel.forClientFull(userId, statutFilter);
    } else if (role === 'chauffeur') {
        // Pour le chauffeur, user_id est l'ID de l'utilisateur, pas l'ID du chauffeur (id_taxi)
        // La fonction `forChauffeurFull` du modèle gère déjà cette conversion
        data = await reservationModel.forChauffeurFull(userId, statutFilter);
    } else {
        throw new Error('Rôle non reconnu.');
    }
    return data;
};


// Nouvelle logique de validation unifiée pour client et chauffeur
exports.validateReservation = async ({ reservationId, userId, role, statut, message }) => {
    const reservation = await getReservationById(reservationId);

    if (!reservation) {
        throw new Error("Réservation introuvable.");
    }

    // Récupérer l'ID utilisateur du chauffeur via l'ID_taxi de la réservation
    const chauffeurUserRes = await pool.query(`SELECT user_id FROM chauffeur WHERE id = $1;`, [reservation.id_taxi]);
    const chauffeurUserId = chauffeurUserRes.rows.length > 0 ? chauffeurUserRes.rows[0].user_id : null;

    const isClient = role === 'client' && reservation.id_utilisateur === userId;
    const isChauffeur = role === 'chauffeur' && chauffeurUserId === userId; // Comparer avec l'ID utilisateur du chauffeur

    if (!isClient && !isChauffeur) {
        throw new Error("Non autorisé à valider cette réservation.");
    }

    // Gérer le litige
    if (statut === 'litige') {
        if (reservation.statut === 'terminée' || reservation.statut === 'annulée' || reservation.statut === 'refusée') {
            throw new Error("Impossible de déclarer un litige pour cette réservation.");
        }
        await reservationModel.setLitigeMessage(reservationId, message);
        const updated = await reservationModel.updateStatus(reservationId, 'litige');
        return updated;
    }

    // Gérer la confirmation
    let updatedReservation;
    if (isClient) {
        if (reservation.client_confirmation) {
            console.warn(`Le client ${userId} tente de re-confirmer la réservation ${reservationId}.`);
            return reservation; // Retourner l'état actuel si déjà confirmé
        }
        updatedReservation = await reservationModel.setClientConfirmation(reservationId, true);
    } else if (isChauffeur) {
        if (reservation.chauffeur_confirmation) {
            console.warn(`Le chauffeur ${userId} tente de re-confirmer la réservation ${reservationId}.`);
            return reservation; // Retourner l'état actuel si déjà confirmé
        }
        updatedReservation = await reservationModel.setChauffeurConfirmation(reservationId, true);
    } else {
        throw new Error("Validation impossible.");
    }

    // Vérifier si les deux parties ont confirmé pour passer au statut 'terminée'
    // Récupérer la dernière version de la réservation pour s'assurer d'avoir les deux flags
    const finalReservationState = await reservationModel.findById(reservationId);

    if (finalReservationState.client_confirmation &&
        finalReservationState.chauffeur_confirmation &&
        finalReservationState.statut !== 'litige' && // Ne pas terminer si c'est un litige
        finalReservationState.statut !== 'terminée') { // Éviter de retoucher si déjà terminée

        await reservationModel.updateStatus(reservationId, 'terminée');

        if (finalReservationState.stripe_payment_intent_id) {
            await paiementService.capturePayment(finalReservationState.stripe_payment_intent_id);
            console.log(`✅ Paiement capturé pour la réservation ${reservationId}`);
        }
        // Mettre à jour l'objet retourné avec le nouveau statut
        finalReservationState.statut = 'terminée';
        return finalReservationState; // Retourner l'état final si la course est terminée
    }

    return updatedReservation; // Retourner la réservation mise à jour (avec juste un flag de confirmation)
};


// Fonction pour terminer automatiquement les anciennes réservations (utilisée par un CRON par exemple)
exports.autoCompleteOldReservations = async () => {
    const result = await pool.query(`
        UPDATE reservation
        SET statut = 'terminée', date_fin = NOW(), date_modification = NOW()
        WHERE statut IN ('acceptée', 'en cours')
          AND date_prise_en_charge < NOW() - INTERVAL '1 hour' -- Exemple: 1 heure après la prise en charge
          AND (client_confirmation = FALSE OR chauffeur_confirmation = FALSE)
            RETURNING id;
    `);

    // Pour chaque réservation auto-complétée, capturer le paiement si un intent existe
    for (const row of result.rows) {
        const reservation = await getReservationById(row.id);
        if (reservation && reservation.stripe_payment_intent_id) {
            try {
                await paiementService.capturePayment(reservation.stripe_payment_intent_id);
                console.log(`Paiement ${reservation.stripe_payment_intent_id} capturé via auto-complétion pour la réservation ${reservation.id}`);
            } catch (e) {
                console.error(`Erreur lors de la capture du paiement via auto-complétion pour la réservation ${reservation.id}:`, e.message);
                // Gérer l'erreur (par exemple, marquer la réservation comme nécessitant une intervention manuelle)
            }
        }
    }

    return result.rowCount;
};


// NOUVEAU SERVICE : Pour le refus de réservation par le chauffeur
exports.refuseByChauffeur = async (reservationId, chauffeurUserId) => {
    const reservation = await getReservationById(reservationId);

    // Vérifier si l'ID de l'utilisateur correspond bien à l'user_id du chauffeur associé à cette réservation
    const chauffeurUserRes = await pool.query(`
        SELECT user_id FROM chauffeur WHERE id = $1;
    `, [reservation.id_taxi]);

    if (!reservation || chauffeurUserRes.rows.length === 0 || chauffeurUserRes.rows[0].user_id !== chauffeurUserId) {
        throw new Error('Réservation non trouvée ou non autorisée pour ce chauffeur.');
    }

    if (reservation.statut !== 'demandée') {
        throw new Error('Seules les réservations "demandées" peuvent être refusées par le chauffeur.');
    }

    // Annuler le Payment Intent si une pré-autorisation a été faite
    if (reservation.stripe_payment_intent_id) {
        await paiementService.cancelPaymentIntent(reservation.stripe_payment_intent_id);
    }

    const result = await pool.query(`
        UPDATE reservation
        SET statut = 'refusée', date_modification = NOW()
        WHERE id = $1
            RETURNING *;
    `, [reservationId]);

    if (result.rowCount === 0) {
        throw new Error('Échec du refus de la réservation par le chauffeur.');
    }
    return result.rows[0];
};