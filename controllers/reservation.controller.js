/*
const reservationSvc = require('../services/reservation.service');

exports.create = async (req, res, next) => {
    try {
        const reservation = await reservationSvc.create(req.body);
        res.status(201).json({ message: 'Réservation créée', reservation });
    } catch (e) { next(e); }
};

exports.cancel = async (req, res, next) => {
    try {
        await reservationSvc.cancel(req.params.id, req.user.id);
        res.json({ message: 'Réservation annulée' });
    } catch (e) { next(e); }
};

exports.listForUser = async (req, res, next) => {
    try {
        const data = await reservationSvc.listForUser(parseInt(req.params.id, 10), req.user.role);
        res.json(data);
    } catch (e) { next(e); }
};

exports.updateStatut = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { statut } = req.body;
        const updated = await reservationSvc.updateStatut(id, statut);
        res.json(updated);
    } catch (e) {
        res.status(404).json({ message: e.message });
    }
};



exports.validateByClient = async (req, res, next) => {
    try {
        const { statut, message } = req.body;

        if (statut !== 'terminée' && statut !== 'litige') {
            return res.status(400).json({ error: 'Statut invalide' });
        }

        const result = await reservationSvc.validateByClient(req.params.id, req.user.id, statut, message);
        res.json({ message: `Réservation marquée comme ${statut}`, reservation: result });
    } catch (e) {
        next(e);
    }
};

exports.autoComplete = async (req, res, next) => {
    try {
        const count = await reservationSvc.autoCompleteOldReservations();
        res.json({ message: `${count} réservation(s) terminée(s) automatiquement.` });
    } catch (e) {
        next(e);
    }
};

exports.validateByChauffeur = async (req, res, next) => {
    try {
        const result = await reservationSvc.validateByChauffeur(req.params.id, req.user.id);
        res.json({ message: `Réservation validée par le chauffeur`, reservation: result });
    } catch (e) {
        next(e);
    }
};
*/
// ──────────────────────────────────────────────────────────────────────────────
// controllers/reservation.controller.js (Complet et Corrigé)
// ──────────────────────────────────────────────────────────────────────────────
const reservationSvc = require('../services/reservation.service');
const reservationModel = require('../models/reservation.model'); // Importez le modèle pour l'update direct du statut

exports.create = async (req, res, next) => {
    try {
        const reservation = await reservationSvc.create(req.body);
        res.status(201).json({ message: 'Réservation créée', reservation });
    } catch (e) {
        console.error("Erreur lors de la création de la réservation:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de la création de la réservation.' });
        next(e);
    }
};

exports.cancel = async (req, res, next) => {
    try {
        await reservationSvc.cancel(parseInt(req.params.id, 10), req.user.id); // Convertir l'ID en entier
        res.json({ message: 'Réservation annulée' });
    } catch (e) {
        console.error("Erreur lors de l'annulation de la réservation:", e);
        res.status(400).json({ message: e.message || 'Impossible d’annuler la réservation.' });
        next(e);
    }
};

exports.listForUser = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const role = req.user.role; // Assurez-vous que req.user.role est bien défini par votre middleware d'authentification
        const statut = req.query.statut || null; // Récupère le statut depuis les paramètres de requête (ex: ?statut=acceptée)

        const data = await reservationSvc.listForUser(userId, role, statut);
        res.json(data);
    } catch (e) {
        console.error("Erreur lors de la liste des réservations pour l'utilisateur:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de la récupération des réservations.' });
        next(e);
    }
};

// --- CORRECTION MAJEURE ICI : updateStatut pour les changements de statut simples ---
// Cette route est utilisée pour les statuts comme 'acceptée', 'refusée', 'annulée'
exports.updateStatut = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { statut } = req.body; // Le nouveau statut envoyé par le frontend (ex: 'acceptée', 'refusée', 'annulée')

        // Liste des statuts autorisés pour une simple mise à jour via cette route
        const allowedSimpleStatuses = ['demandée', 'acceptée', 'refusée', 'annulée', 'en cours'];
        if (!allowedSimpleStatuses.includes(statut)) {
            return res.status(400).json({ message: `Statut "${statut}" non autorisé pour cette route de mise à jour simple.` });
        }

        // Appelle directement le modèle pour une simple mise à jour du statut, sans logique de paiement
        const updated = await reservationModel.updateStatus(id, statut);
        res.json(updated);
    } catch (e) {
        console.error("Erreur lors de la mise à jour simple du statut de réservation:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de la mise à jour du statut.' });
        next(e);
    }
};

// validateByClient : Gère la validation finale par le client (terminée ou litige)
// Cette route peut déclencher la capture de paiement si le statut est 'terminée'.
exports.validateByClient = async (req, res, next) => {
    try {
        const { statut, message } = req.body;
        const reservationId = parseInt(req.params.id, 10); // Convertir l'ID en entier

        if (statut !== 'terminée' && statut !== 'litige') {
            return res.status(400).json({ error: 'Statut invalide pour la validation client.' });
        }

        const result = await reservationSvc.validateByClient(reservationId, req.user.id, statut, message);
        res.json({ message: `Réservation marquée comme ${statut}`, reservation: result });
    } catch (e) {
        console.error("Erreur lors de la validation par le client:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de la validation client.' });
        next(e);
    }
};

// autoComplete : Fonction pour terminer automatiquement les anciennes réservations (pour un CRON par exemple)
exports.autoComplete = async (req, res, next) => {
    try {
        const count = await reservationSvc.autoCompleteOldReservations();
        res.json({ message: `${count} réservation(s) terminée(s) automatiquement.` });
    } catch (e) {
        console.error("Erreur lors de l'auto-complétion des réservations:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de l\'auto-complétion.' });
        next(e);
    }
};

// validateByChauffeur : Gère la validation finale par le chauffeur (marque toujours 'terminée')
// Cette route déclenchera la capture de paiement.
exports.validateByChauffeur = async (req, res, next) => {
    try {
        const reservationId = parseInt(req.params.id, 10);
        const result = await reservationSvc.validateByChauffeur(reservationId, req.user.id);
        res.json({ message: `Réservation validée par le chauffeur`, reservation: result });
    } catch (e) {
        console.error("Erreur lors de la validation par le chauffeur:", e);
        res.status(500).json({ message: e.message || 'Erreur interne du serveur lors de la validation chauffeur.' });
        next(e);
    }
};
