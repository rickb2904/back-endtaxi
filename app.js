// ──────────────────────────────────────────────────────────────
// app.js
// ──────────────────────────────────────────────────────────────
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');

const authRoutes        = require('./routes/auth.route');
const taxiRoutes        = require('./routes/taxi.route');
const userRoutes        = require('./routes/user.route');
const priceRoutes       = require('./routes/price.route');
const reservationRoutes = require('./routes/reservation.route');
const chauffeurRoutes   = require('./routes/chauffeur.route');
const paiementRoutes    = require('./routes/paiement.route');
const notificationRoutes= require('./routes/notification.route');

const errorHandler = require('./middlewares/error.middleware');

const app = express();
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.json());
app.use(cors());

/* ---------- routes ---------- */
/* Tout sauf les profils        */
app.use('/api', authRoutes);
app.use('/api', priceRoutes);
app.use('/api', taxiRoutes);
app.use('/api', reservationRoutes);
app.use('/api', chauffeurRoutes);
app.use('/api', paiementRoutes);
app.use('/api', notificationRoutes);

/* Profils : préfixe /api/users  */
app.use('/api/users', userRoutes);      //  --> /api/users/me

/* ---------- errors ----------- */
app.use(errorHandler);

module.exports = app;
