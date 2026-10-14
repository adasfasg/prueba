const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

function getEvidences(req, res) {
  const { role, id: userId } = req.user;
  const { campaign_id, status } = req.query;

  let query = `
    SELECT 
      ae.id, ae.campaign_id, ae.creator_id, ae.type, ae.platform, ae.content_url,
      ae.activity_date, ae.duration_minutes, ae.avg_viewers, ae.peak_viewers, ae.total_views,
      ae.evidence_screenshots, ae.creator_notes, ae.internal_notes, ae.status, ae.rejection_reason,
      ae.reviewed_by_user_id, ae.reviewed_at, ae.created_at,
      c.name as campaign_name,
      s.id as server_id, s.name as server_name, s.game as server_game, s.logo_url as server_logo,
      s.owner_user_id, s.pm_user_id,
      cp.alias as creator_alias, cp.avatar_url as creator_avatar,
      reviewer.full_name as reviewer_name
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    LEFT JOIN creator_profiles cp ON ae.creator_id = cp.user_id
    LEFT JOIN users reviewer ON ae.reviewed_by_user_id = reviewer.id
    WHERE c.deleted_at IS NULL AND s.deleted_at IS NULL
  `;
  const params = [];

  // Scoping according to RBAC:
  if (role === 'creator') {
    query += ' AND ae.creator_id = ?';
    params.push(userId);
  } else if (role === 'pm') {
    query += ' AND (s.pm_user_id = ? OR c.pm_user_id = ?)';
    params.push(userId, userId);
  } else if (role === 'server_owner') {
    // Server Owner ONLY sees approved evidences for their server!
    query += " AND s.owner_user_id = ? AND ae.status = 'approved'";
    params.push(userId);
  }

  if (campaign_id) {
    query += ' AND ae.campaign_id = ?';
    params.push(parseInt(campaign_id, 10));
  }

  if (status && role !== 'server_owner') {
    query += ' AND ae.status = ?';
    params.push(status);
  }

  query += ' ORDER BY ae.activity_date DESC, ae.id DESC';

  const evidences = db.prepare(query).all(...params);

  // Sanitization: hide internal_notes from Server Owner and Creator
  const sanitized = evidences.map(ev => {
    let screenshots = [];
    try { screenshots = JSON.parse(ev.evidence_screenshots || '[]'); } catch (e) {}

    const item = {
      ...ev,
      evidence_screenshots: screenshots
    };

    if (role === 'server_owner' || role === 'creator') {
      delete item.internal_notes;
    }

    return item;
  });

  return res.json(sanitized);
}

function createEvidence(req, res) {
  const { role, id: userId } = req.user;
  const {
    campaign_id, type = 'stream', platform = 'Twitch', content_url,
    activity_date, duration_minutes = 0, avg_viewers = 0, peak_viewers = 0,
    total_views = 0, creator_notes
  } = req.body;

  if (!campaign_id || !content_url || !activity_date) {
    return res.status(400).json({ error: 'La campaña, el enlace de contenido y la fecha son obligatorios.' });
  }

  // MODIFICACIÓN: Procesar si se adjuntó un archivo físico con multer o viene por texto
  let screenshotsArray = [];
  if (req.file) {
    screenshotsArray = [`/uploads/${req.file.filename}`];
  } else if (req.body.evidence_screenshots) {
    try {
      screenshotsArray = typeof req.body.evidence_screenshots === 'string'
        ? JSON.parse(req.body.evidence_screenshots)
        : req.body.evidence_screenshots;
    } catch (e) {
      screenshotsArray = [req.body.evidence_screenshots];
    }
  }

  // Verify campaign exists and creator is part of it
  const campaign = db.prepare(`
    SELECT c.*, s.pm_user_id as server_pm_id, s.name as server_name 
    FROM campaigns c 
    JOIN servers s ON c.server_id = s.id 
    WHERE c.id = ? AND c.deleted_at IS NULL
  `).get(campaign_id);

  if (!campaign) {
    return res.status(404).json({ error: 'Campaña no encontrada.' });
  }

  if (role === 'creator') {
    const isAssigned = db.prepare('SELECT id FROM campaign_creators WHERE campaign_id = ? AND creator_id = ?').get(campaign_id, userId);
    if (!isAssigned) {
      return res.status(403).json({ error: 'No estás asignado a esta campaña.' });
    }
  }

  const creatorId = role === 'creator' ? userId : (req.body.creator_id || userId);

  const result = db.prepare(`
    INSERT INTO activity_evidences (
      campaign_id, creator_id, type, platform, content_url, activity_date,
      duration_minutes, avg_viewers, peak_viewers, total_views, evidence_screenshots,
      creator_notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'review')
  `).run(
    campaign_id,
    creatorId,
    type,
    platform,
    content_url.trim(),
    activity_date,
    parseInt(duration_minutes, 10) || 0,
    parseInt(avg_viewers, 10) || 0,
    parseInt(peak_viewers, 10) || 0,
    parseInt(total_views, 10) || 0,
    JSON.stringify(screenshotsArray), // Guardamos el array como JSON en la base de datos
    creator_notes || null
  );

  const evidenceId = Number(result.lastInsertRowid);

  // Notify PM in charge
  const targetPmId = campaign.pm_user_id || campaign.server_pm_id;
  if (targetPmId) {
    const creatorUser = db.prepare('SELECT full_name FROM users WHERE id = ?').get(creatorId);
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      targetPmId,
      'Nueva Evidencia Para Revisión',
      `${creatorUser.full_name} ha enviado una actividad de ${platform} para la campaña "${campaign.name}".`,
      'info',
      '/dashboard/pm?tab=review'
    );
  }

  logAudit(userId, 'EVIDENCE_SUBMITTED', 'activity_evidences', evidenceId, { campaignId: campaign_id, platform }, req);

  return res.status(201).json({
    id: evidenceId,
    message: 'Actividad registrada correctamente y enviada para revisión por el PM.'
  });
}

function reviewEvidence(req, res) {
  const { id: userId, role } = req.user;
  const evidenceId = parseInt(req.params.id, 10);
  const { status, rejection_reason, internal_notes } = req.body;

  if (!['approved', 'rejected', 'review'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser approved, rejected o review.' });
  }

  if (status === 'rejected' && (!rejection_reason || rejection_reason.trim() === '')) {
    return res.status(400).json({ error: 'Debe especificar el motivo del rechazo para que el creador pueda corregirlo.' });
  }

  const evidence = db.prepare(`
    SELECT ae.*, c.name as campaign_name, s.owner_user_id, s.name as server_name, s.pm_user_id as server_pm_id, c.pm_user_id as campaign_pm_id
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    WHERE ae.id = ?
  `).get(evidenceId);

  if (!evidence) {
    return res.status(404).json({ error: 'Evidencia no encontrada.' });
  }

  // Permission check for PM: can only review their assigned servers/campaigns
  if (role === 'pm') {
    const isMyServer = evidence.server_pm_id === userId || evidence.campaign_pm_id === userId;
    if (!isMyServer) {
      return res.status(403).json({ error: 'No tienes permiso para revisar evidencias de este servidor.' });
    }
  }

  db.prepare(`
    UPDATE activity_evidences
    SET status = ?,
        rejection_reason = ?,
        internal_notes = COALESCE(?, internal_notes),
        reviewed_by_user_id = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    status,
    status === 'rejected' ? rejection_reason.trim() : null,
    internal_notes || null,
    userId,
    evidenceId
  );

  // Notify Creator of decision
  const statusMsg = status === 'approved' 
    ? `Tu evidencia en ${evidence.platform} ha sido APROBADA.` 
    : `Tu evidencia en ${evidence.platform} ha sido RECHAZADA. Motivo: ${rejection_reason}`;
  
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    evidence.creator_id,
    `Evidencia ${status === 'approved' ? 'Aprobada' : 'Rechazada'}`,
    statusMsg,
    status === 'approved' ? 'success' : 'danger',
    '/dashboard/creator?tab=evidences'
  );

  // If approved, notify Server Owner that new verified results are ready
  if (status === 'approved' && evidence.owner_user_id) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      evidence.owner_user_id,
      'Nuevo Contenido Verificado',
      `Se ha verificado y aprobado una nueva actividad para su servidor "${evidence.server_name}".`,
      'success',
      '/dashboard/server-owner'
    );
  }

  logAudit(userId, `EVIDENCE_${status.toUpperCase()}`, 'activity_evidences', evidenceId, { status, reason: rejection_reason }, req);

  return res.json({ message: `Evidencia actualizada a estado "${status}".` });
}

module.exports = {
  getEvidences,
  createEvidence,
  reviewEvidence
};