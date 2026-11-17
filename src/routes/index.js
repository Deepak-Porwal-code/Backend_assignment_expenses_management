const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'moneta-api',
    uptime: Math.round(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    now: new Date().toISOString(),
  });
});

router.use('/auth', require('./authRoutes'));
router.use('/accounts', require('./accountRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/transactions', require('./transactionRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/budgets', require('./budgetRoutes'));
router.use('/goals', require('./goalRoutes'));
router.use('/recurring', require('./recurringRoutes'));

module.exports = router;
