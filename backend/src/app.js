require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

// Route imports
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');
const taxRoutes = require('./routes/tax');
const employeeRoutes = require('./routes/employees');
const payrollRoutes = require('./routes/payroll');
const customerRoutes = require('./routes/customers');
const invoiceRoutes = require('./routes/invoices');
const einvoiceRoutes = require('./routes/einvoices');
const expenseRoutes = require('./routes/expenses');
const assetRoutes = require('./routes/assets');
const aiRoutes = require('./routes/ai');
const deadlineRoutes = require('./routes/deadlines');
const cgtRoutes = require('./routes/cgt');
const exportRoutes = require('./routes/export');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) return next();
  return limiter(req, res, next);
});

// Auth limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
});

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const { testConnection } = require('./config/database');
  const dbOk = await testConnection();
  res.json({
    status: 'ok',
    service: 'MYTax Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/einvoices', einvoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/cgt', cgtRoutes);
app.use('/api/export', exportRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation Error', details: err.details });
  }
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

module.exports = app;
