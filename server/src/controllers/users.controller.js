const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

function getUsers(req, res) {
  const { role, status, search } = req.query;

  let query = `
    SELECT 
      u.id, u.email, u.full_name, u.role, u.status, u.phone, u.notes, u.created_at,
      cp.alias as creator_alias,
      cp.hourly_rate_internal,
      cp.fixed_rate_internal,
      cp.commission_percentage
    FROM users u
    LEFT JOIN creator_profiles cp ON u.id = cp.user_id
    WHERE u.deleted_at IS NULL
  `;
  const params = [];

  if (role) {
    query += ' AND u.role = ?';
    params.push(role);
  }

  if (status) {
    query += ' AND u.status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR cp.alias LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY u.id ASC';

  const users = db.prepare(query).all(...params);
  return res.json(users);
}

function createUser(req, res) {
  const { 
    email, password, full_name, role, status = 'active', phone, notes,
    // Optional creator details
    alias, bio, games, platforms, hourly_rate_internal, fixed_rate_internal
  } = req.body;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Email, contraseña, nombre completo y rol son obligatorios.' });
  }

  // Check unique email
  const existing = db.prepare('SELECT id, deleted_at FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    if (existing.deleted_at !== null) {
      return res.status(400).json({ error: 'Ya existe un usuario histórico dado de baja con este correo. Debe reactivarlo o utilizar otro email.' });
    }
    return res.status(400).json({ error: 'Ya existe una cuenta con este correo electrónico.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, status, phone, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(email.trim(), passwordHash, full_name.trim(), role, status, phone || null, notes || null);

  const newUserId = Number(result.lastInsertRowid);

  // If created as creator, initialize creator profile
  if (role === 'creator') {
    db.prepare(`
      INSERT INTO creator_profiles (user_id, alias, bio, games, platforms, hourly_rate_internal, fixed_rate_internal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newUserId,
      alias || full_name,
      bio || 'Creador oficial de PMForgeX.',
      JSON.stringify(games || ['Metin2']),
      JSON.stringify(platforms || ['Twitch']),
      parseFloat(hourly_rate_internal || 0),
      parseFloat(fixed_rate_internal || 0)
    );
  }

  logAudit(req.user.id, 'USER_CREATED', 'users', newUserId, { email, role, full_name }, req);

  return res.status(201).json({
    id: newUserId,
    email,
    full_name,
    role,
    status
  });
}

function updateUser(req, res) {
  const targetId = parseInt(req.params.id, 10);
  const { full_name, role, status, phone, notes, password } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(targetId);
  if (!existing) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  // Super admin protection check
  if (targetId === 1) {
    if (status && status !== 'active') {
      return res.status(400).json({ error: 'La cuenta principal de Super Admin no puede ser suspendida.' });
    }
    if (role && role !== 'super_admin') {
      return res.status(400).json({ error: 'El rol de Super Admin no puede ser degradado.' });
    }
  }

  let updateFields = [];
  let params = [];

  if (full_name) {
    updateFields.push('full_name = ?');
    params.push(full_name.trim());
  }
  if (role) {
    updateFields.push('role = ?');
    params.push(role);
  }
  if (status) {
    updateFields.push('status = ?');
    params.push(status);
  }
  if (phone !== undefined) {
    updateFields.push('phone = ?');
    params.push(phone);
  }
  if (notes !== undefined) {
    updateFields.push('notes = ?');
    params.push(notes);
  }
  if (password && password.length >= 6) {
    updateFields.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(targetId);

  db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

  logAudit(req.user.id, 'USER_UPDATED', 'users', targetId, { fields: Object.keys(req.body) }, req);

  const updated = db.prepare('SELECT id, email, full_name, role, status, phone, notes FROM users WHERE id = ?').get(targetId);
  return res.json(updated);
}

function deleteUser(req, res) {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === 1) {
    return res.status(400).json({ error: 'La cuenta de Super Admin principal está protegida y no puede ser eliminada.' });
  }

  const existing = db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(targetId);
  if (!existing) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  // Soft delete to maintain audit logs and historical references
  db.prepare("UPDATE users SET deleted_at = CURRENT_TIMESTAMP, status = 'suspended' WHERE id = ?").run(targetId);

  logAudit(req.user.id, 'USER_SOFT_DELETED', 'users', targetId, { email: existing.email }, req);

  return res.json({ message: 'Usuario dado de baja correctamente (borrado lógico seguro).' });
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
