require('dotenv').config();

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
