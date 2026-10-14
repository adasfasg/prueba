const express = require('express');
const path = require('path'); // <-- Asegúrate de importar 'path'
// ... tus otras importaciones (routes, cors, etc.)

const app = express();

// Middlewares existentes...
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔴 AGREGA ESTA LÍNEA AQUÍ: Servir imágenes de evidencias estáticamente
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Tus rutas de la API...
// app.use('/api/evidences', evidenceRoutes);
// ...

module.exports = app;