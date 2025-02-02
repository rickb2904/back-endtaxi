/*require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

// Configuration de la connexion PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Clé secrète JWT
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware pour vérifier les tokens (désactivé temporairement)
function authenticateToken(req, res, next) {
    console.warn('Attention : la vérification des tokens est désactivée.');
    next(); // Laisser passer toutes les requêtes
}

app.post('/api/register', async (req, res) => {
    const { nom, prenom, email, mot_de_passe, role, telephone, adresse } = req.body;

    if (!nom || !prenom || !email || !mot_de_passe || !role) {
        return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' });
    }

    try {
        // Vérifier si l'email existe déjà
        const existingUser = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
        }

        // Hacher le mot de passe
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

        // Insérer l'utilisateur dans la base de données
        const query = `
            INSERT INTO "User" (nom, prenom, email, mot_de_passe, role, telephone, adresse)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, nom, prenom, email, role;
        `;
        const values = [nom, prenom, email, hashedPassword, role, telephone, adresse];
        const result = await pool.query(query, values);

        res.status(201).json({ message: 'Inscription réussie.', user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription.' });
    }
});


// Route pour récupérer les taxis disponibles
app.get('/api/taxis', async (req, res) => {
    try {
        // Requête SQL pour récupérer les taxis disponibles
        const result = await pool.query(`
            SELECT "User".id, "User".nom, "User".prenom, "User".latitude, "User".longitude
            FROM "User"
            INNER JOIN Chauffeur ON "User".id = Chauffeur.user_id
            WHERE Chauffeur.disponibilite = TRUE
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération des taxis.' });
    }
});


// Route de connexion
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    try {
        // Recherche de l'utilisateur par email
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
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
            expiresIn: '1h',
        });

        res.status(200).json({ token, user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la connexion.' });
    }
});

// Exemple de route protégée (désactivation de la vérification des tokens)
app.get('/api/protected', (req, res) => {
    res.status(200).json({ message: `Bonjour, utilisateur. Vous êtes authentifié.` });
});


// Route "mot de passe oublié"
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res
            .status(400)
            .json({ message: 'Veuillez fournir un email.' });
    }

    try {
        // Vérifier si l'utilisateur existe
        const result = await pool.query(`SELECT * FROM "User" WHERE email = $1`, [email]);
        if (result.rows.length === 0) {
            return res
                .status(404)
                .json({ message: 'Aucun utilisateur trouvé avec cet email.' });
        }

        const user = result.rows[0];

        // Pour l’exemple, on génère un nouveau mot de passe aléatoire
        // Dans la réalité, on enverrait un lien de réinitialisation par email
        const newPassword = Math.random().toString(36).substring(2, 8); // 6 caractères aléatoires
        const hashed = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe dans la base
        await pool.query(
            `UPDATE "User" SET mot_de_passe = $1 WHERE id = $2`,
            [hashed, user.id]
        );

        // Répondre avec un message (ou le nouveau mdp pour la démo)
        // Dans un vrai projet, on enverrait un email, pas un retour direct
        res.status(200).json({
            message: 'Mot de passe réinitialisé.',
            newPassword: newPassword, // Pour la démo
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Erreur lors de la réinitialisation du mot de passe.',
        });
    }
});


// Route pour récupérer les utilisateurs (désactivation de la vérification des tokens)
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "User"');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
    }
});

// Middleware global pour les erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Une erreur inattendue est survenue.' });
});

// Lancement du serveur
app.listen(port, '0.0.0.0', () => {
    console.log(`Serveur démarré et accessible sur http://0.0.0.0:${port}`);
});
*/

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');


// Création de l'app Express
const app = express();
const port = 3000;

// Middleware
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
        // Stoker les infos du user dans req.user si besoin
        req.user = user;
        next();
    });
}

// ------------------
// Route d’inscription (register)
// ------------------
app.post('/api/register', async (req, res) => {
    const { nom, prenom, email, mot_de_passe, role, telephone, adresse } = req.body;

    if (!nom || !prenom || !email || !mot_de_passe || !role) {
        return res
            .status(400)
            .json({ message: 'Tous les champs obligatoires doivent être remplis.' });
    }

    try {
        // Vérifier si l'email existe déjà
        const existingUser = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
        }

        // Hacher le mot de passe
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

        // Insérer l'utilisateur
        const query = `
      INSERT INTO "User" (nom, prenom, email, mot_de_passe, role, telephone, adresse)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nom, prenom, email, role;
    `;
        const values = [nom, prenom, email, hashedPassword, role, telephone, adresse];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'Inscription réussie.',
            user: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Erreur lors de l\'inscription.',
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
        return res
            .status(400)
            .json({ message: 'Email et mot de passe requis.' });
    }

    try {
        // Recherche de l'utilisateur par email
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

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role: user.role,
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
// Exemple de route protégée
// ------------------
app.get('/api/protected', authenticateToken, (req, res) => {
    // Si on arrive là, c'est que le token est valide
    res.status(200).json({
        message: `Bonjour, ${req.user.email}! Votre token est valide.`,
        user: req.user,
    });
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
// Route "réinitialisation du mot de passe"
// ------------------
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token et mot de passe requis.' });
    }

    try {
        // Vérifier le token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Hacher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe dans la base
        await pool.query(`UPDATE "User" SET mot_de_passe = $1 WHERE id = $2`, [
            hashedPassword,
            decoded.id,
        ]);

        res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
    } catch (error) {
        console.error(error);
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Token expiré.' });
        }
        res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe.' });
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
const haversineDistance = (coord1, coord2) => {
    const toRad = (angle) => (angle * Math.PI) / 180;

    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coord1.latitude)) *
        Math.cos(toRad(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance en kilomètres
};

app.post('/api/calculate-price', (req, res) => {
    const { start, end } = req.body;

    if (!start || !end || !start.latitude || !start.longitude || !end.latitude || !end.longitude) {
        return res.status(400).json({ message: 'Coordonnées de départ et d\'arrivée nécessaires.' });
    }

    try {
        const distance = haversineDistance(start, end);

        // Grille tarifaire en fonction des kilomètres
        let price;
        if (distance <= 2) {
            price = 5; // Tarif minimum
        } else if (distance <= 5) {
            price = 10;
        } else {
            price = 10 + (distance - 5) * 1.5; // Exemple : 1.5 €/km au-delà de 5 km
        }

        return res.status(200).json({
            distance: distance.toFixed(2), // Arrondi à 2 décimales
            price: price.toFixed(2),      // Arrondi à 2 décimales
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors du calcul du prix.' });
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
