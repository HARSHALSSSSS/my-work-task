const fs = require('fs');
const path = require('path');
const multer = require('multer');

const rootUploadDir = path.join(__dirname, '../uploads');
const attachmentsUploadDir = path.join(rootUploadDir, 'admin', 'attachments');

for (const dir of [rootUploadDir, attachmentsUploadDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const sanitizeFilename = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const attachmentUpload = multer({
    storage: multer.diskStorage({
        destination: attachmentsUploadDir,
        filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}-${sanitizeFilename(file.originalname)}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = {
    rootUploadDir,
    attachmentUpload,
};
