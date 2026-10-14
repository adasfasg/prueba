const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

function getPrivateCreators(req, res) {
  const { role, id: userId } = req.user;

  let query = `
    SELECT 
      cp.id,
      cp.user_id,
      u.email,
      u.full_name,
      u.status as account_status,
      u.phone,
      cp.alias,
      cp.avatar_url,
      cp.bio,
      cp.games,
      cp.platforms,
      cp.social_links,
      cp.is_available,
      cp.hourly_rate_internal,
      cp.fixed_rate_internal,
      cp.commission_percentage,
      (SELECT COUNT(DISTINCT sc.server_id) FROM server_creators sc WHERE sc.creator_id = u.id AND sc.status = 'active') as assigned_servers_count,
      (SELECT COUNT(DISTINCT cc.campaign_id) FROM campaign_creators cc WHERE cc.creator_id = u.id) as assigned_campaigns_count,
      (SELECT COALESCE(SUM(ae.duration_minutes), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status = 'approved') as total_minutes_streamed,
      (SELECT COALESCE(SUM(ae.total_views), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status = 'approved') as total_views_accumulated
    FROM creator_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE u.deleted_at IS NULL
  `;
  const params = [];

  // Scoping for PM: only see creators assigned to their servers
  if (role === 'pm') {
    query += `
      AND u.id IN (
        SELECT sc.creator_id FROM server_creators sc
        JOIN servers s ON sc.server_id = s.id
        WHERE s.pm_user_id = ? AND sc.status = 'active'
      )
    `;
    params.push(userId);
  }

  query += ' ORDER BY cp.alias ASC';

  const creators = db.prepare(query).all(...params);

  const formatted = creators.map(c => {
    let games = [];
    let platforms = [];
    let social_links = {};
    try { games = JSON.parse(c.games || '[]'); } catch (e) {}
    try { platforms = JSON.parse(c.platforms || '[]'); } catch (e) {}
    try { social_links = JSON.parse(c.social_links || '{}'); } catch (e) {}

    const result = {
      ...c,
      games,
      platforms,
      social_links,
      total_hours_streamed: (c.total_minutes_streamed / 60).toFixed(1)
    };

    // Strip sensitive financials if user is NOT Super Admin
    if (role !== 'super_admin' && role !== 'director_creators') {
      delete result.hourly_rate_internal;
      delete result.fixed_rate_internal;
      delete result.commission_percentage;
    }

    return result;
  });

  return res.json(formatted);
}

function updateCreatorProfile(req, res) {
  const { role, id: userId } = req.user;
  const targetCreatorId = parseInt(req.params.id, 10);

  // If role is creator, they can ONLY update their own profile
  if (role === 'creator') {
    const myProfile = db.prepare('SELECT id FROM creator_profiles WHERE user_id = ?').get(userId);
    if (!myProfile || myProfile.id !== targetCreatorId) {
      return res.status(403).json({ error: 'Solo puedes editar tu propio perfil.' });
    }
  }

  const existing = db.prepare('SELECT * FROM creator_profiles WHERE id = ?').get(targetCreatorId);
  if (!existing) {
    return res.status(404).json({ error: 'Perfil de creador no encontrado.' });
  }

  const {
    alias, avatar_url, bio, games, platforms, social_links, is_available,
    hourly_rate_internal, fixed_rate_internal, commission_percentage
  } = req.body;

  let updateFields = [];
  let params = [];

  if (alias) { updateFields.push('alias = ?'); params.push(alias.trim()); }
  if (avatar_url !== undefined) { updateFields.push('avatar_url = ?'); params.push(avatar_url); }
  if (bio !== undefined) { updateFields.push('bio = ?'); params.push(bio); }
  if (games) { updateFields.push('games = ?'); params.push(JSON.stringify(games)); }
  if (platforms) { updateFields.push('platforms = ?'); params.push(JSON.stringify(platforms)); }
  if (social_links) { updateFields.push('social_links = ?'); params.push(JSON.stringify(social_links)); }
  if (is_available !== undefined) { updateFields.push('is_available = ?'); params.push(is_available ? 1 : 0); }

  // Only Super Admin can change internal rates
  if (role === 'super_admin') {
    if (hourly_rate_internal !== undefined) {
      updateFields.push('hourly_rate_internal = ?');
      params.push(parseFloat(hourly_rate_internal));
    }
    if (fixed_rate_internal !== undefined) {
      updateFields.push('fixed_rate_internal = ?');
      params.push(parseFloat(fixed_rate_internal));
    }
    if (commission_percentage !== undefined) {
      updateFields.push('commission_percentage = ?');
      params.push(parseFloat(commission_percentage));
    }
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(targetCreatorId);

  db.prepare(`UPDATE creator_profiles SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

  logAudit(userId, 'CREATOR_PROFILE_UPDATED', 'creator_profiles', targetCreatorId, { alias: existing.alias }, req);

  return res.json({ message: 'Perfil de creador actualizado con éxito.' });
}

module.exports = {
  getPrivateCreators,
  updateCreatorProfile
};
