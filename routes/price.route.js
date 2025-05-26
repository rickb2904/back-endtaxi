// ──────────────────────────────────────────────────────────────────────────────
// routes/price.route.js
// ──────────────────────────────────────────────────────────────────────────────
const routerPrice = require('express').Router();
const priceCtrl   = require('../controllers/price.controller');
routerPrice.post('/calculate-price', priceCtrl.postCalculatePrice);
module.exports = routerPrice;
