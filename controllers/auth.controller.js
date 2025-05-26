// ──────────────────────────────────────────────────────────────────────────────
// controllers/auth.controller.js
// ──────────────────────────────────────────────────────────────────────────────
const authSvc  = require('../services/auth.service');
const upload   = require('../middlewares/upload.middleware');

exports.register = [
    upload.single('photo_de_profil'),
    async (req, res, next) => {
        try {
            const user = await authSvc.register({ ...req.body, photo: req.file ? `/uploads/${req.file.filename}` : null });
            res.status(201).json({ message: 'Inscription réussie', user });
        } catch (e) { next(e); }
    },
];

exports.login = async (req, res, next) => {
    try { res.json(await authSvc.login(req.body)); } catch (e) { next(e); }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await authSvc.register.findByEmail(req.body.email); // intentionally wrong line removed below
    } catch (e) { next(e); }
};
// simple réponse pour démo – à compléter si besoin


