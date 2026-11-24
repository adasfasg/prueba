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
      ae.reviewed_by_user_id, ae.reviewed_at, ae.paid_at, ae.paid_by_user_id,
      ae.payout_amount, ae.payment_reference, ae.payment_notes, ae.created_at,
      c.name as campaign_name,
      s.id as server_id, s.name as server_name, s.game as server_game, s.logo_url as server_logo,
      s.owner_user_id, s.pm_user_id,
      u_creator.full_name as creator_full_name, u_creator.username as creator_username,
      cp.alias as creator_alias, cp.avatar_url as creator_avatar,
      cp.hourly_rate_internal, cp.fixed_rate_internal,
      reviewer.full_name as reviewer_name,
      payer.full_name as payer_name
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    JOIN users u_creator ON ae.creator_id = u_creator.id
    LEFT JOIN creator_profiles cp ON ae.creator_id = cp.user_id
    LEFT JOIN users reviewer ON ae.reviewed_by_user_id = reviewer.id
    LEFT JOIN users payer ON ae.paid_by_user_id = payer.id
    WHERE c.deleted_at IS NULL AND s.deleted_at IS NULL
  `;
  const params = [];

  // Scoping according to RBAC:
  if (role === 'creator') {
    query += ' AND ae.creator_id = ?';
    params.push(userId);
  } else if (role === 'pm') {
    query += ` AND (
      c.pm_user_id = ? 
      OR EXISTS (SELECT 1 FROM campaign_pms cp WHERE cp.campaign_id = c.id AND cp.pm_id = ?)
      OR (
        NOT EXISTS (SELECT 1 FROM campaign_pms cp2 WHERE cp2.campaign_id = c.id)
        AND c.pm_user_id IS NULL
        AND (s.pm_user_id = ? OR EXISTS (SELECT 1 FROM server_pms sp WHERE sp.server_id = s.id AND sp.pm_id = ? AND sp.status = 'active'))
      )
    )`;
    params.push(userId, userId, userId, userId);
  } else if (role === 'server_owner') {
    // Server Owner sees approved and paid evidences for their server!
    query += " AND s.owner_user_id = ? AND ae.status IN ('approved', 'paid')";
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

  // Sanitization: hide internal_notes and internal rates from Server Owner
  const sanitized = evidences.map(ev => {
    let screenshots = [];
    try { screenshots = JSON.parse(ev.evidence_screenshots || '[]'); } catch (e) {}

    const hourlyRate = parseFloat(ev.hourly_rate_internal) || 0;
    const fixedRate = parseFloat(ev.fixed_rate_internal) || 0;
    const hours = (ev.duration_minutes || 0) / 60;
    const suggestedPayout = parseFloat(((hours * hourlyRate) + fixedRate).toFixed(2));

    const item = {
      ...ev,
      evidence_screenshots: screenshots,
      suggested_payout: suggestedPayout
    };

    if (role === 'server_owner') {
      delete item.internal_notes;
      delete item.hourly_rate_internal;
      delete item.fixed_rate_internal;
      delete item.suggested_payout;
      delete item.payout_amount;
      delete item.payment_reference;
      delete item.payment_notes;
      delete item.paid_by_user_id;
      delete item.payer_name;
    } else if (role === 'creator') {
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

  // Validación de límites de evidencias por streamer y acumulado de la campaña
  if (campaign.target_evidences && campaign.target_evidences > 0) {
    const creatorCountRow = db.prepare(`
      SELECT COUNT(*) as cnt 
      FROM activity_evidences 
      WHERE campaign_id = ? AND creator_id = ? AND status != 'rejected'
    `).get(campaign_id, creatorId);
    const currentCreatorEvidences = creatorCountRow ? creatorCountRow.cnt : 0;

    if (currentCreatorEvidences >= campaign.target_evidences) {
      return res.status(400).json({
        error: `Se ha alcanzado el límite máximo de ${campaign.target_evidences} directos/evidencias para la campaña "${campaign.name}". No se permiten más entregas.`
      });
    }

    const totalCreatorsRow = db.prepare('SELECT COUNT(*) as cnt FROM campaign_creators WHERE campaign_id = ?').get(campaign_id);
    const creatorsCount = totalCreatorsRow ? totalCreatorsRow.cnt : 0;
    const totalMaxEvidences = creatorsCount > 0 ? campaign.target_evidences * creatorsCount : campaign.target_evidences;

    const countRow = db.prepare(`
      SELECT COUNT(*) as cnt 
      FROM activity_evidences 
      WHERE campaign_id = ? AND status != 'rejected'
    `).get(campaign_id);
    const totalCampaignEvidences = countRow ? countRow.cnt : 0;

    if (totalCampaignEvidences >= totalMaxEvidences) {
      return res.status(400).json({
        error: `Se ha alcanzado el límite máximo de ${totalMaxEvidences} directos/evidencias para la campaña "${campaign.name}". No se permiten más entregas.`
      });
    }
  }

  if (campaign.target_hours && campaign.target_hours > 0) {
    const reqDuration = parseInt(duration_minutes, 10) || 0;
    const minutesRow = db.prepare(`
      SELECT COALESCE(SUM(duration_minutes), 0) as total_min
      FROM activity_evidences
      WHERE campaign_id = ? AND status != 'rejected'
    `).get(campaign_id);
    const currentMinutes = minutesRow ? minutesRow.total_min : 0;
    const maxMinutes = Math.round(campaign.target_hours * 60);

    if (currentMinutes + reqDuration > maxMinutes) {
      const remainingMinutes = Math.max(0, maxMinutes - currentMinutes);
      const remainingHours = (remainingMinutes / 60).toFixed(1);
      return res.status(400).json({
        error: `La duración ingresada (${(reqDuration / 60).toFixed(1)}h) excede el cupo de horas disponible (${remainingHours}h restantes de un límite de ${campaign.target_hours}h) para la campaña "${campaign.name}".`
      });
    }
  }

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

  // Notify PM(s) in charge
  const campPms = db.prepare('SELECT pm_id FROM campaign_pms WHERE campaign_id = ?').all(campaign_id);
  let targetPmIds = campPms.map(p => p.pm_id);
  if (targetPmIds.length === 0 && (campaign.pm_user_id || campaign.server_pm_id)) {
    targetPmIds = [campaign.pm_user_id || campaign.server_pm_id];
  }
  targetPmIds = [...new Set(targetPmIds)];

  if (targetPmIds.length > 0) {
    const creatorUser = db.prepare('SELECT full_name FROM users WHERE id = ?').get(creatorId);
    const notifyStmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const tPmId of targetPmIds) {
      notifyStmt.run(
        tPmId,
        'Nueva Evidencia Para Revisión',
        `${creatorUser?.full_name || 'Un creador'} ha enviado una actividad de ${platform} para la campaña "${campaign.name}".`,
        'info',
        '/dashboard/pm?tab=review'
      );
    }
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

  if (status === 'paid' && role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({ error: 'Acceso denegado: Únicamente el Administrador puede procesar y marcar entregas como pagadas.' });
  }

  if (!['approved', 'rejected', 'review', 'paid'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser approved, rejected, review o paid.' });
  }

  if (status === 'rejected' && (!rejection_reason || rejection_reason.trim() === '')) {
    return res.status(400).json({ error: 'Debe especificar el motivo del rechazo para que el creador pueda corregirlo.' });
  }

  const evidence = db.prepare(`
    SELECT ae.*, c.name as campaign_name, s.id as server_id, s.owner_user_id, s.name as server_name, s.pm_user_id as server_pm_id, c.pm_user_id as campaign_pm_id
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    WHERE ae.id = ?
  `).get(evidenceId);

  if (!evidence) {
    return res.status(404).json({ error: 'Evidencia no encontrada.' });
  }

  // Permission check for PM: can only review their assigned campaigns (or server fallback if unassigned)
  if (role === 'pm') {
    const isAssignedToCamp = evidence.campaign_pm_id === userId ||
      db.prepare("SELECT 1 FROM campaign_pms WHERE campaign_id = ? AND pm_id = ?").get(evidence.campaign_id, userId);
    const hasAssignedPms = db.prepare("SELECT 1 FROM campaign_pms WHERE campaign_id = ?").get(evidence.campaign_id) || evidence.campaign_pm_id;

    let isAllowed = false;
    if (hasAssignedPms) {
      isAllowed = !!isAssignedToCamp;
    } else {
      isAllowed = evidence.server_pm_id === userId || 
                  db.prepare("SELECT 1 FROM server_pms WHERE server_id = ? AND pm_id = ? AND status = 'active'").get(evidence.server_id, userId);
    }

    if (!isAllowed) {
      return res.status(403).json({ error: 'No tienes permiso para revisar evidencias de esta campaña.' });
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
    : status === 'paid'
    ? `Tu evidencia en ${evidence.platform} ha sido marcada como PAGADA.`
    : `Tu evidencia en ${evidence.platform} ha sido RECHAZADA. Motivo: ${rejection_reason}`;
  
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    evidence.creator_id,
    `Evidencia ${status === 'approved' ? 'Aprobada' : status === 'paid' ? 'Pagada' : 'Rechazada'}`,
    statusMsg,
    status === 'rejected' ? 'danger' : 'success',
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

function payEvidence(req, res) {
  const { id: userId, role } = req.user;
  const evidenceId = parseInt(req.params.id, 10);
  const { payout_amount, payment_reference, payment_notes } = req.body;

  if (role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({ error: 'Acceso denegado: Únicamente el Administrador puede procesar y liquidar pagos de entregas.' });
  }

  const parsedAmount = parseFloat(payout_amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ error: 'El monto de liquidación debe ser un número positivo válido.' });
  }

  const evidence = db.prepare(`
    SELECT ae.*, c.name as campaign_name, s.name as server_name, s.pm_user_id as server_pm_id, c.pm_user_id as campaign_pm_id,
           u.full_name as creator_name, cp.alias as creator_alias
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    JOIN users u ON ae.creator_id = u.id
    LEFT JOIN creator_profiles cp ON ae.creator_id = cp.user_id
    WHERE ae.id = ?
  `).get(evidenceId);

  if (!evidence) {
    return res.status(404).json({ error: 'Entrega no encontrada.' });
  }

  const cleanReference = payment_reference && payment_reference.trim() ? payment_reference.trim() : `PAY-${Date.now()}`;
  const cleanNotes = payment_notes && payment_notes.trim() ? payment_notes.trim() : null;

  db.prepare(`
    UPDATE activity_evidences
    SET status = 'paid',
        paid_at = CURRENT_TIMESTAMP,
        paid_by_user_id = ?,
        payout_amount = ?,
        payment_reference = ?,
        payment_notes = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    userId,
    parsedAmount,
    cleanReference,
    cleanNotes,
    evidenceId
  );

  // Notify Creator
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    evidence.creator_id,
    'Entrega Pagada 💰',
    `Tu entrega de ${evidence.platform} para "${evidence.campaign_name}" ha sido PAGADA ($${parsedAmount.toFixed(2)} USD). Ref: ${cleanReference}.`,
    'success',
    '/dashboard/creator?tab=evidences'
  );

  // Notify PM in charge
  const targetPmId = evidence.campaign_pm_id || evidence.server_pm_id;
  if (targetPmId) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      targetPmId,
      'Entrega Liquidada por Admin',
      `La entrega de ${evidence.creator_alias || evidence.creator_name} para "${evidence.campaign_name}" ha sido liquidada por el Administrador ($${parsedAmount.toFixed(2)} USD).`,
      'info',
      '/dashboard/pm?tab=review'
    );
  }

  logAudit(userId, 'EVIDENCE_PAID', 'activity_evidences', evidenceId, {
    amount: parsedAmount,
    reference: cleanReference,
    creator_id: evidence.creator_id,
    campaign_id: evidence.campaign_id
  }, req);

  return res.json({
    message: 'Entrega liquidada y marcada como pagada exitosamente.',
    evidence_id: evidenceId,
    status: 'paid',
    payout_amount: parsedAmount,
    payment_reference: cleanReference
  });
}

function updateEvidencePayment(req, res) {
  const { id: userId, role } = req.user;
  const evidenceId = parseInt(req.params.id, 10);
  const { payout_amount, payment_reference, payment_notes, paid_at } = req.body;

  if (role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({ error: 'Acceso denegado: Únicamente el Administrador puede editar pagos de entregas.' });
  }

  const parsedAmount = parseFloat(payout_amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ error: 'El monto de liquidación debe ser un número positivo válido.' });
  }

  const evidence = db.prepare(`
    SELECT ae.*, c.name as campaign_name, s.name as server_name,
           u.full_name as creator_name, cp.alias as creator_alias
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    JOIN users u ON ae.creator_id = u.id
    LEFT JOIN creator_profiles cp ON ae.creator_id = cp.user_id
    WHERE ae.id = ?
  `).get(evidenceId);

  if (!evidence) {
    return res.status(404).json({ error: 'Entrega no encontrada.' });
  }

  if (evidence.status !== 'paid') {
    return res.status(400).json({ error: 'La entrega no se encuentra en estado pagada.' });
  }

  const cleanReference = payment_reference && payment_reference.trim() ? payment_reference.trim() : evidence.payment_reference;
  const cleanNotes = payment_notes !== undefined ? (payment_notes && payment_notes.trim() ? payment_notes.trim() : null) : evidence.payment_notes;
  const cleanPaidAt = paid_at ? paid_at : evidence.paid_at;

  db.prepare(`
    UPDATE activity_evidences
    SET payout_amount = ?,
        payment_reference = ?,
        payment_notes = ?,
        paid_at = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(parsedAmount, cleanReference, cleanNotes, cleanPaidAt, evidenceId);

  // If there was a matching transaction in server_financial_transactions, update it too
  if (evidence.payment_reference) {
    db.prepare(`
      UPDATE server_financial_transactions
      SET amount = ?, payment_reference = ?, notes = ?, transaction_date = COALESCE(?, transaction_date)
      WHERE payment_reference = ?
    `).run(parsedAmount, cleanReference, cleanNotes, paid_at || null, evidence.payment_reference);
  }

  logAudit(userId, 'EVIDENCE_PAYMENT_UPDATED', 'activity_evidences', evidenceId, {
    previous_amount: evidence.payout_amount,
    new_amount: parsedAmount,
    reference: cleanReference
  }, req);

  return res.json({
    message: 'Pago de la entrega actualizado exitosamente.',
    evidence_id: evidenceId,
    payout_amount: parsedAmount,
    payment_reference: cleanReference,
    paid_at: cleanPaidAt
  });
}

function revertEvidencePayment(req, res) {
  const { id: userId, role } = req.user;
  const evidenceId = parseInt(req.params.id, 10);

  if (role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({ error: 'Acceso denegado: Únicamente el Administrador puede anular o eliminar pagos de entregas.' });
  }

  const evidence = db.prepare(`
    SELECT ae.*, c.name as campaign_name, s.name as server_name,
           u.full_name as creator_name, cp.alias as creator_alias
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    JOIN users u ON ae.creator_id = u.id
    LEFT JOIN creator_profiles cp ON ae.creator_id = cp.user_id
    WHERE ae.id = ?
  `).get(evidenceId);

  if (!evidence) {
    return res.status(404).json({ error: 'Entrega no encontrada.' });
  }

  if (evidence.status !== 'paid') {
    return res.status(400).json({ error: 'La entrega no se encuentra en estado pagada.' });
  }

  db.prepare(`
    UPDATE activity_evidences
    SET status = 'approved',
        payout_amount = NULL,
        paid_at = NULL,
        paid_by_user_id = NULL,
        payment_reference = NULL,
        payment_notes = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(evidenceId);

  // If there was any transaction in server_financial_transactions with this reference, remove it
  if (evidence.payment_reference) {
    db.prepare('DELETE FROM server_financial_transactions WHERE payment_reference = ?').run(evidence.payment_reference);
  }

  // Notify Creator
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    evidence.creator_id,
    'Pago de Entrega Anulado',
    `El pago de tu entrega para "${evidence.campaign_name}" ha sido anulado por el Administrador para corrección. La entrega ha vuelto al estado Aprobado.`,
    'warning',
    '/dashboard/creator?tab=evidences'
  );

  logAudit(userId, 'EVIDENCE_PAYMENT_REVERTED', 'activity_evidences', evidenceId, {
    previous_payout: evidence.payout_amount,
    previous_reference: evidence.payment_reference
  }, req);

  return res.json({
    message: 'Pago de entrega eliminado y revertido exitosamente. La entrega ha vuelto al estado Aprobado.',
    evidence_id: evidenceId,
    status: 'approved'
  });
}

function deleteEvidence(req, res) {
  const { id: userId, role } = req.user;
  const evidenceId = parseInt(req.params.id, 10);

  const evidence = db.prepare(`
    SELECT ae.*, c.name as campaign_name, c.server_id, c.pm_user_id as campaign_pm_id, s.pm_user_id as server_pm_id
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    WHERE ae.id = ?
  `).get(evidenceId);

  if (!evidence) {
    return res.status(404).json({ error: 'Entrega no encontrada.' });
  }

  if (role === 'creator') {
    if (evidence.creator_id !== userId) {
      return res.status(403).json({ error: 'No tienes autorización para eliminar entregas de otros creadores.' });
    }
    if (evidence.status === 'paid' || evidence.status === 'approved') {
      return res.status(400).json({ error: 'No puedes eliminar una entrega que ya ha sido aprobada o pagada. Contacta con tu PM o Administrador.' });
    }
  } else if (role === 'pm') {
    const isAssigned = db.prepare('SELECT 1 FROM campaign_pms WHERE campaign_id = ? AND pm_id = ?').get(evidence.campaign_id, userId) ||
                       db.prepare('SELECT 1 FROM server_pms WHERE server_id = ? AND pm_id = ?').get(evidence.server_id, userId) ||
                       evidence.campaign_pm_id === userId || evidence.server_pm_id === userId;
    if (!isAssigned) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar entregas de una campaña que no gestionas.' });
    }
  } else if (role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({ error: 'Acceso denegado para eliminar entregas.' });
  }

  // Remove matching transaction in server_financial_transactions if any
  if (evidence.payment_reference) {
    db.prepare('DELETE FROM server_financial_transactions WHERE payment_reference = ?').run(evidence.payment_reference);
  }

  db.prepare('DELETE FROM activity_evidences WHERE id = ?').run(evidenceId);

  logAudit(userId, 'EVIDENCE_DELETED', 'activity_evidences', evidenceId, {
    creator_id: evidence.creator_id,
    campaign_id: evidence.campaign_id,
    status: evidence.status,
    payout_amount: evidence.payout_amount
  }, req);

  return res.json({ message: 'Entrega eliminada correctamente.' });
}

module.exports = {
  getEvidences,
  createEvidence,
  reviewEvidence,
  payEvidence,
  updateEvidencePayment,
  revertEvidencePayment,
  deleteEvidence
};