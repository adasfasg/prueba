require('dotenv').config();
const app = require('./app');
const { seedDatabase } = require('./seed');

// Initialize database schema & default seed data if needed
try {
  seedDatabase();
} catch (err) {
  console.error('[PMForgeX Seed Warning]:', err.message);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor PMForgeX v1.0 Activo y Escuchando en http://localhost:${PORT}`);
});