import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(` Aura Health Clinic API Server running on port ${config.port}`);
  console.log(` Health check: http://localhost:${config.port}/api/health`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(` Database: Google Sheets '${config.spreadsheetName}' schema`);
  console.log(` Calendar: Google Calendar '${config.calendarName}' (IST)`);
  console.log(`=======================================================`);
});

// Graceful Shutdown
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully closing Aura Clinic server...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
