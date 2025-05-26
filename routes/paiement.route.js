// ──────────────────────────────────────────────────────────────────────────────
// routes/paiement.route.js
// ──────────────────────────────────────────────────────────────────────────────
const routerPay = require('express').Router();
const payCtrl   = require('../controllers/paiement.controller');
routerPay.post('/paiement', payCtrl.create);
routerPay.put('/paiement/:id', payCtrl.updateStatus);
module.exports = routerPay;