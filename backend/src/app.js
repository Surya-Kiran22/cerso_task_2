const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const os = require('os');
const { errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const analyzeRoutes = require('./routes/analyze');
const uploadRoutes = require('./routes/upload');
const analysesRoutes = require('./routes/analyses');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Trust proxy for rate limiting behind load balancer
app.set('trust proxy', 1);

// Security & standard middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Response header X-Served-By for load balancing observation
app.use((req, res, next) => {
  const hostname = process.env.HOSTNAME || os.hostname();
  res.setHeader('X-Served-By', hostname);
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analyses', analysesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Central Error Handler
app.use(errorHandler);

module.exports = app;
