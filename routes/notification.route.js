// ──────────────────────────────────────────────────────────────────────────────
// routes/notification.route.js
// ──────────────────────────────────────────────────────────────────────────────
const routerNotif = require('express').Router();
const notifCtrl   = require('../controllers/notification.controller');
routerNotif.post('/notifications', notifCtrl.create);
module.exports = routerNotif;