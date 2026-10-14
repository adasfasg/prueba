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

// 🟢 SERVIR ARCHIVOS ESTÁTICOS DEL CLIENTE (REACT / VITE)
app.use(express.static(path.join(__dirname, '../../client/dist')));

// 🟢 RUTA COMODÍN PARA REACT (MANEJO DE RUTAS DEL FRONTEND)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// 🟢 CONFIGURACIÓN DEL PUERTO PARA RENDER Y ENTORNO LOCAL
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
