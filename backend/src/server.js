require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // Verify DB connection before starting
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.warn('⚠️  Starting server without confirmed DB connection. Run migrations!');
  }

  app.listen(PORT, () => {
    logger.info(`🚀 MYTax Backend running on port ${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
