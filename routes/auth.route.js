// ──────────────────────────────────────────────────────────────────────────────
// routes/auth.route.js
// ──────────────────────────────────────────────────────────────────────────────
const routerAuth = require('express').Router();
const authCtrl = require('../controllers/auth.controller');
routerAuth.post('/register', authCtrl.register);
routerAuth.post('/login',    authCtrl.login);
routerAuth.post('/forgot-password', authCtrl.forgotPassword);
routerAuth.post('/reset-password',  authCtrl.resetPassword);
//routerAuth.post('/forgot-password', authCtrl.forgotPassword); // à compléter si besoin
module.exports = routerAuth;