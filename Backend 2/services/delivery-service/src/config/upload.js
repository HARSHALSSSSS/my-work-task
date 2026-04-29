const fs = require('fs');
const path = require('path');
const multer = require('multer');

const rootUploadDir = path.join(__dirname, '../uploads');
const incidentUploadDir = path.join(rootUploadDir, 'delivery', 'incidents');

for (const dir of [rootUploadDir, incidentUploadDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const sanitizeFilename = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const incidentUpload = multer({
    storage: multer.diskStorage({
        destination: incidentUploadDir,
        filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}-${sanitizeFilename(file.originalname)}`);
        },
    }),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 3,
    },
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new Error('Only JPG, PNG, and WEBP incident images are allowed'));
    },
});

module.exports = {
    rootUploadDir,
    incidentUpload,
};
