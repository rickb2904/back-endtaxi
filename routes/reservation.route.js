const routerRes = require('express').Router();
const resCtrl   = require('../controllers/reservation.controller');
const auth      = require('../middlewares/auth.middleware');

routerRes.post('/reservations', auth, resCtrl.create);
routerRes.delete('/reservations/:id', auth, resCtrl.cancel);
routerRes.get('/users/:id/reservations', auth, resCtrl.listForUser);
routerRes.post('/reservations/auto-complete', resCtrl.autoComplete);
routerRes.put('/reservations/:id/status', auth, resCtrl.updateStatut);
routerRes.put('/reservations/:id/validate', auth, resCtrl.validateReservation); // Route unifiée
routerRes.put('/reservations/:id/refuse-by-chauffeur', auth, resCtrl.refuseByChauffeur);

module.exports = routerRes;