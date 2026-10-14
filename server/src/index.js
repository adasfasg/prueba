const express = require('express');
const path = require('path');
// ... tus otras importaciones (routes, cors, etc.)

const app = express();

// Middlewares existentes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imágenes de evidencias estáticamente
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Tus rutas de la API (mantén aquí tus endpoints)
// app.use('/api/evidences', evidenceRoutes);
// ...

// Servir archivos estáticos del cliente (React / Vite)
app.use(express.static(path.join(__dirname, '../../client/dist')));

// 🟢 RESPALDO SEGURO PARA LAS RUTAS DE REACT (SPA)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// Configuración del puerto para Render y entorno local
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
