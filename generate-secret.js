const crypto = require('crypto');

// Générer une clé secrète sécurisée
const JWT_SECRET = crypto.randomBytes(64).toString('hex');
console.log('Clé secrète générée :', JWT_SECRET);
