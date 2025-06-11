// ──────────────────────────────────────────────────────────────────────────────
// services/price.service.js
// ──────────────────────────────────────────────────────────────────────────────

// -----------------------------------------------------------------------------
// 1) OUTILS GÉOGRAPHIQUES  -----------------------------------------------------
// -----------------------------------------------------------------------------
const R = 6371;                                 // rayon terre (km)
const toRad = deg => (deg * Math.PI) / 180;

/** Distance haversine entre deux points { latitude, longitude } en km */
const haversine = (a, b) => {
    const dLat = toRad(b.latitude  - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.latitude)) *
        Math.cos(toRad(b.latitude)) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

// -----------------------------------------------------------------------------
// 2) PARAMÉTRAGE TARIFS  -------------------------------------------------------
// -----------------------------------------------------------------------------
const DAY_RATE   = 1.04;   // €/km
const NIGHT_RATE = 3.00;   // €/km
const isNightHour = d => d.getHours() >= 22 || d.getHours() < 6;

// -----------------------------------------------------------------------------
// 3) CALCUL PRINCIPAL  ---------------------------------------------------------
// -----------------------------------------------------------------------------
/**
 * @param {Object} dto { start?, end?, route?, timestamp? }
 * @returns {Object}   { km, distance, rate, rateType, night, price }
 */
exports.computePrice = dto => {
    const { start, end, route = [], timestamp } = dto;

    // 3-a) DISTANCE --------------------------------------------------------------
    let km = 0;
    if (Array.isArray(route) && route.length >= 2) {
        for (let i = 0; i < route.length - 1; i++) {
            km += haversine(
                { latitude: route[i].lat, longitude: route[i].lng },
                { latitude: route[i + 1].lat, longitude: route[i + 1].lng }
            );
        }
    } else if (start && end) {
        km = haversine(start, end);
    } else {
        throw new Error('start/end ou route manquant');
    }

    // 3-b) TARIF -----------------------------------------------------------------
    const refDate  = timestamp ? new Date(timestamp) : new Date();
    const night    = isNightHour(refDate);
    const rate     = night ? NIGHT_RATE : DAY_RATE;
    const rateType = night ? 'night' : 'day';

    // 3-c) RÉSULTAT --------------------------------------------------------------
    return {
        km        : +km.toFixed(2),
        distance  : +km.toFixed(2),   // alias pour l’appli Flutter
        rate      : +rate.toFixed(2),
        rateType,                      // 'day' | 'night'
        night,                          // booléen
        price     : Math.round(km * rate),
    };
};