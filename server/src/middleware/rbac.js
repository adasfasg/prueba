const { db } = require('../db');

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Acceso denegado. Este recurso requiere uno de los siguientes roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
}

function protectSuperAdmin(req, res, next) {
  const targetUserId = parseInt(req.params.id, 10);
  
  // Protect account ID 1 or any super_admin from deletion or suspension
  if (targetUserId === 1) {
    if (req.method === 'DELETE') {
      return res.status(400).json({ error: 'La cuenta principal de Super Admin está protegida y no puede ser eliminada.' });
    }
    if (req.body && req.body.status === 'suspended') {
      return res.status(400).json({ error: 'La cuenta principal de Super Admin no puede ser suspendida.' });
    }
    if (req.body && req.body.role && req.body.role !== 'super_admin') {
      return res.status(400).json({ error: 'No se puede cambiar el rol de la cuenta principal de Super Admin.' });
    }
  }

  next();
}

function logAudit(userId, action, entity, entityId, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      action,
      entity,
      entityId || null,
      typeof details === 'object' ? JSON.stringify(details) : details,
      ip
    );
  } catch (err) {
    console.error('[AuditLog Error]', err);
  }
}

module.exports = {
  requireRole,
  protectSuperAdmin,
  logAudit
};
