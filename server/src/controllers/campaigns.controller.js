const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

function getCampaigns(req, res) {
  const { role, id: userId } = req.user;

  let query = `
    SELECT 
      c.id, c.name, c.server_id, c.pm_user_id, c.status, c.start_date, c.end_date,
      c.objective, c.requirements, c.budget_internal, c.notes, c.created_at,
      s.name as server_name, s.game as server_game, s.logo_url as server_logo,
      s.owner_user_id,
      pm.full_name as pm_name, pm.email as pm_email,
      (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id = c.id) as creators_count,
      (SELECT COUNT(*) FROM activity_evidences ae WHERE ae.campaign_id = c.id) as total_evidences_count,
      (SELECT COUNT(*) FROM activity_evidences ae WHERE ae.campaign_id = c.id AND ae.status = 'approved') as approved_evidences_count,
      (SELECT COALESCE(SUM(ae.total_views), 0) FROM activity_evidences ae WHERE ae.campaign_id = c.id AND ae.status = 'approved') as campaign_views,
      (SELECT COALESCE(SUM(ae.duration_minutes), 0) FROM activity_evidences ae WHERE ae.campaign_id = c.id AND ae.status = 'approved') as campaign_duration_minutes
    FROM campaigns c
    JOIN servers s ON c.server_id = s.id
    LEFT JOIN users pm ON c.pm_user_id = pm.id
    WHERE c.deleted_at IS NULL AND s.deleted_at IS NULL
  `;
  const params = [];

  if (role === 'pm') {
    query += ' AND (c.pm_user_id = ? OR s.pm_user_id = ?)';
    params.push(userId, userId);
  } else if (role === 'server_owner') {
    query += ' AND s.owner_user_id = ?';
    params.push(userId);
  } else if (role === 'creator') {
    query += ' AND c.id IN (SELECT campaign_id FROM campaign_creators WHERE creator_id = ?)';
    params.push(userId);
  }

  query += ' ORDER BY c.id DESC';

  const campaigns = db.prepare(query).all(...params);

  // Attach participating creators
  const enriched = campaigns.map(c => {
    const creators = db.prepare(`
      SELECT 
        u.id as user_id,
        cp.alias, cp.avatar_url,
        cc.agreement_terms, cc.payout_internal, cc.assigned_at
      FROM campaign_creators cc
      JOIN users u ON cc.creator_id = u.id
      LEFT JOIN creator_profiles cp ON u.id = cp.user_id
      WHERE cc.campaign_id = ?
    `).all(c.id);

    const result = {
      ...c,
      creators: creators.map(cr => {
        // Strip internal payout for server owner and other creators
        if (role === 'server_owner' || (role === 'creator' && cr.user_id !== userId)) {
          delete cr.payout_internal;
        }
        return cr;
      })
    };

    // Strip internal budget for server owner and creators
    if (role === 'server_owner' || role === 'creator') {
      delete result.budget_internal;
    }

    return result;
  });

  return res.json(enriched);
}

function createCampaign(req, res) {
  const { role, id: userId } = req.user;
  const { name, server_id, pm_user_id, status = 'active', start_date, end_date, objective, requirements, budget_internal, notes } = req.body;

  if (!name || !server_id) {
    return res.status(400).json({ error: 'El nombre de la campaña y el servidor son obligatorios.' });
  }

  // If PM is creating, verify server belongs to PM
  const server = db.prepare('SELECT * FROM servers WHERE id = ? AND deleted_at IS NULL').get(server_id);
  if (!server) {
    return res.status(404).json({ error: 'Servidor no encontrado.' });
  }

  if (role === 'pm' && server.pm_user_id !== userId) {
    return res.status(403).json({ error: 'No tienes permiso para crear campañas en este servidor.' });
  }

  const assignedPm = role === 'pm' ? userId : (pm_user_id || server.pm_user_id || null);

  const result = db.prepare(`
    INSERT INTO campaigns (name, server_id, pm_user_id, status, start_date, end_date, objective, requirements, budget_internal, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    server_id,
    assignedPm,
    status,
    start_date || null,
    end_date || null,
    objective || null,
    requirements || null,
    budget_internal ? parseFloat(budget_internal) : 0,
    notes || null
  );

  const campaignId = Number(result.lastInsertRowid);

  logAudit(userId, 'CAMPAIGN_CREATED', 'campaigns', campaignId, { name, serverId: server_id }, req);

  return res.status(201).json({ id: campaignId, name, server_id, status });
}

function updateCampaign(req, res) {
  const campaignId = parseInt(req.params.id, 10);
  const { name, status, start_date, end_date, objective, requirements, budget_internal, notes } = req.body;

  const existing = db.prepare('SELECT * FROM campaigns WHERE id = ? AND deleted_at IS NULL').get(campaignId);
  if (!existing) {
    return res.status(404).json({ error: 'Campaña no encontrada.' });
  }

  db.prepare(`
    UPDATE campaigns
    SET name = COALESCE(?, name),
        status = COALESCE(?, status),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        objective = COALESCE(?, objective),
        requirements = COALESCE(?, requirements),
        budget_internal = COALESCE(?, budget_internal),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    status || null,
    start_date || null,
    end_date || null,
    objective || null,
    requirements || null,
    budget_internal !== undefined ? parseFloat(budget_internal) : null,
    notes || null,
    campaignId
  );

  logAudit(req.user.id, 'CAMPAIGN_UPDATED', 'campaigns', campaignId, { name: existing.name }, req);

  return res.json({ message: 'Campaña actualizada exitosamente.' });
}

function assignCreatorToCampaign(req, res) {
  const campaignId = parseInt(req.params.id, 10);
  const { creator_id, agreement_terms, payout_internal } = req.body;

  if (!creator_id) {
    return res.status(400).json({ error: 'creator_id es obligatorio.' });
  }

  const existing = db.prepare('SELECT id FROM campaign_creators WHERE campaign_id = ? AND creator_id = ?').get(campaignId, creator_id);
  if (existing) {
    db.prepare(`
      UPDATE campaign_creators 
      SET agreement_terms = ?, payout_internal = ? 
      WHERE id = ?
    `).run(agreement_terms || null, payout_internal || 0, existing.id);
  } else {
    db.prepare(`
      INSERT INTO campaign_creators (campaign_id, creator_id, agreement_terms, payout_internal)
      VALUES (?, ?, ?, ?)
    `).run(campaignId, creator_id, agreement_terms || null, payout_internal || 0);
  }

  // Notify creator
  const campaign = db.prepare('SELECT name FROM campaigns WHERE id = ?').get(campaignId);
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    creator_id,
    'Nueva Campaña Asignada',
    `Has sido incorporado a la campaña "${campaign.name}". Consulta los requisitos y actividades pendientes.`,
    'info',
    '/dashboard/creator?tab=campaigns'
  );

  logAudit(req.user.id, 'CREATOR_ASSIGNED_TO_CAMPAIGN', 'campaign_creators', campaignId, { creatorId: creator_id }, req);

  return res.json({ message: 'Creador asignado a la campaña con éxito.' });
}

function removeCreatorFromCampaign(req, res) {
  const campaignId = parseInt(req.params.id, 10);
  const creatorId = parseInt(req.params.creatorId, 10);

  db.prepare('DELETE FROM campaign_creators WHERE campaign_id = ? AND creator_id = ?').run(campaignId, creatorId);

  logAudit(req.user.id, 'CREATOR_REMOVED_FROM_CAMPAIGN', 'campaign_creators', campaignId, { creatorId }, req);

  return res.json({ message: 'Creador desvinculado de la campaña.' });
}

module.exports = {
  getCampaigns,
  createCampaign,
  updateCampaign,
  assignCreatorToCampaign,
  removeCreatorFromCampaign
};
