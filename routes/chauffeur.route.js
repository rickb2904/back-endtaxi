// ──────────────────────────────────────────────────────────────────────────────
// routes/chauffeur.route.js
// ──────────────────────────────────────────────────────────────────────────────
const routerCh = require('express').Router();
const chCtrl   = require('../controllers/chauffeur.controller');
const auth     = require('../middlewares/auth.middleware');

routerCh.get('/chauffeur/status',                auth, chCtrl.status);
routerCh.put('/chauffeur/disponibilite',         auth, chCtrl.setDisponibilite);
routerCh.get('/chauffeur/me',                    auth, chCtrl.me);
routerCh.get('/chauffeur/reservations/pending',  auth, chCtrl.pending);
routerCh.get('/chauffeur/reservations/accepted', auth, chCtrl.accepted);
module.exports = routerCh;