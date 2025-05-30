// ──────────────────────────────────────────────
// controllers/user.controller.js
// ──────────────────────────────────────────────
const userSvc = require('../services/user.service');

/**
 * GET /api/users/me
 */
exports.getMe = async (req, res, next) => {
    try {
        const u = await userSvc.getById(req.user.id);
        if (!u) return res.status(404).json({ message: 'Utilisateur introuvable' });

        const host = req.protocol + '://' + req.get('host');
        const profileImage = u.photo_de_profil
            ? `${host}${u.photo_de_profil.startsWith('/') ? '' : '/'}${u.photo_de_profil}`
            : null;

        res.json({
            id        : u.id,
            nom       : u.nom,
            prenom    : u.prenom,
            email     : u.email,
            telephone : u.telephone,
            adresse   : u.adresse,
            role      : u.role,
            photo_de_profil : u.photo_de_profil,
            profileImage
        });
    } catch (e) { next(e); }
};

/**
 * PUT /api/users/me
 */
exports.updateMe = async (req, res, next) => {
    try {
        const updated = await userSvc.updateProfile(req.user.id, req.body);
        res.json({ message: 'Mise à jour réussie', user: updated });
    } catch (e) { next(e); }
};
