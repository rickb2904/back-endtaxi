const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const UserModel   = require('../models/user.model');
const { JWT_SECRET, RESET_TOKEN_EXPIRATION } = require('../config/jwt');
const { mailer }  = require('../config/mailer');

exports.register = async (dto) => {
    if (await UserModel.findByEmail(dto.email))
        throw new Error('Cet email existe déjà');

    const hash = await bcrypt.hash(dto.mot_de_passe, 10);
    return UserModel.create({ ...dto, password: hash });
};

exports.login = async ({ email, password }) => {
    const user = await UserModel.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.mot_de_passe)))
        throw new Error('Identifiants invalides');

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
    return { token, user };
};

exports.sendResetMail = async (user) => {
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET,
        { expiresIn: RESET_TOKEN_EXPIRATION });
    await mailer.sendMail({
        from   : process.env.EMAIL_USER,
        to     : user.email,
        subject: 'Réinitialisation de mot de passe',
        html   : `<a href="http://localhost:3001/reset-password?token=${token}">Réinitialiser</a>`,
    });
};
