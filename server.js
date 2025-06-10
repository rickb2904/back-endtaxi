/*
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const { WebSocketServer } = require('ws');


const multer = require('multer');
const path = require('path');

// Configuration de Multer pour stocker les images dans un dossier 'uploads'
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Stocker les images dans un dossier 'uploads'
    },
    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname); // Extrait l'extension du fichier
        const filename = `${Date.now()}${fileExtension}`; // Génère un nom de fichier unique
        cb(null, filename); // Nom de fichier final
    }
});

const upload = multer({ storage: storage });

// Création de l'app Express
const app = express();
const port = 3000;

// Middleware
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.json());
app.use(cors());


// Configuration PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Clé secrète JWT
const JWT_SECRET = process.env.JWT_SECRET;
const RESET_TOKEN_EXPIRATION = '15m'; // 15 minutes


// Configuration Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});



// ------------------
// Middleware pour vérifier le token
// ------------------
function authenticateToken(req, res, next) {
    // Le token est généralement passé dans le header Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({
            message: 'Authorization header manquant.',
        });
    }

    // Récupérer le token après "Bearer "
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token manquant.' });
    }

    // Vérifier la validité du token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token invalide ou expiré.' });
        }
        req.user = user;
        next();
    });
}

// ------------------
// Route d'inscription
// ------------------
app.post('/api/register', upload.single('photo_de_profil'), async (req, res) => {
    const { nom, prenom, email, mot_de_passe, telephone, adresse } = req.body;
    const photo_de_profil = req.file ? `/uploads/${req.file.filename}` : null; // Récupère le chemin du fichier

    // Vérification des champs obligatoires
    if (!nom || !prenom || !email || !mot_de_passe || !telephone) {
        return res.status(400).json({
            message: 'Tous les champs obligatoires doivent être remplis.'
        });
    }

    try {
        // Vérifier si l'email existe déjà
        const existingUser = await pool.query(
            'SELECT * FROM "User" WHERE email = $1',
            [email]
        );
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
        }

        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

        const query = `
            INSERT INTO "User" (nom, prenom, email, mot_de_passe, role, telephone, adresse, photo_de_profil)
            VALUES ($1, $2, $3, $4, 'client', $5, $6, $7)
                RETURNING id, nom, prenom, email, role, photo_de_profil;
        `;
        const values = [nom, prenom, email, hashedPassword, telephone, adresse || null, photo_de_profil];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'Inscription réussie.',
            user: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Erreur lors de l\'inscription.',
            error: error.message,
        });
    }
});


// ------------------
// Route pour récupérer les taxis disponibles
// ------------------
app.get('/api/taxis', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT "User".id, "User".nom, "User".prenom, "User".latitude, "User".longitude
      FROM "User"
      INNER JOIN Chauffeur ON "User".id = Chauffeur.user_id
      WHERE Chauffeur.disponibilite = TRUE
    `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des taxis.',
        });
    }
});

// ------------------
// Route de connexion (login)
// ------------------
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    try {
        const result = await pool.query(`SELECT * FROM "User" WHERE email = $1`, [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Identifiants invalides.' });
        }

        const user = result.rows[0];

        // Vérification du mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.mot_de_passe);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Identifiants invalides.' });
        }

        // Génération d'un token JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // On renvoie également le nom, prénom et la photo_de_profil
        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role: user.role,
                photo_de_profil: user.photo_de_profil // <-- Assure-toi que ce champ existe dans ta table
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Erreur lors de la connexion.',
        });
    }
});


// ------------------
// Route "mot de passe oublié"
// ------------------
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Veuillez fournir un email.' });
    }

    try {
        const result = await pool.query(`SELECT * FROM "User" WHERE email = $1`, [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Aucun utilisateur trouvé avec cet email.' });
        }

        const user = result.rows[0];

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: RESET_TOKEN_EXPIRATION,
        });

        const resetLink = `http://localhost:3001/reset-password?token=${token}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            html: `
                <p>Bonjour ${user.nom},</p>
                <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
                <a href="${resetLink}">Réinitialiser mon mot de passe</a>
                <p>Ce lien expirera dans 15 minutes.</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Email de réinitialisation envoyé.' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email :', error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
    }
});

// ------------------
// Route pour récupérer les utilisateurs (ex, on peut protéger si besoin)
// ------------------
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "User"');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des utilisateurs.',
        });
    }
});

// ------------------
// Calcul des frais de trajet
// ------------------
// ---------------------------------------------------------------------
// 2) OUTILS DISTANCE
// ---------------------------------------------------------------------
const R = 6371;                             // Rayon de la Terre (km)
const toRad = (deg) => (deg * Math.PI) / 180;

const haversineDistance = (p1, p2) => {
    const dLat = toRad(p2.latitude - p1.latitude);
    const dLon = toRad(p2.longitude - p1.longitude);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(p1.latitude)) *
        Math.cos(toRad(p2.latitude)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km
};

const polylineDistance = (pts = []) => {
    if (!Array.isArray(pts) || pts.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
        total += haversineDistance(
            { latitude: pts[i].lat, longitude: pts[i].lng },
            { latitude: pts[i + 1].lat, longitude: pts[i + 1].lng }
        );
    }
    return total;
};

// ---------------------------------------------------------------------
// 3) PARAMÉTRAGE TARIFS
// ---------------------------------------------------------------------
const DAY_RATE   = 1.04;   // € / km
const NIGHT_RATE = 3.00;   // € / km
const isNightHour = (date) => {
    const h = date.getHours();
    return h >= 22 || h < 6;
};

// ---------------------------------------------------------------------
// 4) ROUTE CALCUL PRIX
// ---------------------------------------------------------------------
app.post('/api/calculate-price', (req, res) => {
    const { start, end, route, timestamp } = req.body;

    // 4-a) DISTANCE
    let distanceKm = 0;

    if (Array.isArray(route) && route.length >= 2) {
        distanceKm = polylineDistance(route);
    } else if (
        start && end &&
        typeof start.latitude === 'number' &&
        typeof start.longitude === 'number' &&
        typeof end.latitude === 'number' &&
        typeof end.longitude === 'number'
    ) {
        distanceKm = haversineDistance(start, end);
    } else {
        return res.status(400).json({ message: 'Route ou coordonnées invalides.' });
    }

    // 4-b) TARIF
    const refDate  = timestamp ? new Date(timestamp) : new Date();
    const night    = isNightHour(refDate);
    const rate     = night ? NIGHT_RATE : DAY_RATE;
    const rateType = night ? 'night'    : 'day';

    // 4-c) PRIX
    const price = distanceKm * rate;

    // 4-d) RÉPONSE
    res.json({
        distance : distanceKm.toFixed(2),  // "7.83"
        rate     : rate.toFixed(2),        // "3.00"
        rateType,                          // "night"
        price    : price.toFixed(2),       // "23.49"
    });
});

// ------------------
// 🚖 API des réservations
// ------------------

app.post('/api/reservations', authenticateToken, async (req, res) => {
    const {
        id_utilisateur,
        id_taxi,
        depart,
        arrivee,
        distance,
        prix,
        date_prise_en_charge,
        nb_personnes,
        animaux
    } = req.body;

    // Vérification
    if (
        !id_utilisateur ||
        !id_taxi ||
        !depart ||
        !arrivee ||
        !distance ||
        !prix ||
        !date_prise_en_charge ||
        nb_personnes === undefined ||
        animaux === undefined
    ) {
        return res.status(400).json({ message: 'Données incomplètes pour la réservation.' });
    }

    try {
        // Insertion
        const result = await pool.query(`
            INSERT INTO "reservation"
            (
                id_utilisateur, id_taxi, depart, arrivee,
                distance, prix, statut, date_prise_en_charge,
                nb_personnes, animaux
            )
            VALUES
                (
                    $1, $2, $3, $4,
                    $5, $6, 'demandée', $7,
                    $8, $9
                )
                RETURNING *;
        `, [
            id_utilisateur,
            id_taxi,
            depart,
            arrivee,
            distance,
            prix,
            date_prise_en_charge,
            nb_personnes, // paramètre $8
            animaux       // paramètre $9
        ]);

        return res.status(201).json({
            message: 'Réservation enregistrée avec succès.',
            reservation: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Erreur lors de la réservation.'
        });
    }
});



// 🔥 Annulation d'une réservation par un client
app.delete('/api/reservations/:id', authenticateToken, async (req, res) => {
    try {
        const reservationId = req.params.id;
        const userId = req.user.id;

        // Vérifier si la réservation appartient bien à l’utilisateur
        const result = await pool.query(`
            SELECT * FROM "reservation"
            WHERE id = $1 AND id_utilisateur = $2;
        `, [reservationId, userId]);

        if (result.rows.length === 0) {
            return res.status(403).json({ message: 'Réservation introuvable ou non autorisée.' });
        }

        // Supprimer la réservation, quel que soit son statut
        await pool.query(`DELETE FROM "reservation" WHERE id = $1;`, [reservationId]);

        return res.status(200).json({ message: 'Réservation annulée avec succès.' });
    } catch (error) {
        console.error('Erreur lors de l\'annulation de la réservation :', error);
        res.status(500).json({ message: 'Erreur lors de l\'annulation de la réservation.' });
    }
});




// 🔹 Récupération des réservations pour un utilisateur (client/chauffeur/admin)
app.get('/api/users/:id/reservations', authenticateToken, async (req, res) => {
    try {
        const userIdFromParams = parseInt(req.params.id, 10);
        const userIdFromToken = req.user.id;
        const userRole = req.user.role;

        // Vérification : seul l'utilisateur concerné ou un admin peut voir ces données
        if (userIdFromParams !== userIdFromToken && userRole !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

        let query;
        let values = [];

        // --- Cas 1 : Client ---
        if (userRole === 'client') {
            query = `
                SELECT
                    r.id,
                    r.depart,
                    r.arrivee,
                    r.distance,
                    r.prix,
                    r.statut,
                    r.date_prise_en_charge,
                    r.nb_personnes,
                    r.animaux,

                    -- Infos du client (qui a réservé)
                    u.nom  AS client_nom,
                    u.prenom AS client_prenom,

                    -- Infos du chauffeur sélectionné
                    chUser.nom  AS chauffeur_nom,
                    chUser.prenom AS chauffeur_prenom

                FROM "reservation" r
                         JOIN "User" u        ON r.id_utilisateur = u.id
                         JOIN "User" chUser   ON r.id_taxi       = chUser.id

                WHERE r.id_utilisateur = $1
                ORDER BY r.date_prise_en_charge DESC;
            `;
            values = [userIdFromParams];
        }
        // --- Cas 2 : Chauffeur ---
        else if (userRole === 'chauffeur') {
            query = `
                SELECT
                    r.id,
                    r.depart,
                    r.arrivee,
                    r.distance,
                    r.prix,
                    r.statut,
                    r.date_prise_en_charge,
                    r.nb_personnes,
                    r.animaux,

                    -- Infos du client
                    cli.nom     AS client_nom,
                    cli.prenom  AS client_prenom,

                    -- Infos du chauffeur
                    chUser.nom  AS chauffeur_nom,
                    chUser.prenom AS chauffeur_prenom

                FROM "reservation" r
                         JOIN "User" cli      ON r.id_utilisateur = cli.id
                         JOIN "User" chUser   ON r.id_taxi       = chUser.id

                WHERE r.id_taxi = $1
                ORDER BY r.date_prise_en_charge DESC;
            `;
            values = [userIdFromParams];
        }
        // --- Cas 3 : Admin ---
        else if (userRole === 'admin') {
            query = `
                SELECT
                    r.id,
                    r.depart,
                    r.arrivee,
                    r.distance,
                    r.prix,
                    r.statut,
                    r.date_prise_en_charge,
                    r.nb_personnes,
                    r.animaux,

                    -- Client
                    cli.nom      AS client_nom,
                    cli.prenom   AS client_prenom,

                    -- Chauffeur
                    chUser.nom   AS chauffeur_nom,
                    chUser.prenom AS chauffeur_prenom

                FROM "reservation" r
                         JOIN "User" cli      ON r.id_utilisateur = cli.id
                         JOIN "User" chUser   ON r.id_taxi       = chUser.id

                ORDER BY r.date_prise_en_charge DESC;
            `;
        }

        const result = await pool.query(query, values);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des réservations :', error);
        return res.status(500).json({ message: 'Erreur lors de la récupération des réservations.' });
    }
});

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(`
            SELECT *
            FROM "User"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        const user = result.rows[0];

        const photoProfil = user.photo_de_profil || null;

        const profileImageUrl = photoProfil ? `http://192.168.1.41:3000/uploads/${photoProfil.split('/').pop()}` : null;

        return res.status(200).json({
            id: user.id,
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            telephone: user.telephone,
            adresse: user.adresse,
            role: user.role,
            profileImage: profileImageUrl
        });
    } catch (error) {
        console.error("Erreur dans /api/me :", error);
        return res.status(500).json({ message: 'Erreur lors de la récupération du profil utilisateur.' });
    }
});


// PUT /api/me
app.put('/api/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // ID depuis le token
        const { nom, prenom, email, telephone, adresse } = req.body;


        if (!nom || !prenom || !email) {
            return res.status(400).json({ message: 'Champs obligatoires manquants.' });
        }

        // Mise à jour de l’utilisateur dans la table "User"
        const result = await pool.query(`
      UPDATE "User"
      SET nom = $1,
          prenom = $2,
          email = $3,
          telephone = $4,
          adresse = $5
      WHERE id = $6
      RETURNING id, nom, prenom, email, telephone, adresse, role, photo_de_profil
    `, [nom, prenom, email, telephone, adresse, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }

        // On récupère la ligne mise à jour
        const updatedUser = result.rows[0];

        // Renvoie un JSON confirmant la mise à jour
        return res.status(200).json({
            message: 'Mise à jour réussie.',
            user: {
                id: updatedUser.id,
                nom: updatedUser.nom,
                prenom: updatedUser.prenom,
                email: updatedUser.email,
                telephone: updatedUser.telephone,
                adresse: updatedUser.adresse,
                role: updatedUser.role,
                photo_de_profil: updatedUser.photo_de_profil
            }
        });
    } catch (error) {
        console.error('Erreur dans PUT /api/me :', error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour du profil.' });
    }
});

app.get('/api/chauffeur/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'chauffeur') {
            return res.status(403).json({ message: 'Accès refusé. Vous n’êtes pas chauffeur.' });
        }

        const userId = req.user.id;

        const result = await pool.query(`
            SELECT Chauffeur.disponibilite
            FROM "User"
                     JOIN Chauffeur ON "User".id = Chauffeur.user_id
            WHERE "User".id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Chauffeur non trouvé.' });
        }

        return res.json({ disponibilite: result.rows[0].disponibilite });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur lors de la récupération du statut chauffeur.' });
    }
});


app.put('/api/chauffeur/disponibilite', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'chauffeur') {
            return res.status(403).json({ message: 'Accès refusé. Vous n’êtes pas chauffeur.' });
        }

        const userId = req.user.id;
        const { disponibilite } = req.body;

        const result = await pool.query(`
            UPDATE Chauffeur
            SET disponibilite = $1
            WHERE user_id = $2
                RETURNING disponibilite
        `, [disponibilite, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Chauffeur non trouvé.' });
        }

        return res.status(200).json({
            message: 'Disponibilité mise à jour.',
            disponibilite: result.rows[0].disponibilite
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de la disponibilité.' });
    }
});

// GET /api/chauffeur/me
// Renvoie l'ID du chauffeur (table "chauffeur") associé au user_id = req.user.id
app.get('/api/chauffeur/me', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'chauffeur') {
            return res.status(403).json({ message: 'Accès refusé : pas chauffeur.' });
        }

        const userId = req.user.id;
        const result = await pool.query(`
      SELECT id
      FROM chauffeur
      WHERE user_id = $1
    `, [userId]);

        if (result.rows.length === 0) {
            // L'utilisateur n'a pas de ligne dans la table chauffeur
            return res.status(404).json({ message: 'Aucun chauffeur trouvé pour ce user_id.' });
        }

        return res.json({ chauffeurId: result.rows[0].id });
    } catch (err) {
        console.error('Erreur /api/chauffeur/me :', err);
        res.status(500).json({ message: 'Erreur lors de la récupération du chauffeurId.' });
    }
});


// Récupère UNIQUEMENT les "demandée"
app.get('/api/chauffeur/reservations/pending', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'chauffeur') {
            return res.status(403).json({ message: 'Accès refusé : pas chauffeur.' });
        }
        const chauffeurId = parseInt(req.query.chauffeurId, 10);

        const result = await pool.query(`
            SELECT
                r.id,
                r.depart,
                r.arrivee,
                r.distance,
                r.prix,
                r.statut,
                r.date_prise_en_charge,
                r.nb_personnes,
                r.animaux,

                -- Récupère seulement nom/prénom du client
                cli.nom        AS client_nom,
                cli.prenom     AS client_prenom

            FROM reservation r
                     JOIN chauffeur c       ON r.id_taxi = c.id
                     JOIN "User"   cli      ON r.id_utilisateur = cli.id
            WHERE r.id_taxi = $1
              AND r.statut = 'demandée'
            ORDER BY r.date_creation DESC;
        `, [chauffeurId]);

        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des réservations en attente.'
        });
    }
});


// Récupère UNIQUEMENT les "acceptée"
app.get('/api/chauffeur/reservations/accepted', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'chauffeur') {
            return res.status(403).json({ message: 'Accès refusé : pas chauffeur.' });
        }
        const chauffeurId = parseInt(req.query.chauffeurId, 10);

        const result = await pool.query(`
            SELECT
                r.id,
                r.depart,
                r.arrivee,
                r.distance,
                r.prix,
                r.statut,
                r.date_prise_en_charge,
                r.nb_personnes,
                r.animaux,

                cli.nom        AS client_nom,
                cli.prenom     AS client_prenom

            FROM reservation r
                     JOIN chauffeur c       ON r.id_taxi = c.id
                     JOIN "User"   cli      ON r.id_utilisateur = cli.id
            WHERE r.id_taxi = $1
              AND r.statut = 'acceptée'
            ORDER BY r.date_creation DESC;
        `, [chauffeurId]);

        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Erreur lors de la récupération des réservations acceptées.'
        });
    }
});


// Met à jour le statut d'une réservation (acceptée, refusée, annulée)
app.put('/api/chauffeur/reservation/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'chauffeur') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const userId = req.user.id;
    const reservationId = req.params.id;
    const { statut } = req.body;

    // Vérification du statut
    if (!["acceptée", "refusée", "annulée"].includes(statut)) {
        return res.status(400).json({ message: 'Statut invalide.' });
    }

    try {
        // Vérifier que la réservation appartient bien à ce chauffeur
        const checkReservation = await pool.query(`
            SELECT * FROM "reservation"
            WHERE id = $1 AND id_taxi = $2;
        `, [reservationId, userId]);

        if (checkReservation.rows.length === 0) {
            return res.status(404).json({ message: 'Réservation non trouvée.' });
        }

        // Mettre à jour le statut en base
        const result = await pool.query(`
            UPDATE "reservation"
            SET statut = $1
            WHERE id = $2
            RETURNING *;
        `, [statut, reservationId]);

        console.log(`PUT /api/chauffeur/reservation/${reservationId} => statut=${statut}`);

        return res.status(200).json({
            message: `Réservation ${statut}`,
            reservation: result.rows[0]
        });
    } catch (error) {
        console.error("Erreur PUT chauffeur/reservation/:id =>", error);
        res.status(500).json({
            message: 'Erreur lors de la mise à jour du statut de la réservation.'
        });
    }
});


// -------------------
// Accepter / Refuser / Annuler une réservation
// -------------------
app.put('/api/chauffeur/reservation/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'chauffeur') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const userId = req.user.id;
    const reservationId = req.params.id;
    const { statut } = req.body;

    if (!["acceptée", "refusée", "annulée"].includes(statut)) {
        return res.status(400).json({ message: 'Statut invalide.' });
    }

    try {
        // Vérifier que la réservation appartient au chauffeur
        const checkReservation = await pool.query(`
            SELECT * FROM "reservation"
            WHERE id = $1 AND id_taxi = $2;
        `, [reservationId, userId]);

        if (checkReservation.rows.length === 0) {
            return res.status(404).json({ message: 'Réservation non trouvée.' });
        }

        // Mettre à jour le statut
        const result = await pool.query(`
            UPDATE "reservation"
            SET statut = $1
            WHERE id = $2
                RETURNING *;
        `, [statut, reservationId]);

        console.log(`PUT /api/chauffeur/reservation/${reservationId} => statut=${statut}`);

        return res.status(200).json({
            message: `Réservation ${statut}`,
            reservation: result.rows[0]
        });
    } catch (error) {
        console.error("Erreur PUT chauffeur/reservation/:id =>", error);
        res.status(500).json({
            message: 'Erreur lors de la mise à jour du statut de la réservation.'
        });
    }
});


// ------------------
// Middleware global pour les erreurs
// ------------------
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Une erreur inattendue est survenue.' });
});

// ------------------
// Lancement du serveur
// ------------------
app.listen(port, '0.0.0.0', () => {
    console.log(`Serveur démarré et accessible sur http://0.0.0.0:${port}`);
});
*/

// ──────────────────────────────────────────────────────────────────────────────
// server.js
// ──────────────────────────────────────────────────────────────────────────────
const http = require('http');
const { WebSocketServer } = require('ws');
const app = require('./app');

const port = process.env.PORT || 3000;
const server = http.createServer(app);

// WebSocket optionnel (à adapter à votre logique temps‑réel)
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    ws.on('message', (msg) => console.log('WS message:', msg.toString()));
    ws.send('Bienvenue sur WebSocket');
});

server.listen(port, '0.0.0.0', () => {
    console.log(`🚀  Serveur HTTP/WS lancé sur http://0.0.0.0:${port}`);
});