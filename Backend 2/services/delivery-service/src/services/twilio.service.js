const twilio = require('twilio');
const SAMPLE_OTP = '123456';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

let client;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
}

const sendOtp = async (phoneNumber) => {
    console.log(`📱 [SAMPLE OTP MODE] Delivery OTP for ${phoneNumber}: ${SAMPLE_OTP}`);
    return 'pending';

    /*
    if (!client) throw new Error('Twilio credentials not configured');
    if (!verifyServiceSid) throw new Error('Twilio Verify Service SID not configured');

    try {
        const verification = await client.verify.v2.services(verifyServiceSid)
            .verifications
            .create({ to: phoneNumber, channel: 'sms' });

        return verification.status;
    } catch (error) {
        console.error('Twilio sendOtp error:', error);
        throw new Error('Failed to send OTP');
    }
    */
};

const verifyOtp = async (phoneNumber, code) => {
    const normalizedCode = String(code || '').trim();
    if (normalizedCode !== SAMPLE_OTP) {
        return false;
    }

    console.log(`[SAMPLE OTP MODE] Delivery OTP verified for ${phoneNumber}`);
    return true;

    /*
    if (!client) throw new Error('Twilio credentials not configured');
    if (!verifyServiceSid) throw new Error('Twilio Verify Service SID not configured');

    try {
        const verificationCheck = await client.verify.v2.services(verifyServiceSid)
            .verificationChecks
            .create({ to: phoneNumber, code: code });

        return verificationCheck.status === 'approved';
    } catch (error) {
        console.error('Twilio verifyOtp error:', error);
        throw new Error('Failed to verify OTP');
    }
    */
};

module.exports = {
    sendOtp,
    verifyOtp,
};
