const chauffeurSvc = require('../services/chauffeur.service');

exports.status = async (req, res, next) => {
    try {
        const ch = await chauffeurSvc.getByUserId(req.user.id);
        if (!ch) return res.status(404).json({ message: 'Chauffeur non trouvé' });
        res.json({ disponibilite: ch.disponibilite });
    } catch (e) {
        console.error('❌ Erreur dans status:', e.message);
        next(e);
    }
};

exports.setDisponibilite = async (req, res, next) => {
    try {
        console.log('📥 Corps de la requête :', req.body);

        const { disponibilite } = req.body;

        if (typeof disponibilite === 'undefined') {
            console.warn('⚠️ Champ "disponibilite" manquant dans le body');
            return res.status(400).json({ error: 'Champ "disponibilite" requis' });
        }

        const out = await chauffeurSvc.setDisponibilite(req.user.id, disponibilite);

        if (!out) {
            console.warn(`⚠️ Aucun chauffeur trouvé pour user ${req.user.id}`);
            return res.status(404).json({ error: 'Aucun chauffeur trouvé pour cet utilisateur' });
        }

        console.log(`✅ Disponibilité mise à jour pour user ${req.user.id} → ${out.disponibilite}`);
        res.json({ message: 'Disponibilité mise à jour', disponibilite: out.disponibilite });
    } catch (e) {
        console.error('❌ Erreur dans setDisponibilite:', e.message);
        next(e);
    }
};

exports.me = async (req, res, next) => {
    try {
        const ch = await chauffeurSvc.getByUserId(req.user.id);
        if (!ch) return res.status(404).json({ message: 'Aucun chauffeur' });
        res.json({ chauffeurId: ch.id });
    } catch (e) {
        console.error('❌ Erreur dans me:', e.message);
        next(e);
    }
};

exports.pending = async (req, res, next) => {
    try {
        const cid = req.query.chauffeurId
            ? parseInt(req.query.chauffeurId, 10)
            : req.user.id;
        res.json(await chauffeurSvc.pendingReservations(cid));
    } catch (e) {
        console.error('❌ Erreur dans pending:', e.message);
        next(e);
    }
};

exports.accepted = async (req, res, next) => {
    try {
        const cid = req.query.chauffeurId
            ? parseInt(req.query.chauffeurId, 10)
            : req.user.id;
        res.json(await chauffeurSvc.acceptedReservations(cid));
    } catch (e) {
        console.error('❌ Erreur dans accepted:', e.message);
        next(e);
    }
};
