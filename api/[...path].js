const app = require('../src/app');
const { connectDB } = require('../src/config/db');

// Reuse the MongoDB connection across warm serverless invocations.
let connectionPromise = null;

function ensureDatabase() {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  return connectionPromise;
}

module.exports = async function handler(req, res) {
  try {
    await ensureDatabase();
  } catch (error) {
    console.error('[moneta] database connection failed', error.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'The database is unavailable. Please try again.' }));
    return;
  }

  return app(req, res);
};
