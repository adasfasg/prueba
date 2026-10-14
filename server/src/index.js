const express = require('express');
const path = require('path'); // <-- Asegúrate de importar 'path'
// ... tus otras importaciones (routes, cors, etc.)

const app = express();

// Middlewares existentes...
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imágenes de evidencias estáticamente
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Tus rutas de la API...
// app.use('/api/evidences', evidenceRoutes);
// ...

// 🟢 CONFIGURACIÓN DEL PUERTO PARA RENDER Y LOCAL
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
