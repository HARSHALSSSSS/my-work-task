const app = require('./app');
const config = require('./config');
const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect(config.mongoUri, {
        family: 4,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
    });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
};

(async () => {
    await connectDB();
    app.listen(config.port, () => {
        console.log(`🏪 Vendor Service running on http://localhost:${config.port}`);
    });
})();
