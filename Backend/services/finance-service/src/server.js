const app = require('./app');
const config = require('./config');
const mongoose = require('mongoose');

(async () => {
    await mongoose.connect(config.mongoUri, { family: 4, maxPoolSize: 10 });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
    app.listen(config.port, () => {
        console.log(`💰 Finance Service running on http://localhost:${config.port}`);
    });
})();
