const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');

// Routes
const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const usersRoutes = require('./routes/users.routes');
const serversRoutes = require('./routes/servers.routes');
const creatorsRoutes = require('./routes/creators.routes');
const campaignsRoutes = require('./routes/campaigns.routes');
const evidencesRoutes = require('./routes/evidences.routes');
const metricsRoutes = require('./routes/metrics.routes');
const auditRoutes = require('./routes/audit.routes');
const notificationsRoutes = require('./routes/notifications.routes');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve brand assets directly
const assetsPath = path.resolve(__dirname, '../../assets');
if (fs.existsSync(assetsPath)) {
  app.use('/assets', express.static(assetsPath));
}

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/servers', serversRoutes);
app.use('/api/creators', creatorsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/evidences', evidencesRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PMForgeX API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build in production if present
const clientDistPath = path.resolve(__dirname, '../../client/dist');
let cachedIndexHtml = null;
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    // If request starts with /api, pass to error handler instead of sending index.html
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint API no encontrado.' });
    }
    if (!cachedIndexHtml) {
      cachedIndexHtml = fs.readFileSync(path.join(clientDistPath, 'index.html'), 'utf8');
    }
    res.type('html').send(cachedIndexHtml);
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[PMForgeX Error Handler]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor.'
  });
});

module.exports = app;
