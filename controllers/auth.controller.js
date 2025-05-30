// ──────────────────────────────────────────────────────────────────────────────
// controllers/auth.controller.js
// ──────────────────────────────────────────────────────────────────────────────

const authSvc = require('../services/auth.service');
const upload = require('../middlewares/upload.middleware');
const UserModel = require('../models/user.model'); // ✅ Ajout nécessaire

// ────────────────
// Register
// ────────────────
exports.register = [
    upload.single('photo_de_profil'),
    async (req, res, next) => {
        try {
            const user = await authSvc.register({
                ...req.body,
                photo: req.file ? `/uploads/${req.file.filename}` : null
            });
            res.status(201).json({ message: 'Inscription réussie', user });
        } catch (e) {
            if (e.message === 'Cet email existe déjà') {
                return res.status(400).json({ message: 'Ce mail est déjà utilisé.' });
            }
            next(e);
        }
    },
];


// ────────────────
// Login
// ────────────────
exports.login = async (req, res, next) => {
    try {
        res.json(await authSvc.login(req.body));
    } catch (e) {
        next(e);
    }
};

// ────────────────
// Mot de passe oublié
// ────────────────
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        console.log('[API] Demande de réinitialisation pour :', email);

        const user = await UserModel.findByEmail(email);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }

        await authSvc.sendResetMail(user);
        res.status(200).json({ message: 'Email de réinitialisation envoyé.' });
    } catch (e) {
        next(e);
    }
};

// ────────────────
// Réinitialisation du mot de passe
// ────────────────
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        const message = await authSvc.resetPassword(token, newPassword);
        res.status(200).json({ message });
    } catch (e) {
        next(e);
    }
};
