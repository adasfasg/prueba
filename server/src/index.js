const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// 1. Middlewares principales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Servir archivos estáticos subidos (imágenes/evidencias)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 3. CARGA DINÁMICA DE RUTAS DE AUTENTICACIÓN Y API
const routesPath = path.join(__dirname, 'routes');
const possibleAuthFiles = ['auth.js', 'authRoutes.js', 'auth.routes.js', 'index.js'];

let authLoaded = false;
if (fs.existsSync(routesPath)) {
  for (const file of possibleAuthFiles) {
    const fullPath = path.join(routesPath, file);
    if (fs.existsSync(fullPath)) {
      try {
        const authRoutes = require(fullPath);
        app.use('/api/auth', authRoutes);
        console.log(`[API] Rutas de autenticación cargadas desde: routes/${file}`);
        authLoaded = true;
        break;
      } catch (err) {
        console.error(`[API Error] No se pudo cargar routes/${file}:`, err.message);
      }
    }
  }
}

// Cargar automáticamente cualquier otro archivo de rutas en src/routes/
if (fs.existsSync(routesPath)) {
  fs.readdirSync(routesPath).forEach((file) => {
    if (file.endsWith('.js') && !possibleAuthFiles.includes(file)) {
      try {
        const routeName = file.replace(/\.(js|routes\.js|route\.js)$/, '');
        const router = require(path.join(routesPath, file));
        app.use(`/api/${routeName}`, router);
        console.log(`[API] Ruta registrada: /api/${routeName} -> routes/${file}`);
      } catch (e) {
        console.error(`[API Error] Error cargando la ruta routes/${file}:`, e.message);
      }
    }
  });
}

// 4. MANEJADOR 404 PARA LA API (SIN ASTERISCO PARA EVITAR PATHERROR)
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Ruta de API no encontrada',
    endpoint: req.originalUrl,
    method: req.method
  });
});

// 5. Servir los archivos estáticos del frontend de React (Vite / client/dist)
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// 6. RESPALDO PARA LAS RUTAS DE LA SPA (REACT)
app.use((req, res) => {
  if (req.path.startsWith('/uploads')) {
    return res.status(404).send('Archivo no encontrado');
  }
  
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('El cliente de React no se ha compilado correctamente (falta client/dist/index.html).');
  }
});

// 7. Configuración e inicio del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Servidor PMForgeX iniciado en el puerto ${PORT}`);
  console.log(`=================================`);
});

module.exports = app;
