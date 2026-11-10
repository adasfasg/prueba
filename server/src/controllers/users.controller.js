const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

function getUsers(req, res) {
  const { role, status, search } = req.query;

  let query = `
    SELECT 
      u.id, u.username, u.email, u.full_name, u.role, u.status, u.phone, u.notes, u.created_at,
      cp.id as creator_profile_id,
      cp.alias as creator_alias,
      cp.avatar_url as creator_avatar_url,
      cp.bio as creator_bio,
      cp.games as creator_games,
      cp.platforms as creator_platforms,
      cp.social_links as creator_social_links,
      cp.is_available as creator_is_available,
      cp.hourly_rate_internal,
      cp.fixed_rate_internal,
      cp.commission_percentage,
      (SELECT COUNT(*) FROM servers s WHERE s.pm_user_id = u.id AND s.deleted_at IS NULL) as pm_servers_count,
      (SELECT COUNT(*) FROM campaigns c WHERE c.pm_user_id = u.id AND c.deleted_at IS NULL AND c.status = 'active') as pm_campaigns_count,
      (SELECT COUNT(*) FROM server_creators sc WHERE sc.creator_id = u.id AND sc.status = 'active') as creator_servers_count,
      (SELECT COUNT(DISTINCT cc.campaign_id) FROM campaign_creators cc WHERE cc.creator_id = u.id) as creator_campaigns_count,
      (SELECT COALESCE(SUM(ae.duration_minutes), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status IN ('approved', 'paid')) as total_minutes_streamed,
      (SELECT COALESCE(SUM(ae.total_views), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status IN ('approved', 'paid')) as total_views_accumulated
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
    query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.username LIKE ? OR cp.alias LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY u.id ASC';

  const users = db.prepare(query).all(...params);

  const formatted = users.map(u => {
    let games = [];
    let platforms = [];
    let social_links = {};

    try {
      if (u.creator_games) {
        const parsed = typeof u.creator_games === 'string' ? JSON.parse(u.creator_games) : u.creator_games;
        games = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      games = typeof u.creator_games === 'string' 
        ? u.creator_games.split(',').map(s => s.trim()).filter(Boolean) 
        : [];
    }

    try {
      if (u.creator_platforms) {
        const parsed = typeof u.creator_platforms === 'string' ? JSON.parse(u.creator_platforms) : u.creator_platforms;
        platforms = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      platforms = typeof u.creator_platforms === 'string' 
        ? u.creator_platforms.split(',').map(s => s.trim()).filter(Boolean) 
        : [];
    }

    try {
      if (u.creator_social_links) {
        const parsed = typeof u.creator_social_links === 'string' ? JSON.parse(u.creator_social_links) : u.creator_social_links;
        social_links = typeof parsed === 'object' && parsed !== null ? parsed : {};
      }
    } catch (e) {
      social_links = {};
    }

    return {
      ...u,
      creator_games: games,
      creator_platforms: platforms,
      creator_social_links: social_links,
      total_hours_streamed: (u.total_minutes_streamed / 60).toFixed(1)
    };
  });

  return res.json(formatted);
}

function createUser(req, res) {
  const { 
    username, email, password, full_name, role, status = 'active', phone, notes,
    // Optional creator details
    alias, bio, games, platforms, hourly_rate_internal, fixed_rate_internal
  } = req.body;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Email, contraseña, nombre completo y rol son obligatorios.' });
  }

  const targetUsername = username ? username.trim().toLowerCase() : email.split('@')[0].toLowerCase();

  if (!/^[a-zA-Z0-9._-]+$/.test(targetUsername)) {
    return res.status(400).json({ error: 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.' });
  }

  // Check unique email and username
  const existing = db.prepare('SELECT id, deleted_at FROM users WHERE LOWER(email) = LOWER(?) OR (username IS NOT NULL AND LOWER(username) = LOWER(?))').get(email.trim(), targetUsername);
  if (existing) {
    if (existing.deleted_at !== null) {
      return res.status(400).json({ error: 'Ya existe un usuario histórico dado de baja con este correo o usuario. Debe reactivarlo o utilizar otro.' });
    }
    return res.status(400).json({ error: 'Ya existe una cuenta con este correo o nombre de usuario.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, role, status, phone, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(targetUsername, email.trim(), passwordHash, full_name.trim(), role, status, phone || null, notes || null);

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

  logAudit(req.user.id, 'USER_CREATED', 'users', newUserId, { username: targetUsername, email, role, full_name }, req);

  return res.status(201).json({
    id: newUserId,
    username: targetUsername,
    email,
    full_name,
    role,
    status
  });
}

function updateUser(req, res) {
  const targetId = parseInt(req.params.id, 10);
  const { 
    username, full_name, email, role, status, phone, notes, password,
    // Creator profile updates (Admin exclusive)
    alias, bio, games, platforms, social_links, is_available,
    hourly_rate_internal, fixed_rate_internal, commission_percentage, avatar_url
  } = req.body;

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

  // Username unique check if changing
  if (username && username.trim().toLowerCase() !== (existing.username || '').toLowerCase()) {
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.' });
    }
    const usernameConflict = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ? AND deleted_at IS NULL').get(cleanUsername, targetId);
    if (usernameConflict) {
      return res.status(400).json({ error: 'Ya existe otro usuario con este nombre de usuario.' });
    }
    updateFields.push('username = ?');
    params.push(cleanUsername);
  }

  // Email unique check if changing
  if (email && email.trim().toLowerCase() !== existing.email.toLowerCase()) {
    const emailConflict = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ? AND deleted_at IS NULL').get(email.trim(), targetId);
    if (emailConflict) {
      return res.status(400).json({ error: 'Ya existe otro usuario con este correo electrónico.' });
    }
  }

  if (full_name) {
    updateFields.push('full_name = ?');
    params.push(full_name.trim());
  }
  if (email) {
    updateFields.push('email = ?');
    params.push(email.trim().toLowerCase());
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
    params.push(phone ? phone.trim() : null);
  }
  if (notes !== undefined) {
    updateFields.push('notes = ?');
    params.push(notes ? notes.trim() : null);
  }
  if (password && password.length >= 6) {
    updateFields.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
  }

  if (updateFields.length > 0) {
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(targetId);
    db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);
  }

  // Sincronizar creator_profiles si el usuario es creador o se envían datos de creador
  const effectiveRole = role || existing.role;
  if (effectiveRole === 'creator') {
    const cpExisting = db.prepare('SELECT id FROM creator_profiles WHERE user_id = ?').get(targetId);
    if (cpExisting) {
      let cpFields = [];
      let cpParams = [];

      if (alias !== undefined) { cpFields.push('alias = ?'); cpParams.push(alias ? alias.trim() : (full_name || existing.full_name)); }
      if (avatar_url !== undefined) { cpFields.push('avatar_url = ?'); cpParams.push(avatar_url); }
      if (bio !== undefined) { cpFields.push('bio = ?'); cpParams.push(bio); }
      if (games !== undefined) { 
        cpFields.push('games = ?'); 
        cpParams.push(Array.isArray(games) ? JSON.stringify(games) : JSON.stringify(games.split(',').map(s=>s.trim()).filter(Boolean))); 
      }
      if (platforms !== undefined) { 
        cpFields.push('platforms = ?'); 
        cpParams.push(Array.isArray(platforms) ? JSON.stringify(platforms) : JSON.stringify(platforms.split(',').map(s=>s.trim()).filter(Boolean))); 
      }
      if (social_links !== undefined) { 
        cpFields.push('social_links = ?'); 
        cpParams.push(typeof social_links === 'object' ? JSON.stringify(social_links) : social_links); 
      }
      if (is_available !== undefined) { cpFields.push('is_available = ?'); cpParams.push(is_available ? 1 : 0); }
      if (hourly_rate_internal !== undefined) { cpFields.push('hourly_rate_internal = ?'); cpParams.push(parseFloat(hourly_rate_internal) || 0); }
      if (fixed_rate_internal !== undefined) { cpFields.push('fixed_rate_internal = ?'); cpParams.push(parseFloat(fixed_rate_internal) || 0); }
      if (commission_percentage !== undefined) { cpFields.push('commission_percentage = ?'); cpParams.push(parseFloat(commission_percentage) || 0); }

      if (cpFields.length > 0) {
        cpFields.push('updated_at = CURRENT_TIMESTAMP');
        cpParams.push(cpExisting.id);
        db.prepare(`UPDATE creator_profiles SET ${cpFields.join(', ')} WHERE id = ?`).run(...cpParams);
      }
    } else if (alias || hourly_rate_internal !== undefined || fixed_rate_internal !== undefined || bio || games) {
      db.prepare(`
        INSERT INTO creator_profiles (user_id, alias, avatar_url, bio, games, platforms, social_links, is_available, hourly_rate_internal, fixed_rate_internal, commission_percentage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        targetId,
        alias || full_name || existing.full_name,
        avatar_url || null,
        bio || 'Creador oficial de PMForgeX.',
        JSON.stringify(Array.isArray(games) ? games : ['Metin2']),
        JSON.stringify(Array.isArray(platforms) ? platforms : ['Twitch']),
        JSON.stringify(typeof social_links === 'object' ? social_links : {}),
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
        parseFloat(hourly_rate_internal) || 0,
        parseFloat(fixed_rate_internal) || 0,
        parseFloat(commission_percentage) || 0
      );
    }
  }

  logAudit(req.user.id, 'USER_UPDATED', 'users', targetId, { fields: Object.keys(req.body) }, req);

  const updated = db.prepare(`
    SELECT 
      u.id, u.username, u.email, u.full_name, u.role, u.status, u.phone, u.notes,
      cp.alias as creator_alias, cp.avatar_url as creator_avatar_url, cp.bio as creator_bio,
      cp.games as creator_games, cp.platforms as creator_platforms, cp.is_available as creator_is_available,
      cp.hourly_rate_internal, cp.fixed_rate_internal, cp.commission_percentage
    FROM users u
    LEFT JOIN creator_profiles cp ON u.id = cp.user_id
    WHERE u.id = ?
  `).get(targetId);

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
