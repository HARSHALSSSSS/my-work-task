const twilio = require('twilio');
const config = require('../config');

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

const sendSms = async ({ to, body }) => {
    const message = await client.messages.create({
        body,
        from: config.twilio.phone,
        to,
    });
    return message;
};

module.exports = { sendSms };
