// routes/taxi.route.js
const router = require('express').Router();
const taxiCtrl = require('../controllers/taxi.controller');

// endpoint public, pas d’auth
router.get('/taxis', taxiCtrl.list);

module.exports = router;
