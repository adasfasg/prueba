const express = require('express');
const path = require('path');

// Importa aquí tus rutas de la API si las tienes separadas, por ejemplo:
// const authRoutes = require('./routes/authRoutes');
// const evidenceRoutes = require('./routes/evidenceRoutes');

const app = express();

// 1. Middlewares principales para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Servir la carpeta de archivos subidos (uploads) estáticamente
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 3. 🟢 TUS RUTAS DE LA API (DEBEN IR ANTES DE REACT)
// Descomenta y adapta según los archivos de rutas que tenga tu proyecto:
// app.use('/api/auth', authRoutes);
// app.use('/api/evidences', evidenceRoutes);

// 4. Servir los archivos estáticos del cliente compilado (React / Vite)
app.use(express.static(path.join(__dirname, '../../client/dist')));

// 5. Middleware de respaldo para las rutas de la SPA (React Router)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// 6. Configuración del puerto para Render y entorno local
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
