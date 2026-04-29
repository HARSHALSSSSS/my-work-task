require('dotenv').config();

const requireEnv = (envName) => {
    const value = process.env[envName];
    if (!value) {
        throw new Error(`${envName} is not set`);
    }

    return value;
};

module.exports = {
    port: Number(process.env.PORT || 8080),
    mongoUri: requireEnv('MONGO_URI'),
    publicBaseUrl:
        process.env.DESIGN_SERVICE_PUBLIC_URL ||
        process.env.SERVICE_PUBLIC_URL,
};
