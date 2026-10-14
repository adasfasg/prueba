const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'pmforgex_secret_key_2026_production_grade';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token de autenticación requerido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch live user status from DB
    const user = db.prepare(`
      SELECT id, email, full_name, role, status, phone, created_at, deleted_at 
      FROM users 
      WHERE id = ?
    `).get(decoded.id);

    if (!user || user.deleted_at !== null) {
      return res.status(401).json({ error: 'Usuario no encontrado o dado de baja.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Su cuenta ha sido suspendida. Por favor, contacte con la administración de PMForgeX.' 
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Sesión expirada o token inválido.' });
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
