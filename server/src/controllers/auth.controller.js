const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../middleware/rbac');

function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Debe ingresar correo y contraseña.' });
  }

  const user = db.prepare(`
    SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL
  `).get(email.trim());

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ 
      error: 'Su cuenta se encuentra suspendida. Contacte a la administración de PMForgeX.' 
    });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  // Generate JWT token (expires in 24 hours)
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Load creator profile if creator
  let creatorProfile = null;
  if (user.role === 'creator') {
    creatorProfile = db.prepare('SELECT * FROM creator_profiles WHERE user_id = ?').get(user.id);
  }

  logAudit(user.id, 'LOGIN_SUCCESS', 'users', user.id, { email: user.email, role: user.role }, req);

  const safeUser = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    status: user.status,
    phone: user.phone,
    creator_profile: creatorProfile
  };

  return res.json({
    token,
    user: safeUser
  });
}

function getMe(req, res) {
  let creatorProfile = null;
  if (req.user.role === 'creator') {
    creatorProfile = db.prepare('SELECT * FROM creator_profiles WHERE user_id = ?').get(req.user.id);
  }

  return res.json({
    user: {
      ...req.user,
      creator_profile: creatorProfile
    }
  });
}

function changePassword(req, res) {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Debe ingresar la contraseña actual y la nueva contraseña.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(newHash, req.user.id);

  logAudit(req.user.id, 'PASSWORD_CHANGED', 'users', req.user.id, {}, req);

  return res.json({ message: 'Contraseña actualizada correctamente.' });
}

module.exports = {
  login,
  getMe,
  changePassword
};
