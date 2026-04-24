const nodemailer = require('nodemailer');
const config = require('../config');

const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
});

const sendEmail = async ({ to, subject, html, text }) => {
    const info = await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        html,
        text,
    });
    return info;
};

module.exports = { sendEmail };
