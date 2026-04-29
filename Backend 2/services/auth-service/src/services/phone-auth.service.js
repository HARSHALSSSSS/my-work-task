const User = require('../models/user.model');
const config = require('../config');
const SAMPLE_OTP = '123456';

const normalizePhoneNumber = (input) => {
    const raw = String(input || '').trim();
    if (!raw) {
        const error = new Error('Phone number is required');
        error.statusCode = 400;
        throw error;
    }

    const digits = raw.replace(/\D/g, '');
    if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
        return `+${digits}`;
    }

    if (digits.length === 10) {
        return `${config.twilio.defaultCountryCode}${digits}`;
    }

    if (digits.length >= 11 && digits.length <= 15) {
        return `+${digits}`;
    }

    const error = new Error('Enter a valid phone number');
    error.statusCode = 400;
    throw error;
};

const getTwilioAuthHeader = () => {
    const { accountSid, authToken, verifyServiceSid } = config.twilio;
    if (!accountSid || !authToken || !verifyServiceSid) {
        const error = new Error('Phone OTP is not configured on this server');
        error.statusCode = 503;
        throw error;
    }

    return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
};

const sendOtp = async (phone) => {
    const normalizedPhone = normalizePhoneNumber(phone);

    console.log(`📱 [SAMPLE OTP MODE] OTP for ${normalizedPhone}: ${SAMPLE_OTP}`);
    return { phone: normalizedPhone, status: 'pending', mockOtp: SAMPLE_OTP };

    /*
    const response = await fetch(
        `https://verify.twilio.com/v2/Services/${config.twilio.verifyServiceSid}/Verifications`,
        {
            method: 'POST',
            headers: {
                Authorization: getTwilioAuthHeader(),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: normalizedPhone,
                Channel: 'sms',
            }),
        }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(payload.message || 'Failed to send OTP');
        error.statusCode = response.status;
        throw error;
    }

    return { phone: normalizedPhone, status: payload.status || 'pending' };
    */
};

const buildPhoneEmail = (normalizedPhone) =>
    `${normalizedPhone.replace(/\D/g, '')}@phone.speedcopy.local`;

const verifyOtp = async (phone, otp) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    const code = String(otp || '').trim();
    if (!code) {
        const error = new Error('OTP is required');
        error.statusCode = 400;
        throw error;
    }

    if (code !== SAMPLE_OTP) {
        const error = new Error(`Invalid OTP. Use ${SAMPLE_OTP} for now.`);
        error.statusCode = 401;
        throw error;
    }

    console.log(`✅ [SAMPLE OTP MODE] OTP verified for ${normalizedPhone}`);

    /*
    const response = await fetch(
        `https://verify.twilio.com/v2/Services/${config.twilio.verifyServiceSid}/VerificationCheck`,
        {
            method: 'POST',
            headers: {
                Authorization: getTwilioAuthHeader(),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: normalizedPhone,
                Code: code,
            }),
        }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status !== 'approved') {
        const error = new Error(payload.message || 'Invalid or expired OTP');
        error.statusCode = response.ok ? 401 : response.status;
        throw error;
    }
    */

    let user = await User.findOne({
        $or: [{ phone: normalizedPhone }, { email: buildPhoneEmail(normalizedPhone) }],
    });

    if (!user) {
        user = await User.create({
            name: 'SpeedCopy User',
            email: buildPhoneEmail(normalizedPhone),
            phone: normalizedPhone,
            role: 'user',
            isEmailVerified: false,
            isActive: true,
        });
    } else {
        user.phone = normalizedPhone;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });
    }

    if (!user.isActive) {
        const error = new Error('Account has been deactivated');
        error.statusCode = 403;
        throw error;
    }

    return { user };
};

module.exports = {
    normalizePhoneNumber,
    sendOtp,
    verifyOtp,
};
