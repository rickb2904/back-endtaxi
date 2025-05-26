// ──────────────────────────────────────────────────────────────────────────────
// routes/user.route.js
// ──────────────────────────────────────────────────────────────────────────────
const routerUser = require('express').Router();
const userCtrl   = require('../controllers/user.controller');
const auth       = require('../middlewares/auth.middleware');
routerUser.get('/me',  auth, userCtrl.getMe);
routerUser.put('/me',  auth, userCtrl.updateMe);
module.exports = routerUser;