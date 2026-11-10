const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../middleware/rbac');
const { sendOtpEmail } = require('../services/email.service');

// Secret for temporary 2FA exchange tokens
const TWO_FACTOR_SECRET = JWT_SECRET + '_2fa_stage';

function login(req, res) {
  const { email, username, identifier, password } = req.body;
  const loginId = (identifier || username || email || '').trim();

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Debe ingresar su usuario o correo y su contraseña.' });
  }

  // Find user by either username OR email (case-insensitive)
  const user = db.prepare(`
    SELECT * FROM users 
    WHERE (LOWER(email) = LOWER(?) OR (username IS NOT NULL AND LOWER(username) = LOWER(?))) 
      AND deleted_at IS NULL
  `).get(loginId, loginId);

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

  // Generate 6-digit numeric OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  // Valid for 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Save OTP code in database (cleaning any previous unused OTP for this user)
  db.prepare('DELETE FROM login_otps WHERE user_id = ?').run(user.id);
  db.prepare(`
    INSERT INTO login_otps (user_id, otp_code, expires_at, used)
    VALUES (?, ?, ?, 0)
  `).run(user.id, otpCode, expiresAt);

  // Send verification code to user's registered email
  sendOtpEmail({
    toEmail: user.email,
    username: user.username || user.full_name,
    otpCode
  });

  // Issue temporary signed token valid for 10 minutes to verify the 2FA step
  const tempToken = jwt.sign(
    { id: user.id, stage: '2fa_pending' },
    TWO_FACTOR_SECRET,
    { expiresIn: '10m' }
  );

  // Mask user email for privacy (e.g. ad***n@pmforgex.com)
  const emailParts = user.email.split('@');
  const maskedName = emailParts[0].length <= 2 
    ? emailParts[0][0] + '***' 
    : emailParts[0].slice(0, 2) + '***' + emailParts[0].slice(-1);
  const maskedEmail = `${maskedName}@${emailParts[1]}`;

  return res.json({
    requires_2fa: true,
    temp_token: tempToken,
    masked_email: maskedEmail,
    username: user.username || user.email,
    dev_otp: otpCode // Provided in dev response so testers/admins have immediate access
  });
}

function verify2FA(req, res) {
  const { temp_token, otp_code } = req.body;

  if (!temp_token || !otp_code) {
    return res.status(400).json({ error: 'Debe ingresar el código de verificación.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(temp_token, TWO_FACTOR_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'La sesión de verificación ha expirado. Por favor inicie sesión nuevamente.' });
  }

  const userId = decoded.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(userId);
  if (!user || user.status === 'suspended') {
    return res.status(403).json({ error: 'Usuario no autorizado o cuenta inactiva.' });
  }

  // Check OTP record
  const otpRecord = db.prepare(`
    SELECT * FROM login_otps 
    WHERE user_id = ? AND otp_code = ? AND used = 0
    ORDER BY id DESC LIMIT 1
  `).get(userId, otp_code.trim());

  if (!otpRecord) {
    return res.status(401).json({ error: 'El código ingresado es incorrecto.' });
  }

  if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
    return res.status(401).json({ error: 'El código ha caducado. Solicite uno nuevo.' });
  }

  // Mark OTP as used
  db.prepare('UPDATE login_otps SET used = 1 WHERE id = ?').run(otpRecord.id);

  // Issue official 24h JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Load creator profile if creator
  let creatorProfile = null;
  if (user.role === 'creator') {
    creatorProfile = db.prepare('SELECT * FROM creator_profiles WHERE user_id = ?').get(user.id);
  }

  logAudit(user.id, 'LOGIN_SUCCESS_2FA', 'users', user.id, { 
    email: user.email, 
    username: user.username, 
    role: user.role 
  }, req);

  const safeUser = {
    id: user.id,
    username: user.username,
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

function resend2FA(req, res) {
  const { temp_token } = req.body;

  if (!temp_token) {
    return res.status(400).json({ error: 'Token temporal no proporcionado.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(temp_token, TWO_FACTOR_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'La sesión ha expirado. Inicie sesión nuevamente.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(decoded.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare('DELETE FROM login_otps WHERE user_id = ?').run(user.id);
  db.prepare(`
    INSERT INTO login_otps (user_id, otp_code, expires_at, used)
    VALUES (?, ?, ?, 0)
  `).run(user.id, otpCode, expiresAt);

  sendOtpEmail({
    toEmail: user.email,
    username: user.username || user.full_name,
    otpCode
  });

  return res.json({
    success: true,
    message: 'Nuevo código de verificación enviado a su correo.',
    dev_otp: otpCode
  });
}

function getMe(req, res) {
  let creatorProfile = null;
  if (req.user.role === 'creator') {
    creatorProfile = db.prepare('SELECT * FROM creator_profiles WHERE user_id = ?').get(req.user.id);
  }

  const userRecord = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);

  return res.json({
    user: {
      ...req.user,
      username: userRecord ? userRecord.username : null,
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

  return res.json({ message: 'Contraseña actualizada con éxito.' });
}

module.exports = {
  login,
  verify2FA,
  resend2FA,
  getMe,
  changePassword
};
