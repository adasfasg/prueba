const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

function getServers(req, res) {
  const { role, id: userId } = req.user;

  let query = `
    SELECT 
      s.id, s.name, s.game, s.status, s.contact_info, s.logo_url, s.website_url, s.notes, s.created_at,
      s.owner_user_id,
      owner.full_name as owner_name, owner.email as owner_email,
      s.pm_user_id,
      pm.full_name as pm_name, pm.email as pm_email,
      (SELECT COUNT(*) FROM server_creators sc WHERE sc.server_id = s.id AND sc.status = 'active') as active_creators_count,
      (SELECT COUNT(*) FROM campaigns c WHERE c.server_id = s.id AND c.deleted_at IS NULL AND c.status = 'active') as active_campaigns_count
    FROM servers s
    LEFT JOIN users owner ON s.owner_user_id = owner.id
    LEFT JOIN users pm ON s.pm_user_id = pm.id
    WHERE s.deleted_at IS NULL
  `;
  const params = [];

  // Role scoping:
  if (role === 'pm') {
    query += ' AND s.pm_user_id = ?';
    params.push(userId);
  } else if (role === 'server_owner') {
    query += ' AND s.owner_user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY s.id DESC';

  const servers = db.prepare(query).all(...params);

  // Attach creator details for each server
  const enriched = servers.map(server => {
    const creators = db.prepare(`
      SELECT 
        u.id as creator_user_id,
        cp.alias, cp.avatar_url, cp.games, cp.platforms, cp.is_available,
        sc.assigned_at
      FROM server_creators sc
      JOIN users u ON sc.creator_id = u.id
      LEFT JOIN creator_profiles cp ON u.id = cp.user_id
      WHERE sc.server_id = ? AND sc.status = 'active' AND u.deleted_at IS NULL
    `).all(server.id);

    return {
      ...server,
      creators: creators.map(c => {
        let platforms = [];
        try { platforms = JSON.parse(c.platforms || '[]'); } catch (e) {}
        return { ...c, platforms };
      })
    };
  });

  return res.json(enriched);
}

function createServer(req, res) {
  const { name, game = 'Metin2', status = 'active', contact_info, owner_user_id, pm_user_id, logo_url, website_url, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nombre del servidor es obligatorio.' });
  }

  const result = db.prepare(`
    INSERT INTO servers (name, game, status, contact_info, owner_user_id, pm_user_id, logo_url, website_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    game,
    status,
    contact_info || null,
    owner_user_id ? parseInt(owner_user_id, 10) : null,
    pm_user_id ? parseInt(pm_user_id, 10) : null,
    logo_url || null,
    website_url || null,
    notes || null
  );

  const serverId = Number(result.lastInsertRowid);

  // If PM is assigned, notify PM
  if (pm_user_id) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      pm_user_id,
      'Nuevo Servidor Asignado',
      `Has sido asignado como PM del servidor "${name}".`,
      'info',
      '/dashboard/pm?tab=servers'
    );
  }

  logAudit(req.user.id, 'SERVER_CREATED', 'servers', serverId, { name, game, pm_user_id }, req);

  return res.status(201).json({ id: serverId, name, game, status });
}

function updateServer(req, res) {
  const serverId = parseInt(req.params.id, 10);
  const { name, game, status, contact_info, owner_user_id, pm_user_id, logo_url, website_url, notes } = req.body;

  const existing = db.prepare('SELECT * FROM servers WHERE id = ? AND deleted_at IS NULL').get(serverId);
  if (!existing) {
    return res.status(404).json({ error: 'Servidor no encontrado.' });
  }

  db.prepare(`
    UPDATE servers 
    SET name = COALESCE(?, name),
        game = COALESCE(?, game),
        status = COALESCE(?, status),
        contact_info = COALESCE(?, contact_info),
        owner_user_id = ?,
        pm_user_id = ?,
        logo_url = COALESCE(?, logo_url),
        website_url = COALESCE(?, website_url),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    game || null,
    status || null,
    contact_info || null,
    owner_user_id ? parseInt(owner_user_id, 10) : null,
    pm_user_id ? parseInt(pm_user_id, 10) : null,
    logo_url || null,
    website_url || null,
    notes || null,
    serverId
  );

  // Notify new PM if assignment changed
  if (pm_user_id && pm_user_id !== existing.pm_user_id) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      pm_user_id,
      'Asignación de Servidor',
      `Se te ha asignado la gestión del servidor "${existing.name}".`,
      'info',
      '/dashboard/pm?tab=servers'
    );
  }

  logAudit(req.user.id, 'SERVER_UPDATED', 'servers', serverId, { name: existing.name }, req);

  return res.json({ message: 'Servidor actualizado correctamente.' });
}

function deleteServer(req, res) {
  const serverId = parseInt(req.params.id, 10);

  const existing = db.prepare('SELECT * FROM servers WHERE id = ? AND deleted_at IS NULL').get(serverId);
  if (!existing) {
    return res.status(404).json({ error: 'Servidor no encontrado.' });
  }

  // Soft delete
  db.prepare('UPDATE servers SET deleted_at = CURRENT_TIMESTAMP, status = "suspended" WHERE id = ?').run(serverId);

  logAudit(req.user.id, 'SERVER_SOFT_DELETED', 'servers', serverId, { name: existing.name }, req);

  return res.json({ message: 'Servidor dado de baja correctamente.' });
}

function assignCreatorToServer(req, res) {
  const serverId = parseInt(req.params.id, 10);
  const { creator_id } = req.body;

  if (!creator_id) {
    return res.status(400).json({ error: 'creator_id es requerido.' });
  }

  const existing = db.prepare('SELECT id FROM server_creators WHERE server_id = ? AND creator_id = ?').get(serverId, creator_id);
  if (existing) {
    db.prepare("UPDATE server_creators SET status = 'active' WHERE id = ?").run(existing.id);
  } else {
    db.prepare("INSERT INTO server_creators (server_id, creator_id, status) VALUES (?, ?, 'active')").run(serverId, creator_id);
  }

  logAudit(req.user.id, 'CREATOR_ASSIGNED_TO_SERVER', 'server_creators', serverId, { creatorId: creator_id }, req);

  return res.json({ message: 'Creador asignado al servidor exitosamente.' });
}

function removeCreatorFromServer(req, res) {
  const serverId = parseInt(req.params.id, 10);
  const creatorId = parseInt(req.params.creatorId, 10);

  db.prepare("UPDATE server_creators SET status = 'inactive' WHERE server_id = ? AND creator_id = ?").run(serverId, creatorId);

  logAudit(req.user.id, 'CREATOR_REMOVED_FROM_SERVER', 'server_creators', serverId, { creatorId }, req);

  return res.json({ message: 'Creador desvinculado del servidor.' });
}

module.exports = {
  getServers,
  createServer,
  updateServer,
  deleteServer,
  assignCreatorToServer,
  removeCreatorFromServer
};
