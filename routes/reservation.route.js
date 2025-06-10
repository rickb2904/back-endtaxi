const routerRes = require('express').Router();
const resCtrl   = require('../controllers/reservation.controller');
const auth      = require('../middlewares/auth.middleware');

routerRes.post('/reservations',          auth, resCtrl.create);
routerRes.delete('/reservations/:id',    auth, resCtrl.cancel);
routerRes.get('/users/:id/reservations', auth, resCtrl.listForUser);
routerRes.put('/chauffeur/reservation/:id', auth, resCtrl.updateStatut);
routerRes.put('/client/reservation/:id', auth, resCtrl.validateByClient);
routerRes.post('/reservations/auto-complete', resCtrl.autoComplete);
routerRes.put('/chauffeur/reservation/:id/validate', auth, resCtrl.validateByChauffeur);

module.exports = routerRes;