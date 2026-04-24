require('dotenv').config();
module.exports = {
    port: process.env.PORT || 4004,
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_designs',
};
