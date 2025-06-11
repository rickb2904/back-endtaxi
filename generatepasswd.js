const bcrypt = require('bcrypt');
const password = 'rick';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) throw err;
    console.log('Mot de passe hashé :', hash);
});

