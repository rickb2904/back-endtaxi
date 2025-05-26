const multer = require('multer');
const path   = require('path');

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename   : (_req, file, cb) =>
        cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

module.exports = multer({ storage });
