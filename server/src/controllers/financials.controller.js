const { db } = require('../db');
const { logAudit } = require('../middleware/rbac');

/**
 * GET /api/financials/servers
 * Exclusivo de Super Admin & Director Ops.
 * Devuelve el balance financiero completo por servidor:
 * - Ingresos por apertura y contratos
 * - Gastos en streamers (evidencias pagadas)
 * - Gastos en PM asignado (honorarios y comisiones)
 * - Beneficio Neto y Margen de Rentabilidad
 */
function getServerFinancialReport(req, res) {
  const { role, id: userId } = req.user;

  if (role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({
      error: 'Acceso denegado: Únicamente el Administrador puede consultar o gestionar los informes financieros y de ingresos de servidores.'
    });
  }

  const { server_id, timeRange = 'all' } = req.query;

  let transDateFilter = '';
  let evidenceDateFilter = '';

  if (timeRange === '30d') {
    transDateFilter = "AND transaction_date >= datetime('now', '-30 days')";
    evidenceDateFilter = "AND ae.paid_at >= datetime('now', '-30 days')";
  } else if (timeRange === '7d') {
    transDateFilter = "AND transaction_date >= datetime('now', '-7 days')";
    evidenceDateFilter = "AND ae.paid_at >= datetime('now', '-7 days')";
  }

  let serverQuery = `
    SELECT 
      s.id, s.name, s.game, s.status, s.logo_url, s.created_at,
      pm.id as pm_id, pm.full_name as pm_name, pm.username as pm_username, pm.email as pm_email,
      owner.id as owner_id, owner.full_name as owner_name, owner.email as owner_email
    FROM servers s
    LEFT JOIN users pm ON s.pm_user_id = pm.id
    LEFT JOIN users owner ON s.owner_user_id = owner.id
    WHERE s.deleted_at IS NULL
  `;
  const params = [];

  if (server_id) {
    serverQuery += ' AND s.id = ?';
    params.push(parseInt(server_id, 10));
  }

  serverQuery += ' ORDER BY s.name ASC';

  const servers = db.prepare(serverQuery).all(...params);

  let grandTotalIncome = 0;
  let grandTotalStreamersExpense = 0;
  let grandTotalPmExpense = 0;

  const serverReports = servers.map(srv => {
    // 1. Incomes from server_financial_transactions
    const incomes = db.prepare(`
      SELECT id, category, concept, amount, transaction_date, payment_reference, payment_method, recipient_or_payer_name, notes, created_at
      FROM server_financial_transactions
      WHERE server_id = ? AND type = 'income' ${transDateFilter}
      ORDER BY transaction_date DESC, id DESC
    `).all(srv.id);

    const totalIncome = incomes.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);

    // 2. PM Expenses from server_financial_transactions
    const pmExpenses = db.prepare(`
      SELECT id, category, concept, amount, transaction_date, payment_reference, payment_method, recipient_or_payer_name, notes, created_at
      FROM server_financial_transactions
      WHERE server_id = ? AND type = 'expense_pm' ${transDateFilter}
      ORDER BY transaction_date DESC, id DESC
    `).all(srv.id);

    const totalPmExpense = pmExpenses.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);

    // 3. Streamer Expenses from activity_evidences (paid) + any manual streamer expense records
    const paidEvidences = db.prepare(`
      SELECT 
        ae.id, ae.payout_amount, ae.payment_reference, ae.paid_at, ae.duration_minutes, ae.total_views, ae.platform,
        u.id as creator_id, u.full_name as creator_name, u.username as creator_username,
        cp.alias as creator_alias,
        c.id as campaign_id, c.name as campaign_name
      FROM activity_evidences ae
      JOIN campaigns c ON ae.campaign_id = c.id
      JOIN users u ON ae.creator_id = u.id
      LEFT JOIN creator_profiles cp ON ae.creator_id = cp.user_id
      WHERE c.server_id = ? AND ae.status = 'paid' ${evidenceDateFilter}
      ORDER BY ae.paid_at DESC
    `).all(srv.id);

    const manualStreamerExpenses = db.prepare(`
      SELECT id, category, concept, amount, transaction_date, payment_reference, payment_method, recipient_or_payer_name, notes, created_at
      FROM server_financial_transactions
      WHERE server_id = ? AND type = 'expense_streamer' ${transDateFilter}
      ORDER BY transaction_date DESC, id DESC
    `).all(srv.id);

    const totalStreamersExpense = paidEvidences.reduce((acc, ev) => acc + (parseFloat(ev.payout_amount) || 0), 0) +
                                  manualStreamerExpenses.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);

    // 4. Balances and margins
    const totalExpenses = totalStreamersExpense + totalPmExpense;
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? parseFloat(((netProfit / totalIncome) * 100).toFixed(1)) : 0;

    grandTotalIncome += totalIncome;
    grandTotalStreamersExpense += totalStreamersExpense;
    grandTotalPmExpense += totalPmExpense;

    return {
      server_id: srv.id,
      server_name: srv.name,
      game: srv.game,
      status: srv.status,
      logo_url: srv.logo_url,
      owner: {
        id: srv.owner_id,
        name: srv.owner_name,
        email: srv.owner_email
      },
      pm: {
        id: srv.pm_id,
        name: srv.pm_name,
        username: srv.pm_username,
        email: srv.pm_email
      },
      financials: {
        total_income: parseFloat(totalIncome.toFixed(2)),
        total_streamers_expense: parseFloat(totalStreamersExpense.toFixed(2)),
        total_pm_expense: parseFloat(totalPmExpense.toFixed(2)),
        total_expenses: parseFloat(totalExpenses.toFixed(2)),
        net_profit: parseFloat(netProfit.toFixed(2)),
        profit_margin_percentage: profitMargin,
        is_profitable: netProfit >= 0
      },
      breakdown: {
        incomes,
        pm_expenses: pmExpenses,
        paid_streamers: paidEvidences,
        manual_streamer_expenses: manualStreamerExpenses
      }
    };
  });

  const grandTotalExpenses = grandTotalStreamersExpense + grandTotalPmExpense;
  const grandNetProfit = grandTotalIncome - grandTotalExpenses;
  const grandProfitMargin = grandTotalIncome > 0 ? parseFloat(((grandNetProfit / grandTotalIncome) * 100).toFixed(1)) : 0;

  return res.json({
    timeRange,
    summary: {
      total_platform_income: parseFloat(grandTotalIncome.toFixed(2)),
      total_streamers_paid: parseFloat(grandTotalStreamersExpense.toFixed(2)),
      total_pms_paid: parseFloat(grandTotalPmExpense.toFixed(2)),
      total_expenses: parseFloat(grandTotalExpenses.toFixed(2)),
      net_platform_profit: parseFloat(grandNetProfit.toFixed(2)),
      profit_margin_percentage: grandProfitMargin,
      total_servers_monitored: servers.length,
      profitable_servers_count: serverReports.filter(s => s.financials.is_profitable).length,
      deficit_servers_count: serverReports.filter(s => !s.financials.is_profitable).length
    },
    servers: serverReports
  });
}

/**
 * POST /api/financials/transactions
 * Exclusivo de Super Admin & Director Ops.
 * Permite registrar pagos que entran por abrir un servidor o gastos a favor del PM / Streamer.
 */
function createFinancialTransaction(req, res) {
  const { role, id: userId } = req.user;

  if (role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({
      error: 'Acceso denegado: Únicamente el Administrador puede registrar movimientos financieros de servidores.'
    });
  }

  const {
    server_id,
    type, // 'income', 'expense_pm', 'expense_streamer'
    category = 'opening_fee', // 'opening_fee', 'monthly_contract', 'pm_fee', etc.
    concept,
    amount,
    transaction_date,
    payment_reference,
    payment_method = 'Transferencia',
    recipient_or_payer_name,
    recipient_user_id,
    notes
  } = req.body;

  if (!server_id || !concept || !amount || !transaction_date) {
    return res.status(400).json({
      error: 'Servidor, concepto, monto y fecha de transacción son obligatorios.'
    });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un valor numérico positivo mayor a cero.' });
  }

  if (!['income', 'expense_pm', 'expense_streamer', 'expense_platform'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de transacción inválido (income, expense_pm, expense_streamer).' });
  }

  const server = db.prepare('SELECT id, name, pm_user_id, owner_user_id FROM servers WHERE id = ? AND deleted_at IS NULL').get(server_id);
  if (!server) {
    return res.status(404).json({ error: 'Servidor no encontrado.' });
  }

  const result = db.prepare(`
    INSERT INTO server_financial_transactions (
      server_id, type, category, concept, amount, transaction_date,
      payment_reference, payment_method, status, recipient_or_payer_name,
      recipient_user_id, notes, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)
  `).run(
    server_id,
    type,
    category,
    concept.trim(),
    parsedAmount,
    transaction_date,
    payment_reference ? payment_reference.trim() : `FIN-${Date.now()}`,
    payment_method,
    recipient_or_payer_name ? recipient_or_payer_name.trim() : null,
    recipient_user_id || null,
    notes ? notes.trim() : null,
    userId
  );

  const transactionId = Number(result.lastInsertRowid);

  logAudit(userId, 'SERVER_FINANCIAL_RECORD_CREATED', 'server_financial_transactions', transactionId, {
    serverId: server_id,
    serverName: server.name,
    type,
    category,
    amount: parsedAmount,
    concept
  }, req);

  return res.status(201).json({
    message: 'Movimiento financiero registrado correctamente.',
    id: transactionId,
    server_id,
    type,
    amount: parsedAmount
  });
}

/**
 * DELETE /api/financials/transactions/:id
 * Exclusivo de Super Admin.
 */
function deleteFinancialTransaction(req, res) {
  const { role, id: userId } = req.user;

  if (role !== 'super_admin') {
    return res.status(403).json({
      error: 'Acceso denegado: Únicamente el Super Administrador puede anular transacciones financieras.'
    });
  }

  const transactionId = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT * FROM server_financial_transactions WHERE id = ?').get(transactionId);
  if (!row) {
    return res.status(404).json({ error: 'Registro financiero no encontrado.' });
  }

  db.prepare('DELETE FROM server_financial_transactions WHERE id = ?').run(transactionId);

  logAudit(userId, 'SERVER_FINANCIAL_RECORD_DELETED', 'server_financial_transactions', transactionId, {
    previous: row
  }, req);

  return res.json({ message: 'Registro financiero anulado correctamente.' });
}

module.exports = {
  getServerFinancialReport,
  createFinancialTransaction,
  deleteFinancialTransaction
};
