const reservationSvc = require('../services/reservation.service');

exports.create = async (req, res) => {
    try {
        const reservation = await reservationSvc.create(req.body);
        res.status(201).json({ message: 'Réservation créée', reservation });
    } catch (e) {
        console.error("Erreur lors de la création de la réservation:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de la création de la réservation.' });
    }
};

exports.cancel = async (req, res) => {
    try {
        await reservationSvc.cancel(parseInt(req.params.id, 10), req.user.id);
        res.json({ message: 'Réservation annulée' });
    } catch (e) {
        console.error("Erreur lors de l'annulation de la réservation:", e);
        res.status(400).json({ message: e.message || 'Impossible d’annuler la réservation.' });
    }
};

exports.listForUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const role = req.user.role;
        const statut = req.query.statut || null;

        const data = await reservationSvc.listForUser(userId, role, statut);
        res.json(data);
    } catch (e) {
        console.error("Erreur lors de la liste des réservations pour l'utilisateur:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de la récupération des réservations.' });
    }
};

exports.updateStatut = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { statut } = req.body;

        const allowedSimpleStatuses = ['demandée', 'acceptée', 'en cours'];
        if (!allowedSimpleStatuses.includes(statut)) {
            return res.status(400).json({ message: `Statut "${statut}" non autorisé pour cette route de mise à jour simple.` });
        }

        const updated = await reservationSvc.updateStatus(id, statut);
        res.json(updated);
    } catch (e) {
        console.error("Erreur lors de la mise à jour simple du statut de réservation:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de la mise à jour du statut.' });
    }
};

// validateReservation : Gère la validation finale par le client OU le chauffeur
exports.validateReservation = async (req, res) => {
    try {
        const { statut, message } = req.body; // 'terminée' ou 'litige'
        const reservationId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const role = req.user.role;

        if (!['client', 'chauffeur'].includes(role)) {
            return res.status(403).json({ message: "Rôle non autorisé." });
        }

        const result = await reservationSvc.validateReservation({
            reservationId,
            userId,
            role,
            statut, // Ce statut peut être 'terminée' (si les deux valident) ou 'litige'
            message
        });

        res.json({
            message: `Réservation traitée par le ${role}.`,
            reservation: result
        });

    } catch (error) {
        console.error("Erreur validation réservation :", error.message);
        res.status(500).json({ message: error.message || 'Erreur serveur.' });
    }
};

exports.autoComplete = async (req, res) => {
    try {
        const count = await reservationSvc.autoCompleteOldReservations();
        res.json({ message: `${count} réservation(s) terminée(s) automatiquement.` });
    } catch (e) {
        console.error("Erreur lors de l'auto-complétion des réservations:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de l\'auto-complétion.' });
    }
};

// NOUVEAU CONTRÔLEUR : Pour le refus de réservation par le chauffeur
exports.refuseByChauffeur = async (req, res) => {
    try {
        const reservationId = parseInt(req.params.id, 10);
        await reservationSvc.refuseByChauffeur(reservationId, req.user.id);
        res.json({ message: `Réservation refusée par le chauffeur et paiement annulé.` });
    } catch (e) {
        console.error("Erreur lors du refus de la réservation par le chauffeur:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors du refus de la réservation.' });
    }
};