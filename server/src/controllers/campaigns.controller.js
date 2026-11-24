const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

function getCampaigns(req, res) {
  const { role, id: userId } = req.user;

  let query = `
    SELECT 
      c.id, c.name, c.server_id, c.pm_user_id, c.status, c.start_date, c.end_date,
      c.objective, c.requirements, c.budget_internal, c.target_evidences, c.target_hours, c.pm_fee, c.notes, c.created_at,
      s.name as server_name, s.game as server_game, s.budget as server_budget, s.logo_url as server_logo,
      s.owner_user_id,
      pm.full_name as pm_name, pm.email as pm_email,
      (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id = c.id) as creators_count,
      (SELECT COUNT(*) FROM activity_evidences ae WHERE ae.campaign_id = c.id) as total_evidences_count,
      (SELECT COUNT(*) FROM activity_evidences ae WHERE ae.campaign_id = c.id AND ae.status IN ('approved', 'paid')) as approved_evidences_count,
      (SELECT COALESCE(SUM(ae.total_views), 0) FROM activity_evidences ae WHERE ae.campaign_id = c.id AND ae.status IN ('approved', 'paid')) as campaign_views,
      (SELECT COALESCE(SUM(ae.duration_minutes), 0) FROM activity_evidences ae WHERE ae.campaign_id = c.id AND ae.status IN ('approved', 'paid')) as campaign_duration_minutes
    FROM campaigns c
    JOIN servers s ON c.server_id = s.id
    LEFT JOIN users pm ON c.pm_user_id = pm.id
    WHERE c.deleted_at IS NULL AND s.deleted_at IS NULL
  `;
  const params = [];

  if (role === 'pm') {
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
    query += ' AND s.owner_user_id = ?';
    params.push(userId);
  } else if (role === 'creator') {
    query += ' AND c.id IN (SELECT campaign_id FROM campaign_creators WHERE creator_id = ?)';
    params.push(userId);
  }

  query += ' ORDER BY c.id DESC';

  const campaigns = db.prepare(query).all(...params);

  // Attach participating creators and assigned PMs
  const enriched = campaigns.map(c => {
    const assignedPms = db.prepare(`
      SELECT 
        u.id as pm_id,
        u.full_name as pm_name,
        u.email as pm_email,
        u.username as pm_username
      FROM campaign_pms cp
      JOIN users u ON cp.pm_id = u.id
      WHERE cp.campaign_id = ?
    `).all(c.id);

    // Fallback if campaign_pms is empty but c.pm_user_id exists
    if (assignedPms.length === 0 && c.pm_user_id && c.pm_name) {
      assignedPms.push({
        pm_id: c.pm_user_id,
        pm_name: c.pm_name,
        pm_email: c.pm_email || '',
        pm_username: ''
      });
    }

    const pmIds = assignedPms.map(p => p.pm_id);
    const pmNames = assignedPms.map(p => p.pm_name).filter(Boolean).join(', ') || c.pm_name || 'Sin PM asignado';
    const primaryPmName = assignedPms[0]?.pm_name || c.pm_name || 'No asignado';
    const primaryPmId = assignedPms[0]?.pm_id || c.pm_user_id || null;

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

    // Calculate campaign financials for authorized management roles
    let financials = null;
    if (role === 'super_admin' || role === 'director_ops' || role === 'pm') {
      const budget = parseFloat(c.budget_internal) || 0;
      const campPmFee = parseFloat(c.pm_fee) || 0;

      // Gastos liquidados en entregas de streamers
      const paidRow = db.prepare(`
        SELECT COALESCE(SUM(payout_amount), 0) as paid_amount
        FROM activity_evidences
        WHERE campaign_id = ? AND status = 'paid'
      `).get(c.id);
      const paidStreamersExpense = parseFloat(paidRow?.paid_amount) || 0;

      // Gastos liquidados en honorarios/comisión de PM vinculados a esta campaña
      const paidPmRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as paid_pm
        FROM server_financial_transactions
        WHERE campaign_id = ? AND type = 'expense_pm' AND status = 'completed'
      `).get(c.id);
      const paidPmExpense = parseFloat(paidPmRow?.paid_pm) || 0;

      const totalPaidExpense = paidStreamersExpense + paidPmExpense;

      const approvedEvidences = db.prepare(`
        SELECT ae.duration_minutes, cp.hourly_rate_internal, cp.fixed_rate_internal
        FROM activity_evidences ae
        JOIN creator_profiles cp ON ae.creator_id = cp.user_id
        WHERE ae.campaign_id = ? AND ae.status = 'approved'
      `).all(c.id);

      const approvedPendingExpense = approvedEvidences.reduce((acc, ev) => {
        const hRate = parseFloat(ev.hourly_rate_internal) || 0;
        const fRate = parseFloat(ev.fixed_rate_internal) || 0;
        const hours = (ev.duration_minutes || 0) / 60;
        return acc + (hours * hRate) + fRate;
      }, 0);

      // Si la campaña no ha concluido y tiene fee de PM configurado que aún no se ha liquidado
      const pendingPmFee = (c.status !== 'completed' && campPmFee > paidPmExpense)
        ? (campPmFee - paidPmExpense)
        : 0;

      // El total que aún NO se ha usado del presupuesto es exactamente la ganancia total
      const unusedBudget = budget - totalPaidExpense;
      const netProfit = unusedBudget;

      const projectedTotalExpense = totalPaidExpense + approvedPendingExpense + pendingPmFee;
      const projectedNetProfit = budget - projectedTotalExpense;
      const projectedUnusedBudget = projectedNetProfit;

      const budgetExecutionPercentage = budget > 0 ? parseFloat(((totalPaidExpense / budget) * 100).toFixed(1)) : 0;
      const profitMargin = budget > 0 ? parseFloat(((netProfit / budget) * 100).toFixed(1)) : 0;
      const projectedMargin = budget > 0 ? parseFloat(((projectedNetProfit / budget) * 100).toFixed(1)) : 0;

      financials = {
        budget: parseFloat(budget.toFixed(2)),
        paid_expense: parseFloat(totalPaidExpense.toFixed(2)),
        paid_streamers_expense: parseFloat(paidStreamersExpense.toFixed(2)),
        paid_pm_expense: parseFloat(paidPmExpense.toFixed(2)),
        pm_fee: parseFloat(campPmFee.toFixed(2)),
        approved_pending_expense: parseFloat(approvedPendingExpense.toFixed(2)),
        total_spent: parseFloat(totalPaidExpense.toFixed(2)),
        unused_budget: parseFloat(unusedBudget.toFixed(2)),
        net_profit: parseFloat(netProfit.toFixed(2)),
        projected_total_spent: parseFloat(projectedTotalExpense.toFixed(2)),
        projected_unused_budget: parseFloat(projectedUnusedBudget.toFixed(2)),
        projected_net_profit: parseFloat(projectedNetProfit.toFixed(2)),
        budget_execution_percentage: budgetExecutionPercentage,
        profit_margin_percentage: profitMargin,
        projected_profit_margin_percentage: projectedMargin,
        is_profitable: netProfit >= 0
      };
    }

    const targetEvsPerCreator = c.target_evidences || 0;
    const creatorsCount = creators.length;
    const totalTargetEvidences = creatorsCount > 0 ? targetEvsPerCreator * creatorsCount : targetEvsPerCreator;
    const targetHrs = parseFloat(c.target_hours) || 0;
    const actualHours = parseFloat(((c.campaign_duration_minutes || 0) / 60).toFixed(1));
    const actualEvs = c.approved_evidences_count || c.total_evidences_count || 0;

    const enrichedCreators = creators.map(cr => {
      // Query deliveries / evidences for this creator in this campaign
      const statsRow = db.prepare(`
        SELECT 
          COUNT(*) as total_evidences,
          SUM(CASE WHEN ae.status IN ('approved', 'paid') THEN 1 ELSE 0 END) as approved_evidences,
          COALESCE(SUM(CASE WHEN ae.status IN ('approved', 'paid') THEN ae.duration_minutes ELSE 0 END), 0) as approved_minutes,
          COALESCE(SUM(ae.duration_minutes), 0) as total_minutes,
          COALESCE(SUM(ae.total_views), 0) as total_views
        FROM activity_evidences ae
        WHERE ae.campaign_id = ? AND ae.creator_id = ? AND ae.status != 'rejected'
      `).get(c.id, cr.user_id);

      const creatorApprovedEvs = statsRow?.approved_evidences || 0;
      const creatorTotalEvs = statsRow?.total_evidences || 0;
      const creatorApprovedMins = statsRow?.approved_minutes || 0;
      const creatorHours = parseFloat((creatorApprovedMins / 60).toFixed(1));

      const creatorProgress = targetEvsPerCreator > 0 
        ? Math.min(100, Math.round((creatorApprovedEvs / targetEvsPerCreator) * 100)) 
        : null;

      const isCompleted = targetEvsPerCreator > 0 && creatorApprovedEvs >= targetEvsPerCreator;

      const creatorObj = {
        ...cr,
        id: cr.user_id,
        creator_id: cr.user_id,
        creator_user_id: cr.user_id,
        target_evidences: targetEvsPerCreator,
        approved_evidences: creatorApprovedEvs,
        total_evidences: creatorTotalEvs,
        hours_streamed: creatorHours,
        total_views: statsRow?.total_views || 0,
        progress_percentage: creatorProgress,
        is_completed: isCompleted,
        status_label: targetEvsPerCreator > 0 
          ? (isCompleted ? 'Completado' : creatorApprovedEvs > 0 ? 'En Progreso' : 'Sin Entregas')
          : 'Activo'
      };

      // Strip internal payout for server owner and other creators
      if (role === 'server_owner' || (role === 'creator' && cr.user_id !== userId)) {
        delete creatorObj.payout_internal;
      }
      return creatorObj;
    });

    const result = {
      ...c,
      assigned_pms: assignedPms,
      pm_ids: pmIds,
      pm_names: pmNames,
      pm_name: primaryPmName,
      pm_user_id: primaryPmId,
      target_evidences: targetEvsPerCreator,
      target_evidences_per_creator: targetEvsPerCreator,
      total_target_evidences: totalTargetEvidences,
      creators_count: creatorsCount,
      target_hours: targetHrs,
      actual_hours: actualHours,
      evidences_progress_percentage: totalTargetEvidences > 0 ? Math.min(100, Math.round((actualEvs / totalTargetEvidences) * 100)) : null,
      hours_progress_percentage: targetHrs > 0 ? Math.min(100, Math.round((actualHours / targetHrs) * 100)) : null,
      financials,
      creators: enrichedCreators
    };

    // Strip internal budget and fees for server owner and creators
    if (role === 'server_owner' || role === 'creator') {
      delete result.budget_internal;
      delete result.pm_fee;
      delete result.financials;
    }

    return result;
  });

  return res.json(enriched);
}

function createCampaign(req, res) {
  const { role, id: userId } = req.user;
  const {
    name, server_id, pm_user_id, creator_ids = [], status = 'active',
    start_date, end_date, objective, requirements, budget_internal,
    target_evidences, target_hours, pm_fee, notes
  } = req.body;

  if (!name || !server_id) {
    return res.status(400).json({ error: 'El nombre de la campaña y el servidor son obligatorios.' });
  }

  // If PM is creating, verify server belongs to PM
  const server = db.prepare('SELECT * FROM servers WHERE id = ? AND deleted_at IS NULL').get(server_id);
  if (!server) {
    return res.status(404).json({ error: 'Servidor no encontrado.' });
  }

  if (server.status === 'suspended') {
    return res.status(400).json({ error: 'No se pueden crear campañas en un servidor suspendido.' });
  }

  if (role === 'pm') {
    const isAssigned = server.pm_user_id === userId || db.prepare("SELECT 1 FROM server_pms WHERE server_id = ? AND pm_id = ? AND status = 'active'").get(server_id, userId);
    if (!isAssigned) {
      return res.status(403).json({ error: 'No tienes permiso para crear campañas en este servidor.' });
    }
  }

  // Parse assigned PMs (supports pm_ids array and/or pm_user_id)
  let targetPmIds = [];
  if (Array.isArray(req.body.pm_ids) && req.body.pm_ids.length > 0) {
    targetPmIds = req.body.pm_ids.map(id => parseInt(id, 10)).filter(Boolean);
  } else if (pm_user_id) {
    targetPmIds = [parseInt(pm_user_id, 10)].filter(Boolean);
  } else if (role === 'pm') {
    targetPmIds = [userId];
  } else if (server.pm_user_id) {
    targetPmIds = [server.pm_user_id];
  }
  targetPmIds = [...new Set(targetPmIds)];
  const assignedPm = targetPmIds[0] || null;

  const parsedBudget = budget_internal !== undefined ? (parseFloat(budget_internal) || 0) : 0;
  const parsedTargetEvidences = target_evidences !== undefined ? (parseInt(target_evidences, 10) || 0) : 0;
  const parsedTargetHours = target_hours !== undefined ? (parseFloat(target_hours) || 0) : 0;
  const parsedPmFee = pm_fee !== undefined ? (parseFloat(pm_fee) || 0) : 0;

  // Validación de techo de presupuesto por servidor y acumulado del grupo de campañas
  const serverBudget = parseFloat(server.budget) || 0;
  if (serverBudget > 0) {
    if (parsedBudget > serverBudget) {
      return res.status(400).json({
        error: `El presupuesto de la campaña ($${parsedBudget.toFixed(2)}) no puede exceder el presupuesto total del servidor ($${serverBudget.toFixed(2)}).`
      });
    }

    const aggRow = db.prepare(`
      SELECT COALESCE(SUM(budget_internal), 0) as allocated
      FROM campaigns
      WHERE server_id = ? AND deleted_at IS NULL
    `).get(server_id);
    const currentAllocated = parseFloat(aggRow?.allocated) || 0;
    const remainingBudget = Math.max(0, serverBudget - currentAllocated);

    if (currentAllocated + parsedBudget > serverBudget) {
      return res.status(400).json({
        error: `El presupuesto acumulado de las campañas en este servidor ($${(currentAllocated + parsedBudget).toFixed(2)}) excede el límite del servidor ($${serverBudget.toFixed(2)}). Presupuesto restante disponible: $${remainingBudget.toFixed(2)}.`
      });
    }
  }

  const result = db.prepare(`
    INSERT INTO campaigns (
      name, server_id, pm_user_id, status, start_date, end_date,
      objective, requirements, budget_internal, target_evidences, target_hours, pm_fee, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    server_id,
    assignedPm,
    status,
    start_date || null,
    end_date || null,
    objective || null,
    requirements || null,
    parsedBudget,
    parsedTargetEvidences,
    parsedTargetHours,
    parsedPmFee,
    notes || null
  );

  const campaignId = Number(result.lastInsertRowid);

  // Assign PMs to campaign
  if (targetPmIds.length > 0) {
    const insertCampPm = db.prepare(`
      INSERT OR IGNORE INTO campaign_pms (campaign_id, pm_id)
      VALUES (?, ?)
    `);
    const notifyPm = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const pId of targetPmIds) {
      insertCampPm.run(campaignId, pId);
      if (pId !== userId) {
        notifyPm.run(
          pId,
          'Nueva Campaña Asignada a tu Cargo',
          `Has sido asignado a cargo de la campaña "${name.trim()}" en el servidor ${server.name}.`,
          'info',
          '/dashboard/pm?tab=campaigns'
        );
      }
    }
  }

  // If creators were selected to be actioned upon campaign creation:
  if (Array.isArray(creator_ids) && creator_ids.length > 0) {
    const insertCampCreator = db.prepare(`
      INSERT INTO campaign_creators (campaign_id, creator_id, agreement_terms, payout_internal)
      VALUES (?, ?, ?, ?)
    `);
    const notifyCreator = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const cId of creator_ids) {
      const parsedCid = parseInt(cId, 10);
      if (parsedCid) {
        insertCampCreator.run(campaignId, parsedCid, 'Campaña iniciada', 0);
        notifyCreator.run(
          parsedCid,
          'Nueva Campaña Asignada',
          `Has sido accionado para participar en la campaña "${name.trim()}".`,
          'info',
          '/dashboard/streamer'
        );
      }
    }
  }

  // Si la campaña se crea directamente como completed y tiene honorario de PM definido
  if (status === 'completed' && parsedPmFee > 0) {
    const pmCount = targetPmIds.length || 1;
    const splitAmount = parseFloat((parsedPmFee / pmCount).toFixed(2));
    const today = new Date().toISOString().split('T')[0];

    const insTx = db.prepare(`
      INSERT INTO server_financial_transactions (
        server_id, campaign_id, type, category, concept, amount, transaction_date,
        payment_reference, payment_method, status, recipient_or_payer_name, recipient_user_id,
        notes, created_by_user_id
      ) VALUES (?, ?, 'expense_pm', 'pm_fee', ?, ?, ?, ?, 'Transferencia', 'completed', ?, ?, ?, ?)
    `);

    for (const pId of targetPmIds) {
      const pmUser = db.prepare('SELECT full_name, username FROM users WHERE id = ?').get(pId);
      insTx.run(
        server_id,
        campaignId,
        `Honorario Cierre Campaña: ${name.trim()}`,
        splitAmount,
        today,
        `PM-CAMP-${campaignId}-${pId}`,
        pmUser?.full_name || pmUser?.username || 'PM Asignado',
        pId,
        `Liquidación automática por conclusión de campaña "${name.trim()}"`,
        userId
      );
    }
  }

  logAudit(userId, 'CAMPAIGN_CREATED', 'campaigns', campaignId, { 
    name, serverId: server_id, budget_internal: parsedBudget, target_evidences: parsedTargetEvidences, target_hours: parsedTargetHours, pm_fee: parsedPmFee, creator_ids, pm_ids: targetPmIds 
  }, req);

  return res.status(201).json({ 
    id: campaignId, 
    name, 
    server_id, 
    status, 
    pm_user_id: assignedPm,
    pm_ids: targetPmIds,
    budget_internal: parsedBudget,
    target_evidences: parsedTargetEvidences,
    target_hours: parsedTargetHours,
    pm_fee: parsedPmFee,
    creator_ids 
  });
}

function updateCampaign(req, res) {
  const campaignId = parseInt(req.params.id, 10);
  const { role, id: userId } = req.user;
  const { 
    name, status, start_date, end_date, objective, 
    requirements, budget_internal, target_evidences, target_hours, pm_fee, notes 
  } = req.body;

  const existing = db.prepare(`
    SELECT c.*, s.pm_user_id as server_pm_id, s.budget as server_budget
    FROM campaigns c
    JOIN servers s ON c.server_id = s.id
    WHERE c.id = ? AND c.deleted_at IS NULL
  `).get(campaignId);

  if (!existing) {
    return res.status(404).json({ error: 'Campaña no encontrada.' });
  }

  // If PM, check ownership (assigned to campaign or server fallback if unassigned)
  if (role === 'pm') {
    const isAssignedToCamp = existing.pm_user_id === userId || 
      db.prepare("SELECT 1 FROM campaign_pms WHERE campaign_id = ? AND pm_id = ?").get(campaignId, userId);
    const hasAssignedPms = db.prepare("SELECT 1 FROM campaign_pms WHERE campaign_id = ?").get(campaignId) || existing.pm_user_id;

    let isAllowed = false;
    if (hasAssignedPms) {
      isAllowed = !!isAssignedToCamp;
    } else {
      isAllowed = existing.server_pm_id === userId || 
                  db.prepare("SELECT 1 FROM server_pms WHERE server_id = ? AND pm_id = ? AND status = 'active'").get(existing.server_id, userId);
    }

    if (!isAllowed) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta campaña.' });
    }
  }

  // Validación de presupuesto al actualizar
  if (budget_internal !== undefined) {
    const parsedBudget = parseFloat(budget_internal) || 0;
    const serverBudget = parseFloat(existing.server_budget) || 0;

    if (serverBudget > 0) {
      if (parsedBudget > serverBudget) {
        return res.status(400).json({
          error: `El presupuesto de la campaña ($${parsedBudget.toFixed(2)}) no puede exceder el presupuesto total del servidor ($${serverBudget.toFixed(2)}).`
        });
      }

      const otherAggRow = db.prepare(`
        SELECT COALESCE(SUM(budget_internal), 0) as allocated
        FROM campaigns
        WHERE server_id = ? AND id != ? AND deleted_at IS NULL
      `).get(existing.server_id, campaignId);
      const otherAllocated = parseFloat(otherAggRow?.allocated) || 0;
      const remainingBudget = Math.max(0, serverBudget - otherAllocated);

      if (otherAllocated + parsedBudget > serverBudget) {
        return res.status(400).json({
          error: `El presupuesto acumulado de las campañas en este servidor ($${(otherAllocated + parsedBudget).toFixed(2)}) excede el límite del servidor ($${serverBudget.toFixed(2)}). Presupuesto restante disponible: $${remainingBudget.toFixed(2)}.`
        });
      }
    }
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
        target_evidences = COALESCE(?, target_evidences),
        target_hours = COALESCE(?, target_hours),
        pm_fee = COALESCE(?, pm_fee),
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
    target_evidences !== undefined ? parseInt(target_evidences, 10) : null,
    target_hours !== undefined ? parseFloat(target_hours) : null,
    pm_fee !== undefined ? parseFloat(pm_fee) : null,
    notes || null,
    campaignId
  );

  // Update assigned PMs if pm_ids or pm_user_id is passed
  if (req.body.pm_ids !== undefined || req.body.pm_user_id !== undefined) {
    let newPmIds = [];
    if (Array.isArray(req.body.pm_ids)) {
      newPmIds = req.body.pm_ids.map(id => parseInt(id, 10)).filter(Boolean);
    } else if (req.body.pm_user_id) {
      newPmIds = [parseInt(req.body.pm_user_id, 10)].filter(Boolean);
    }
    newPmIds = [...new Set(newPmIds)];

    db.prepare('DELETE FROM campaign_pms WHERE campaign_id = ?').run(campaignId);
    if (newPmIds.length > 0) {
      const insPm = db.prepare('INSERT INTO campaign_pms (campaign_id, pm_id) VALUES (?, ?)');
      for (const pId of newPmIds) {
        insPm.run(campaignId, pId);
      }
    }
    db.prepare('UPDATE campaigns SET pm_user_id = ? WHERE id = ?').run(newPmIds[0] || null, campaignId);
  }

  // Notification & Audit specialized logging and automatic PM fee liquidation
  const effectivePmFee = pm_fee !== undefined ? (parseFloat(pm_fee) || 0) : (parseFloat(existing.pm_fee) || 0);

  if (status === 'completed' && existing.status !== 'completed') {
    // Si la campaña tiene honorario de PM definido, liquidarlo automáticamente como gasto de la campaña
    if (effectivePmFee > 0) {
      const existingTx = db.prepare(`
        SELECT id FROM server_financial_transactions
        WHERE campaign_id = ? AND category = 'pm_fee' AND type = 'expense_pm'
      `).get(campaignId);

      if (!existingTx) {
        const campPms = db.prepare(`
          SELECT cp.pm_id, u.full_name, u.username
          FROM campaign_pms cp
          JOIN users u ON cp.pm_id = u.id
          WHERE cp.campaign_id = ?
        `).all(campaignId);

        const targetPms = campPms.length > 0 ? campPms : (existing.pm_user_id ? [db.prepare('SELECT id as pm_id, full_name, username FROM users WHERE id = ?').get(existing.pm_user_id)].filter(Boolean) : []);
        const pmCount = targetPms.length || 1;
        const splitAmount = parseFloat((effectivePmFee / pmCount).toFixed(2));
        const today = new Date().toISOString().split('T')[0];

        const insTx = db.prepare(`
          INSERT INTO server_financial_transactions (
            server_id, campaign_id, type, category, concept, amount, transaction_date,
            payment_reference, payment_method, status, recipient_or_payer_name, recipient_user_id,
            notes, created_by_user_id
          ) VALUES (?, ?, 'expense_pm', 'pm_fee', ?, ?, ?, ?, 'Transferencia', 'completed', ?, ?, ?, ?)
        `);

        for (const p of targetPms) {
          insTx.run(
            existing.server_id,
            campaignId,
            `Honorario Cierre Campaña: ${name ? name.trim() : existing.name}`,
            splitAmount,
            today,
            `PM-CAMP-${campaignId}-${p.pm_id || p.id}`,
            p.full_name || p.username || 'PM Asignado',
            p.pm_id || p.id,
            `Liquidación automática por conclusión de campaña "${existing.name}"`,
            userId
          );
        }
      }
    }

    const creators = db.prepare('SELECT creator_id FROM campaign_creators WHERE campaign_id = ?').all(campaignId);
    const notifyStmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const cr of creators) {
      notifyStmt.run(
        cr.creator_id,
        'Campaña Concluida',
        `La campaña "${existing.name}" ha concluido y fue archivada en el historial.`,
        'info',
        '/dashboard/creator?tab=campaigns'
      );
    }
    logAudit(req.user.id, 'CAMPAIGN_COMPLETED', 'campaigns', campaignId, { name: existing.name }, req);
  } else if (status === 'active' && existing.status === 'completed') {
    // Si se reactiva, anular la transacción automática de cierre para recalcular
    db.prepare(`
      DELETE FROM server_financial_transactions
      WHERE campaign_id = ? AND category = 'pm_fee' AND concept LIKE 'Honorario Cierre Campaña:%'
    `).run(campaignId);
    logAudit(req.user.id, 'CAMPAIGN_REACTIVATED', 'campaigns', campaignId, { name: existing.name }, req);
  } else if (status === 'paused' && existing.status !== 'paused') {
    logAudit(req.user.id, 'CAMPAIGN_PAUSED', 'campaigns', campaignId, { name: existing.name }, req);
  } else {
    logAudit(req.user.id, 'CAMPAIGN_UPDATED', 'campaigns', campaignId, { name: existing.name, status }, req);
  }

  return res.json({ message: 'Campaña actualizada exitosamente.' });
}

function assignCreatorToCampaign(req, res) {
  const campaignId = parseInt(req.params.id, 10);
  const { creator_id, agreement_terms, payout_internal } = req.body;
  const { role, id: userId } = req.user;

  if (!creator_id) {
    return res.status(400).json({ error: 'creator_id es obligatorio.' });
  }

  const campaign = db.prepare(`
    SELECT c.*, s.pm_user_id as server_pm_id
    FROM campaigns c
    JOIN servers s ON c.server_id = s.id
    WHERE c.id = ? AND c.deleted_at IS NULL
  `).get(campaignId);

  if (!campaign) {
    return res.status(404).json({ error: 'Campaña no encontrada.' });
  }

  if (role === 'pm') {
    const isAssignedToCamp = campaign.pm_user_id === userId || 
      db.prepare("SELECT 1 FROM campaign_pms WHERE campaign_id = ? AND pm_id = ?").get(campaignId, userId);
    const hasAssignedPms = db.prepare("SELECT 1 FROM campaign_pms WHERE campaign_id = ?").get(campaignId) || campaign.pm_user_id;

    let isAllowed = false;
    if (hasAssignedPms) {
      isAllowed = !!isAssignedToCamp;
    } else {
      isAllowed = campaign.server_pm_id === userId || 
                  db.prepare("SELECT 1 FROM server_pms WHERE server_id = ? AND pm_id = ? AND status = 'active'").get(campaign.server_id, userId);
    }
    if (!isAllowed) {
      return res.status(403).json({ error: 'No tienes permiso para accionar streamers en esta campaña.' });
    }
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
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    creator_id,
    'Nueva Campaña Asignada',
    `Has sido incorporado a la campaña "${campaign.name}". Consulta los requisitos y actividades pendientes.`,
    'info',
    '/dashboard/streamer'
  );

  logAudit(req.user.id, 'CREATOR_ASSIGNED_TO_CAMPAIGN', 'campaign_creators', campaignId, { creatorId: creator_id }, req);

  return res.json({ message: 'Creador accionado a la campaña con éxito.' });
}

function removeCreatorFromCampaign(req, res) {
  const campaignId = parseInt(req.params.id, 10);
  const creatorId = parseInt(req.params.creatorId, 10);
  const { role, id: userId } = req.user;

  const campaign = db.prepare(`
    SELECT c.*, s.pm_user_id as server_pm_id
    FROM campaigns c
    JOIN servers s ON c.server_id = s.id
    WHERE c.id = ? AND c.deleted_at IS NULL
  `).get(campaignId);

  if (!campaign) {
    return res.status(404).json({ error: 'Campaña no encontrada.' });
  }

  if (role === 'pm') {
    const isAssignedToCamp = campaign.pm_user_id === userId || 
      db.prepare("SELECT 1 FROM campaign_pms WHERE campaign_id = ? AND pm_id = ?").get(campaignId, userId);
    const hasAssignedPms = db.prepare("SELECT 1 FROM campaign_pms WHERE campaign_id = ?").get(campaignId) || campaign.pm_user_id;

    let isAllowed = false;
    if (hasAssignedPms) {
      isAllowed = !!isAssignedToCamp;
    } else {
      isAllowed = campaign.server_pm_id === userId || 
                  db.prepare("SELECT 1 FROM server_pms WHERE server_id = ? AND pm_id = ? AND status = 'active'").get(campaign.server_id, userId);
    }
    if (!isAllowed) {
      return res.status(403).json({ error: 'No tienes permiso para desvincular streamers de esta campaña.' });
    }
  }

  db.prepare('DELETE FROM campaign_creators WHERE campaign_id = ? AND creator_id = ?').run(campaignId, creatorId);

  logAudit(req.user.id, 'CREATOR_REMOVED_FROM_CAMPAIGN', 'campaign_creators', campaignId, { creatorId }, req);

  return res.json({ message: 'Creador desvinculado de la campaña.' });
}

function deleteCampaign(req, res) {
  const campaignId = parseInt(req.params.id, 10);

  const existing = db.prepare('SELECT * FROM campaigns WHERE id = ? AND deleted_at IS NULL').get(campaignId);
  if (!existing) {
    return res.status(404).json({ error: 'Campaña no encontrada.' });
  }

  db.prepare("UPDATE campaigns SET deleted_at = CURRENT_TIMESTAMP, status = 'completed' WHERE id = ?").run(campaignId);

  // Clean auto-generated PM completion transactions so expenses don't linger
  db.prepare(`
    DELETE FROM server_financial_transactions
    WHERE campaign_id = ? AND category = 'pm_fee' AND concept LIKE 'Honorario Cierre Campaña:%'
  `).run(campaignId);

  logAudit(req.user.id, 'CAMPAIGN_DELETED', 'campaigns', campaignId, { name: existing.name }, req);

  return res.json({ message: 'Campaña eliminada correctamente.' });
}

module.exports = {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  assignCreatorToCampaign,
  removeCreatorFromCampaign
};
