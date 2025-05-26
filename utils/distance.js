const R = 6371;
const toRad = (deg) => deg * Math.PI / 180;

const haversine = (a, b) => {
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h = Math.sin(dLat/2)**2 +
        Math.cos(toRad(a.latitude)) *
        Math.cos(toRad(b.latitude)) *
        Math.sin(dLon/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
};

exports.haversine     = haversine;
exports.polylineKm    = (pts=[]) => pts.slice(1)
    .reduce((d,p,i)=>d+haversine(
        {latitude:pts[i].lat,longitude:pts[i].lng},
        {latitude:p.lat     ,longitude:p.lng}),0);
