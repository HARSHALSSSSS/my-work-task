const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`🚀 Gateway running on http://localhost:${config.port}`);
  console.log(`📚 Swagger docs: http://localhost:${config.port}/api-docs`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});
