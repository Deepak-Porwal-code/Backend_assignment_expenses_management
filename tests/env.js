process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation-1234567890';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_ORIGINS = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/moneta-test';
