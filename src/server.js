const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { processAllDueRecurring } = require('./services/recurringService');

let server;

async function start() {
  try {
    await connectDB();
    // eslint-disable-next-line no-console
    console.log('[moneta] connected to MongoDB');

    server = app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[moneta] API listening on http://localhost:${env.port}`);
    });

    // Catch up on recurring transactions at boot, then sweep hourly.
    processAllDueRecurring().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('[moneta] initial recurring sweep failed:', error.message);
    });

    const interval = setInterval(() => {
      processAllDueRecurring().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('[moneta] recurring sweep failed:', error.message);
      });
    }, 60 * 60 * 1000);
    interval.unref();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[moneta] failed to start:', error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[moneta] ${signal} received, shutting down gracefully…`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
