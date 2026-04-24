const fs = require('fs');
const path = require('path');
const multer = require('multer');

const rootUploadDir = path.join(__dirname, '../uploads');
const avatarUploadDir = path.join(rootUploadDir, 'users', 'avatars');

for (const dir of [rootUploadDir, avatarUploadDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const sanitizeFilename = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const avatarStorage = multer.diskStorage({
    destination: avatarUploadDir,
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}-${sanitizeFilename(file.originalname)}`);
    },
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Only JPG, PNG, and WEBP avatar files are allowed'));
    },
});

module.exports = {
    rootUploadDir,
    avatarUpload,
};
