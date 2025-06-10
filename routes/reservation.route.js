/*const routerRes = require('express').Router();
const resCtrl   = require('../controllers/reservation.controller');
const auth      = require('../middlewares/auth.middleware');

routerRes.post('/reservations',          auth, resCtrl.create);
routerRes.delete('/reservations/:id',    auth, resCtrl.cancel);
routerRes.get('/users/:id/reservations', auth, resCtrl.listForUser);
routerRes.put('/chauffeur/reservation/:id', auth, resCtrl.updateStatut);
routerRes.put('/client/reservation/:id', auth, resCtrl.validateByClient);
routerRes.post('/reservations/auto-complete', resCtrl.autoComplete);
routerRes.put('/chauffeur/reservation/:id/validate', auth, resCtrl.validateByChauffeur);

module.exports = routerRes;*/

const routerRes = require('express').Router();
const resCtrl   = require('../controllers/reservation.controller');
const auth      = require('../middlewares/auth.middleware'); // Assurez-vous que le chemin est correct

// Routes existantes pour les réservations
routerRes.post('/reservations', auth, resCtrl.create);
routerRes.delete('/reservations/:id', auth, resCtrl.cancel);
routerRes.get('/users/:id/reservations', auth, resCtrl.listForUser);
routerRes.post('/reservations/auto-complete', resCtrl.autoComplete); // Note: Cette route n'a pas besoin d'auth si elle est déclenchée par un service interne ou un CRON

// --- Modifications pour les mises à jour de statut et les validations ---
// Ces routes remplacent les anciennes conventions de chemin plus spécifiques
// et sont plus alignées avec une approche RESTful où l'ID est le paramètre principal.

// Route générique pour la mise à jour du statut d'une réservation (utilisée par updateStatut)
// Cela permet de changer n'importe quel statut d'une réservation par son ID.
// Par exemple: PUT /api/reservations/:id/status { "statut": "acceptée" }
routerRes.put('/reservations/:id/status', auth, resCtrl.updateStatut);

// Route spécifique pour la validation client d'une réservation
// Par exemple: PUT /api/reservations/:id/validate-client { "statut": "terminée", "message": "..." }
routerRes.put('/reservations/:id/validate-client', auth, resCtrl.validateByClient);

// Route spécifique pour la validation chauffeur d'une réservation
// Par exemple: PUT /api/reservations/:id/validate-chauffeur
routerRes.put('/reservations/:id/validate-chauffeur', auth, resCtrl.validateByChauffeur);

module.exports = routerRes;
