const app = require('./app');
const config = require('./config');
const logger = require('../../shared/utils/logger');

const server = app.listen(config.port, () => {
  logger.info(`Gateway listening on port ${config.port}`);
  logger.info(`Gateway Swagger docs available at ${config.publicBaseUrl}/api-docs`);
});

process.on('unhandledRejection', (err) => {
  logger.error(err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(err);
  process.exit(1);
});
