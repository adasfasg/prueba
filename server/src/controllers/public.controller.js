const { db } = require('../db');

function getPublicCreators(req, res) {
  const { game, platform, available } = req.query;

  let query = `
    SELECT 
      cp.id,
      cp.alias,
      cp.avatar_url,
      cp.bio,
      cp.games,
      cp.platforms,
      cp.social_links,
      cp.is_available,
      u.created_at as member_since
    FROM creator_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE u.deleted_at IS NULL AND u.status = 'active'
  `;
  const params = [];

  if (available === 'true') {
    query += ' AND cp.is_available = 1';
  }

  const creators = db.prepare(query).all(...params);

  // Filter in-memory for JSON arrays (games, platforms)
  const filtered = creators.map(c => {
    let games = [];
    let platforms = [];
    let social_links = {};

    try { games = JSON.parse(c.games || '[]'); } catch (e) {}
    try { platforms = JSON.parse(c.platforms || '[]'); } catch (e) {}
    try { social_links = JSON.parse(c.social_links || '{}'); } catch (e) {}

    return {
      id: c.id,
      alias: c.alias,
      avatar_url: c.avatar_url,
      bio: c.bio,
      games,
      platforms,
      social_links,
      is_available: Boolean(c.is_available),
      member_since: c.member_since
    };
  }).filter(c => {
    if (game && game !== 'Todos' && !c.games.includes(game)) {
      return false;
    }
    if (platform && platform !== 'Todas' && !c.platforms.includes(platform)) {
      return false;
    }
    return true;
  });

  return res.json(filtered);
}

function getPublicStats(req, res) {
  const totalCreators = db.prepare(`
    SELECT COUNT(*) as count FROM creator_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE u.deleted_at IS NULL AND u.status = 'active'
  `).get().count;

  const totalServers = db.prepare(`
    SELECT COUNT(*) as count FROM servers WHERE deleted_at IS NULL AND status = 'active'
  `).get().count;

  const streamMetrics = db.prepare(`
    SELECT 
      COALESCE(SUM(duration_minutes), 0) as total_minutes,
      COALESCE(SUM(total_views), 0) as total_views,
      COALESCE(MAX(peak_viewers), 0) as peak_viewers
    FROM activity_evidences
    WHERE status = 'approved'
  `).get();

  return res.json({
    total_creators: totalCreators,
    total_servers: totalServers,
    total_stream_hours: Math.round(streamMetrics.total_minutes / 60),
    total_views: streamMetrics.total_views,
    peak_viewers: streamMetrics.peak_viewers,
    ecosystems: ['Metin2', 'MU Online', 'Minecraft', 'Lineage II', 'GTA RP']
  });
}

function submitContact(req, res) {
  const { name, email, server_name, message, game, contact_type } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Nombre, email y mensaje son campos obligatorios.' });
  }

  // Create an admin notification for the new inquiry
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    1, // Super Admin
    `Nuevo Contacto de Servidor: ${server_name || name}`,
    `Contacto recibido de ${name} (${email}). Juego: ${game || 'Metin2'}. Mensaje: ${message.substring(0, 150)}...`,
    'info',
    '/dashboard/admin?tab=servers'
  );

  return res.json({
    success: true,
    message: 'Mensaje recibido con éxito. El equipo comercial de PMForgeX te responderá a la brevedad.'
  });
}

module.exports = {
  getPublicCreators,
  getPublicStats,
  submitContact
};
