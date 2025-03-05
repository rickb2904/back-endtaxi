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
    // On ne récupère pas `role` depuis req.body
    const { nom, prenom, email, mot_de_passe, telephone, adresse } = req.body;

    // Vérification de base
    if (!nom || !prenom || !email || !mot_de_passe) {
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

        // Hacher le mot de passe
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

        // Insérer l'utilisateur avec role = 'client'
        const query = `
            INSERT INTO "User"
                (nom, prenom, email, mot_de_passe, role, telephone, adresse)
            VALUES
                ($1, $2, $3, $4, 'client', $5, $6)
                RETURNING id, nom, prenom, email, role;
        `;
        const values = [nom, prenom, email, hashedPassword, telephone, adresse];
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
// 🚖 API des réservations
// ------------------

app.post('/api/reservations', authenticateToken, async (req, res) => {
    const { id_utilisateur, id_taxi, depart, arrivee, distance, prix, date_prise_en_charge } = req.body;

    if (!id_utilisateur || !id_taxi || !depart || !arrivee || !distance || !prix || !date_prise_en_charge) {
        return res.status(400).json({ message: 'Données incomplètes pour la réservation.' });
    }

    try {
        const result = await pool.query(`
            INSERT INTO "reservation" (id_utilisateur, id_taxi, depart, arrivee, distance, prix, statut, date_prise_en_charge)
            VALUES ($1, $2, $3, $4, $5, $6, 'demandée', $7)
                RETURNING *;
        `, [id_utilisateur, id_taxi, depart, arrivee, distance, prix, date_prise_en_charge]);

        return res.status(201).json({ message: 'Réservation enregistrée avec succès.', reservation: result.rows[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la réservation.' });
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




// 🔹 Récupération des réservations pour un utilisateur ou un chauffeur
app.get('/api/users/:id/reservations', authenticateToken, async (req, res) => {
    try {
        const userIdFromParams = parseInt(req.params.id, 10);
        const userIdFromToken = req.user.id;
        const userRole = req.user.role;

        if (userIdFromParams !== userIdFromToken && userRole !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

        let query;
        let values;

        // Si l'utilisateur est un client, récupérer ses réservations uniquement
        if (userRole === 'client') {
            query = `
                SELECT * FROM "reservation"
                WHERE id_utilisateur = $1
                ORDER BY date_creation DESC;
            `;
            values = [userIdFromParams];

            // Si c'est un chauffeur, récupérer les courses qui lui sont attribuées
        } else if (userRole === 'chauffeur') {
            query = `
                SELECT * FROM "reservation"
                WHERE id_taxi = $1
                ORDER BY date_creation DESC;
            `;
            values = [userIdFromParams];

            // Si c'est un admin, afficher toutes les réservations du système
        } else if (userRole === 'admin') {
            query = `
                SELECT * FROM "reservation"
                ORDER BY date_creation DESC;
            `;
            values = [];
        }

        const result = await pool.query(query, values);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des réservations :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des réservations.' });
    }
});


// GET /api/me
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // Récupération de l'ID depuis le token

        // Récupération de l'utilisateur
        const result = await pool.query(`
            SELECT *
            FROM "User"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        const user = result.rows[0];

        // Fallback si photo_de_profil est NULL => renvoie null
        const photoProfil = user.photo_de_profil || null;

        // Réponse JSON (sans l'historique)
        return res.status(200).json({
            id: user.id,
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            telephone: user.telephone,
            adresse: user.adresse,
            role: user.role,
            profileImage: photoProfil // peut être null
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

        // On peut vérifier rapidement que certains champs ne sont pas vides
        // (selon ta logique)
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


app.get('/api/chauffeur/reservations', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'chauffeur') {
            return res.status(403).json({ message: 'Accès refusé : pas chauffeur.' });
        }
        const userId = req.user.id;
        const status = req.query.status || 'en attente';

        const result = await pool.query(`
            SELECT id, depart, arrivee, distance, prix, statut, date_prise_en_charge
            FROM "reservation"
            WHERE statut = $1
              AND id_taxi = $2
            ORDER BY date_creation DESC
        `, [status, userId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur...' });
    }
});


// 🔹 Récupération des réservations pour un chauffeur
app.get('/api/chauffeur/reservations', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'chauffeur') return res.status(403).json({ message: 'Accès refusé.' });

        const userId = req.user.id;
        const status = req.query.status || 'demandée';

        const result = await pool.query(`
            SELECT id, depart, arrivee, distance, prix, statut, date_prise_en_charge
            FROM "reservation"
            WHERE statut = $1
              AND id_taxi = $2
            ORDER BY date_creation DESC;
        `, [status, userId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la récupération des réservations.' });
    }
});

// 🔹 Accepter ou refuser une réservation
app.put('/api/chauffeur/reservation/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'chauffeur') return res.status(403).json({ message: 'Accès refusé.' });

    const userId = req.user.id;
    const reservationId = req.params.id;
    const { statut } = req.body;

    if (!["acceptée", "refusée"].includes(statut)) {
        return res.status(400).json({ message: 'Statut invalide.' });
    }

    try {
        const checkReservation = await pool.query(`
            SELECT * FROM "reservation"
            WHERE id = $1 AND id_taxi = $2;
        `, [reservationId, userId]);

        if (checkReservation.rows.length === 0) {
            return res.status(404).json({ message: 'Réservation non trouvée.' });
        }

        const result = await pool.query(`
            UPDATE "reservation"
            SET statut = $1
            WHERE id = $2
            RETURNING *;
        `, [statut, reservationId]);

        return res.status(200).json({ message: `Réservation ${statut}`, reservation: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du statut de la réservation.' });
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
