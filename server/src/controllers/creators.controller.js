const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

function getPrivateCreators(req, res) {
  const { role, id: userId } = req.user;
  const { scope = 'all', search } = req.query;

  let query = `
    SELECT 
      cp.id,
      cp.user_id,
      u.username,
      u.email,
      u.full_name,
      u.status as account_status,
      u.phone,
      u.notes as user_notes,
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
      (SELECT COUNT(ae.id) FROM activity_evidences ae WHERE ae.creator_id = u.id) as total_evidences,
      (SELECT COUNT(ae.id) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status = 'approved') as approved_evidences,
      (SELECT COUNT(ae.id) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status = 'paid') as paid_evidences,
      (SELECT COUNT(ae.id) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status = 'review') as review_evidences,
      (SELECT COUNT(ae.id) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status = 'rejected') as rejected_evidences,
      (SELECT COALESCE(SUM(ae.duration_minutes), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status IN ('approved', 'paid')) as total_minutes_streamed,
      (SELECT COALESCE(SUM(ae.total_views), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status IN ('approved', 'paid')) as total_views_accumulated,
      (SELECT COALESCE(ROUND(AVG(ae.avg_viewers)), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status IN ('approved', 'paid')) as avg_viewers,
      (SELECT COALESCE(MAX(ae.peak_viewers), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status IN ('approved', 'paid')) as peak_viewers
    FROM creator_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE u.deleted_at IS NULL
  `;
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    query += ` AND (LOWER(cp.alias) LIKE ? OR LOWER(u.full_name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(cp.games) LIKE ? OR LOWER(cp.platforms) LIKE ?)`;
    params.push(term, term, term, term, term);
  }

  query += ' ORDER BY cp.alias ASC';

  const creators = db.prepare(query).all(...params);

  // Determinar creadores a cargo del PM
  let pmAssignedCreatorIds = new Set();
  if (role === 'pm') {
    const assignedRows = db.prepare(`
      SELECT sc.creator_id FROM server_creators sc
      JOIN servers s ON sc.server_id = s.id
      WHERE s.pm_user_id = ? AND sc.status = 'active' AND s.deleted_at IS NULL
      UNION
      SELECT cc.creator_id FROM campaign_creators cc
      JOIN campaigns c ON cc.campaign_id = c.id
      LEFT JOIN servers s ON c.server_id = s.id
      WHERE (c.pm_user_id = ? OR s.pm_user_id = ?) AND c.deleted_at IS NULL
    `).all(userId, userId, userId);

    assignedRows.forEach(r => pmAssignedCreatorIds.add(r.creator_id));
  }

  const formatted = creators.map(c => {
    let games = [];
    let platforms = [];
    let social_links = {};
    try { games = JSON.parse(c.games || '[]'); } catch (e) {}
    try { platforms = JSON.parse(c.platforms || '[]'); } catch (e) {}
    try { social_links = JSON.parse(c.social_links || '{}'); } catch (e) {}

    const isUnderCharge = (role === 'super_admin' || role === 'director_ops' || role === 'director_creators')
      ? true 
      : (role === 'pm' ? pmAssignedCreatorIds.has(c.user_id) : false);

    // Servidores donde participa el creador
    const serverDetails = db.prepare(`
      SELECT s.id, s.name, s.game, s.pm_user_id, u_pm.full_name as pm_name
      FROM server_creators sc
      JOIN servers s ON sc.server_id = s.id
      LEFT JOIN users u_pm ON s.pm_user_id = u_pm.id
      WHERE sc.creator_id = ? AND sc.status = 'active' AND s.deleted_at IS NULL
    `).all(c.user_id);

    const totalValidEvidences = c.total_evidences || 0;
    const completedEvidences = (c.approved_evidences || 0) + (c.paid_evidences || 0);
    const successRate = totalValidEvidences > 0 
      ? Math.round((completedEvidences / totalValidEvidences) * 100) 
      : 100;

    const result = {
      ...c,
      games,
      platforms,
      social_links,
      is_under_charge: isUnderCharge,
      assigned_servers: serverDetails,
      delivery_success_rate: successRate,
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

  // Filtrar si el PM solicitó únicamente 'my_creators'
  let results = formatted;
  if (scope === 'my_creators') {
    results = results.filter(c => c.is_under_charge);
  }

  return res.json(results);
}

function getCreatorEvidences(req, res) {
  const { role, id: userId } = req.user;
  const targetId = parseInt(req.params.id, 10);

  const profile = db.prepare('SELECT id, user_id, alias FROM creator_profiles WHERE id = ? OR user_id = ?').get(targetId, targetId);
  if (!profile) {
    return res.status(404).json({ error: 'Perfil de creador no encontrado.' });
  }

  const query = `
    SELECT 
      ae.id,
      ae.campaign_id,
      ae.creator_id,
      ae.type,
      ae.platform,
      ae.content_url,
      ae.activity_date,
      ae.duration_minutes,
      ae.avg_viewers,
      ae.peak_viewers,
      ae.total_views,
      ae.evidence_screenshots,
      ae.creator_notes,
      ae.internal_notes,
      ae.status,
      ae.rejection_reason,
      ae.paid_at,
      ae.payment_reference,
      c.name as campaign_name,
      s.id as server_id,
      s.name as server_name,
      s.pm_user_id
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    WHERE ae.creator_id = ?
    ORDER BY ae.activity_date DESC, ae.id DESC
  `;

  const evidences = db.prepare(query).all(profile.user_id);

  const formatted = evidences.map(ev => {
    let screenshots = [];
    try {
      screenshots = JSON.parse(ev.evidence_screenshots || '[]');
    } catch (e) {
      if (ev.evidence_screenshots) screenshots = [ev.evidence_screenshots];
    }

    const canSeeInternalNotes = role === 'super_admin' || role === 'director_ops' || (role === 'pm' && ev.pm_user_id === userId);

    return {
      ...ev,
      evidence_screenshots: screenshots,
      internal_notes: canSeeInternalNotes ? ev.internal_notes : null
    };
  });

  return res.json({
    creator_id: profile.user_id,
    profile_id: profile.id,
    alias: profile.alias,
    evidences: formatted
  });
}

function updateCreatorProfile(req, res) {
  const { role, id: userId } = req.user;
  const targetCreatorId = parseInt(req.params.id, 10);

  const existing = db.prepare('SELECT * FROM creator_profiles WHERE id = ? OR user_id = ?').get(targetCreatorId, targetCreatorId);
  if (!existing) {
    return res.status(404).json({ error: 'Perfil de creador no encontrado.' });
  }

  // 1. RBAC Check
  if (role === 'creator') {
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Solo puedes editar tu propio perfil.' });
    }
  } else if (role === 'pm') {
    // Verificar si el PM tiene a este creador a su cargo
    const underCharge = db.prepare(`
      SELECT 1 FROM server_creators sc
      JOIN servers s ON sc.server_id = s.id
      WHERE sc.creator_id = ? AND s.pm_user_id = ? AND sc.status = 'active' AND s.deleted_at IS NULL
      UNION
      SELECT cc.creator_id FROM campaign_creators cc
      JOIN campaigns c ON cc.campaign_id = c.id
      LEFT JOIN servers s ON c.server_id = s.id
      WHERE cc.creator_id = ? AND (c.pm_user_id = ? OR s.pm_user_id = ?) AND c.deleted_at IS NULL
    `).get(existing.user_id, userId, existing.user_id, userId, userId);

    if (!underCharge) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Solo puedes modificar la información de creadores asignados a tus servidores o campañas.' 
      });
    }
  } else if (role !== 'super_admin' && role !== 'director_ops' && role !== 'director_creators') {
    return res.status(403).json({ error: 'No tienes permisos para modificar este perfil.' });
  }

  const {
    alias, avatar_url, bio, games, platforms, social_links, is_available,
    phone, notes,
    hourly_rate_internal, fixed_rate_internal, commission_percentage
  } = req.body;

  let updateFields = [];
  let params = [];

  if (alias) { updateFields.push('alias = ?'); params.push(alias.trim()); }
  if (avatar_url !== undefined) { updateFields.push('avatar_url = ?'); params.push(avatar_url); }
  if (bio !== undefined) { updateFields.push('bio = ?'); params.push(bio); }
  if (games !== undefined) { 
    updateFields.push('games = ?'); 
    params.push(typeof games === 'string' ? games : JSON.stringify(games)); 
  }
  if (platforms !== undefined) { 
    updateFields.push('platforms = ?'); 
    params.push(typeof platforms === 'string' ? platforms : JSON.stringify(platforms)); 
  }
  if (social_links !== undefined) { 
    updateFields.push('social_links = ?'); 
    params.push(typeof social_links === 'string' ? social_links : JSON.stringify(social_links)); 
  }
  if (is_available !== undefined) { 
    updateFields.push('is_available = ?'); 
    params.push(is_available ? 1 : 0); 
  }

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

  if (updateFields.length > 0) {
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(existing.id);
    db.prepare(`UPDATE creator_profiles SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);
  }

  // Actualizar teléfono y notas en tabla users si fueron enviados
  let userUpdates = [];
  let userParams = [];
  if (phone !== undefined) {
    userUpdates.push('phone = ?');
    userParams.push(phone ? phone.trim() : null);
  }
  if (notes !== undefined && (role === 'super_admin' || role === 'pm')) {
    userUpdates.push('notes = ?');
    userParams.push(notes ? notes.trim() : null);
  }
  if (userUpdates.length > 0) {
    userUpdates.push('updated_at = CURRENT_TIMESTAMP');
    userParams.push(existing.user_id);
    db.prepare(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`).run(...userParams);
  }

  logAudit(userId, 'CREATOR_PROFILE_UPDATED', 'creator_profiles', existing.id, { 
    alias: alias || existing.alias,
    updated_by_role: role
  }, req);

  return res.json({ 
    message: 'Perfil de creador actualizado con éxito.',
    creator_id: existing.user_id,
    profile_id: existing.id
  });
}

module.exports = {
  getPrivateCreators,
  getCreatorEvidences,
  updateCreatorProfile
};
