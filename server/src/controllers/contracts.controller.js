const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

/**
 * GET /api/contracts
 * Scoped list of contracts (Streamers and PMs)
 */
function getContracts(req, res) {
  const { role, id: userId } = req.user;
  const { server_id, role_filter, status } = req.query;

  let query = `
    SELECT 
      sc.*,
      s.name as server_name, s.game as server_game, s.logo_url as server_logo,
      s.owner_user_id, s.pm_user_id as server_pm_id,
      u.full_name as user_full_name, u.username as user_username, u.email as user_email,
      cp.alias as creator_alias, cp.avatar_url as creator_avatar,
      (sc.total_budgeted - sc.total_paid) as remaining_balance
    FROM server_contracts sc
    JOIN servers s ON sc.server_id = s.id
    JOIN users u ON sc.user_id = u.id
    LEFT JOIN creator_profiles cp ON u.id = cp.user_id
    WHERE s.deleted_at IS NULL
  `;
  const params = [];

  // Scoping
  if (role === 'pm') {
    // PM can see contracts for servers they manage, or their own contract
    query += ' AND (s.pm_user_id = ? OR sc.user_id = ?)';
    params.push(userId, userId);
  } else if (role === 'creator') {
    // Creator only sees their own contracts
    query += ' AND sc.user_id = ?';
    params.push(userId);
  } else if (role === 'server_owner') {
    // Server owner only sees contracts for their server
    query += ' AND s.owner_user_id = ?';
    params.push(userId);
  }

  // Filters
  if (server_id) {
    query += ' AND sc.server_id = ?';
    params.push(parseInt(server_id, 10));
  }

  if (role_filter) {
    query += ' AND sc.role = ?';
    params.push(role_filter);
  }

  if (status) {
    query += ' AND sc.status = ?';
    params.push(status);
  }

  query += ' ORDER BY sc.server_id ASC, sc.role DESC, sc.id DESC';

  const contracts = db.prepare(query).all(...params);

  // Sanitization for non-admin roles
  const sanitized = contracts.map(c => {
    const copy = { ...c };
    if (role === 'server_owner') {
      // Strip internal base amounts or rates if needed, or leave transparent as agreed
      // Server owner can see budgeted costs that impact their server
    }
    return copy;
  });

  return res.json(sanitized);
}

/**
 * GET /api/contracts/:id
 */
function getContractById(req, res) {
  const contractId = parseInt(req.params.id, 10);
  const { role, id: userId } = req.user;

  const contract = db.prepare(`
    SELECT 
      sc.*,
      s.name as server_name, s.game as server_game, s.logo_url as server_logo,
      s.owner_user_id, s.pm_user_id as server_pm_id,
      u.full_name as user_full_name, u.username as user_username, u.email as user_email,
      cp.alias as creator_alias, cp.avatar_url as creator_avatar,
      (sc.total_budgeted - sc.total_paid) as remaining_balance
    FROM server_contracts sc
    JOIN servers s ON sc.server_id = s.id
    JOIN users u ON sc.user_id = u.id
    LEFT JOIN creator_profiles cp ON u.id = cp.user_id
    WHERE sc.id = ? AND s.deleted_at IS NULL
  `).get(contractId);

  if (!contract) {
    return res.status(404).json({ error: 'Contrato no encontrado.' });
  }

  // Permission check
  if (role === 'creator' && contract.user_id !== userId) {
    return res.status(403).json({ error: 'Acceso denegado a este contrato.' });
  }
  if (role === 'pm' && contract.server_pm_id !== userId && contract.user_id !== userId) {
    return res.status(403).json({ error: 'Acceso denegado a este contrato.' });
  }
  if (role === 'server_owner' && contract.owner_user_id !== userId) {
    return res.status(403).json({ error: 'Acceso denegado a este contrato.' });
  }

  return res.json(contract);
}

/**
 * POST /api/contracts
 * Create a new contract for a Streamer or PM on a Server
 */
function createContract(req, res) {
  const { role: userRole, id: creatorUserId } = req.user;
  const {
    server_id,
    user_id,
    role: targetRole, // 'pm' | 'streamer'
    contract_type,   // 'hourly' | 'fixed_fee' | 'hybrid' | 'monthly_retainer' | 'commission_percentage' | 'cpm_views'
    title,
    base_amount = 0,
    hourly_rate = 0,
    hours_committed = 0,
    cpm_rate = 0,
    commission_percentage = 0,
    total_budgeted: explicitTotal,
    currency = 'USD',
    status = 'active',
    start_date,
    end_date,
    terms_description,
    notes
  } = req.body;

  if (!server_id || !user_id || !targetRole || !contract_type || !title) {
    return res.status(400).json({
      error: 'server_id, user_id, role (pm|streamer), contract_type y title son obligatorios.'
    });
  }

  // Verify server
  const server = db.prepare('SELECT * FROM servers WHERE id = ? AND deleted_at IS NULL').get(server_id);
  if (!server) {
    return res.status(404).json({ error: 'Servidor no encontrado.' });
  }

  if (server.status === 'suspended') {
    return res.status(400).json({ error: 'No se pueden crear contratos en un servidor suspendido.' });
  }

  // Verify user
  const targetUser = db.prepare('SELECT id, full_name, email, role FROM users WHERE id = ?').get(user_id);
  if (!targetUser) {
    return res.status(404).json({ error: 'Usuario a contratar no encontrado.' });
  }

  // Calculate final budgeted amount (presupuesto final)
  const baseAmt = parseFloat(base_amount) || 0;
  const hRate = parseFloat(hourly_rate) || 0;
  const hComm = parseFloat(hours_committed) || 0;
  const commPct = parseFloat(commission_percentage) || 0;

  let calculatedBudget = 0;
  if (explicitTotal !== undefined && explicitTotal !== null && parseFloat(explicitTotal) > 0) {
    calculatedBudget = parseFloat(explicitTotal);
  } else if (contract_type === 'hourly') {
    calculatedBudget = hRate * hComm;
  } else if (contract_type === 'fixed_fee') {
    calculatedBudget = baseAmt;
  } else if (contract_type === 'hybrid') {
    calculatedBudget = baseAmt + (hRate * hComm);
  } else if (contract_type === 'monthly_retainer') {
    calculatedBudget = baseAmt;
  } else if (contract_type === 'commission_percentage') {
    // If base fee exists, use it; commission will be calculated on settlements
    calculatedBudget = baseAmt;
  } else if (contract_type === 'cpm_views') {
    calculatedBudget = baseAmt;
  } else {
    calculatedBudget = baseAmt + (hRate * hComm);
  }

  const result = db.prepare(`
    INSERT INTO server_contracts (
      server_id, user_id, role, contract_type, title,
      base_amount, hourly_rate, hours_committed, cpm_rate, commission_percentage,
      total_budgeted, total_paid, currency, status,
      start_date, end_date, terms_description, notes, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    server_id,
    user_id,
    targetRole,
    contract_type,
    title.trim(),
    baseAmt,
    hRate,
    hComm,
    parseFloat(cpm_rate) || 0,
    commPct,
    parseFloat(calculatedBudget.toFixed(2)),
    currency,
    status,
    start_date || null,
    end_date || null,
    terms_description || null,
    notes || null,
    creatorUserId
  );

  const contractId = result.lastInsertRowid;

  // If contract is for streamer, also ensure assigned in server_creators
  if (targetRole === 'streamer') {
    const existingSc = db.prepare('SELECT id FROM server_creators WHERE server_id = ? AND creator_id = ?').get(server_id, user_id);
    if (!existingSc) {
      db.prepare("INSERT INTO server_creators (server_id, creator_id, status) VALUES (?, ?, 'active')").run(server_id, user_id);
    }
  }

  // Notify contracted user
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    user_id,
    'Nuevo Contrato Registrado',
    `Has sido vinculado al contrato "${title.trim()}" en el servidor "${server.name}" con un presupuesto de $${calculatedBudget.toFixed(2)} ${currency}.`,
    'success',
    targetRole === 'pm' ? '/dashboard/pm?tab=servers' : '/dashboard/creator?tab=campaigns'
  );

  logAudit(creatorUserId, 'CONTRACT_CREATED', 'server_contracts', contractId, {
    server_id,
    user_id,
    role: targetRole,
    contract_type,
    total_budgeted: calculatedBudget
  }, req);

  return res.status(201).json({
    id: contractId,
    server_id,
    user_id,
    role: targetRole,
    contract_type,
    title: title.trim(),
    total_budgeted: calculatedBudget,
    status
  });
}

/**
 * PUT /api/contracts/:id
 * Update contract terms or status
 */
function updateContract(req, res) {
  const contractId = parseInt(req.params.id, 10);
  const {
    title,
    contract_type,
    base_amount,
    hourly_rate,
    hours_committed,
    cpm_rate,
    commission_percentage,
    total_budgeted,
    status,
    start_date,
    end_date,
    terms_description,
    notes
  } = req.body;

  const existing = db.prepare('SELECT * FROM server_contracts WHERE id = ?').get(contractId);
  if (!existing) {
    return res.status(404).json({ error: 'Contrato no encontrado.' });
  }

  // Recompute total_budgeted if fields provided
  const baseAmt = base_amount !== undefined ? parseFloat(base_amount) : existing.base_amount;
  const hRate = hourly_rate !== undefined ? parseFloat(hourly_rate) : existing.hourly_rate;
  const hComm = hours_committed !== undefined ? parseFloat(hours_committed) : existing.hours_committed;
  const cType = contract_type || existing.contract_type;

  let newBudget = existing.total_budgeted;
  if (total_budgeted !== undefined && total_budgeted !== null) {
    newBudget = parseFloat(total_budgeted);
  } else if (base_amount !== undefined || hourly_rate !== undefined || hours_committed !== undefined) {
    if (cType === 'hourly') newBudget = hRate * hComm;
    else if (cType === 'fixed_fee') newBudget = baseAmt;
    else if (cType === 'hybrid') newBudget = baseAmt + (hRate * hComm);
    else if (cType === 'monthly_retainer') newBudget = baseAmt;
    else newBudget = baseAmt + (hRate * hComm);
  }

  db.prepare(`
    UPDATE server_contracts
    SET title = COALESCE(?, title),
        contract_type = COALESCE(?, contract_type),
        base_amount = ?,
        hourly_rate = ?,
        hours_committed = ?,
        cpm_rate = COALESCE(?, cpm_rate),
        commission_percentage = COALESCE(?, commission_percentage),
        total_budgeted = ?,
        status = COALESCE(?, status),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        terms_description = COALESCE(?, terms_description),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title ? title.trim() : null,
    contract_type || null,
    baseAmt,
    hRate,
    hComm,
    cpm_rate !== undefined ? parseFloat(cpm_rate) : null,
    commission_percentage !== undefined ? parseFloat(commission_percentage) : null,
    parseFloat(newBudget.toFixed(2)),
    status || null,
    start_date || null,
    end_date || null,
    terms_description || null,
    notes || null,
    contractId
  );

  logAudit(req.user.id, 'CONTRACT_UPDATED', 'server_contracts', contractId, {
    title: existing.title,
    previous_budget: existing.total_budgeted,
    new_budget: newBudget,
    status: status || existing.status
  }, req);

  return res.json({ message: 'Contrato actualizado exitosamente.', id: contractId, total_budgeted: newBudget });
}

/**
 * DELETE /api/contracts/:id
 */
function deleteContract(req, res) {
  const contractId = parseInt(req.params.id, 10);

  const existing = db.prepare('SELECT * FROM server_contracts WHERE id = ?').get(contractId);
  if (!existing) {
    return res.status(404).json({ error: 'Contrato no encontrado.' });
  }

  db.prepare('DELETE FROM server_contracts WHERE id = ?').run(contractId);

  logAudit(req.user.id, 'CONTRACT_DELETED', 'server_contracts', contractId, { title: existing.title, server_id: existing.server_id }, req);

  return res.json({ message: 'Contrato eliminado correctamente.' });
}

/**
 * POST /api/contracts/:id/pay
 * Register a payment against a contract.
 * Updates contract total_paid and creates a record in server_financial_transactions
 * which automatically deducts from the server's net profit!
 */
function recordContractPayment(req, res) {
  const contractId = parseInt(req.params.id, 10);
  const { amount, payment_reference, payment_method = 'Transferencia', notes } = req.body;

  const parsedAmount = parseFloat(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ error: 'El monto a abonar debe ser un número positivo.' });
  }

  const contract = db.prepare(`
    SELECT sc.*, s.name as server_name, u.full_name as user_name
    FROM server_contracts sc
    JOIN servers s ON sc.server_id = s.id
    JOIN users u ON sc.user_id = u.id
    WHERE sc.id = ?
  `).get(contractId);

  if (!contract) {
    return res.status(404).json({ error: 'Contrato no encontrado.' });
  }

  const newTotalPaid = contract.total_paid + parsedAmount;
  const newStatus = (newTotalPaid >= contract.total_budgeted && contract.total_budgeted > 0) ? 'completed' : contract.status;

  // 1. Update contract
  db.prepare(`
    UPDATE server_contracts
    SET total_paid = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newTotalPaid, newStatus, contractId);

  // 2. Insert into server_financial_transactions (descontando de la ganancia del servidor)
  const transType = contract.role === 'pm' ? 'expense_pm' : 'expense_streamer';
  const transCategory = contract.role === 'pm' ? 'pm_fee' : 'streamer_payout';
  const concept = `Liquidación Contrato: ${contract.title}`;

  db.prepare(`
    INSERT INTO server_financial_transactions (
      server_id, type, category, concept, amount, transaction_date,
      payment_reference, payment_method, status, recipient_or_payer_name,
      recipient_user_id, contract_id, notes, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?, ?, 'completed', ?, ?, ?, ?, ?)
  `).run(
    contract.server_id,
    transType,
    transCategory,
    concept,
    parsedAmount,
    payment_reference || `TX-CTR-${contractId}-${Date.now().toString().slice(-4)}`,
    payment_method,
    contract.user_name,
    contract.user_id,
    contractId,
    notes || `Pago abonado al contrato #${contractId}`,
    req.user.id
  );

  // 3. Notify recipient
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    contract.user_id,
    'Pago de Contrato Procesado',
    `Se ha registrado una liquidación de $${parsedAmount.toFixed(2)} USD a tu contrato "${contract.title}" en el servidor "${contract.server_name}".`,
    'success',
    contract.role === 'pm' ? '/dashboard/pm?tab=servers' : '/dashboard/creator?tab=evidences'
  );

  logAudit(req.user.id, 'CONTRACT_PAYMENT_RECORDED', 'server_contracts', contractId, {
    amount: parsedAmount,
    previous_paid: contract.total_paid,
    new_total_paid: newTotalPaid,
    remaining_balance: contract.total_budgeted - newTotalPaid,
    server_id: contract.server_id
  }, req);

  return res.json({
    message: 'Pago liquidado y registrado exitosamente.',
    contract_id: contractId,
    amount_paid: parsedAmount,
    total_paid: newTotalPaid,
    remaining_balance: parseFloat((contract.total_budgeted - newTotalPaid).toFixed(2)),
    status: newStatus
  });
}

module.exports = {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  recordContractPayment
};
