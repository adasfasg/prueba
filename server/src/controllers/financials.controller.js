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
      s.id, s.name, s.game, s.status, s.budget as server_budget, s.logo_url, s.created_at,
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
  let grandTotalServerBudgets = 0;
  let grandTotalCampaignsBudget = 0;
  let grandTotalCampaignsSpent = 0;
  let grandTotalCampaignsNetProfit = 0;

  const serverReports = servers.map(srv => {
    // 0. Assigned PMs from server_pms
    const assignedPms = db.prepare(`
      SELECT 
        u.id as pm_id,
        u.full_name as pm_name,
        u.username as pm_username,
        u.email as pm_email,
        sp.assigned_at
      FROM server_pms sp
      JOIN users u ON sp.pm_id = u.id
      WHERE sp.server_id = ? AND sp.status = 'active' AND u.deleted_at IS NULL
      ORDER BY sp.id ASC
    `).all(srv.id);

    if (assignedPms.length === 0 && srv.pm_id && srv.pm_name) {
      assignedPms.push({
        pm_id: srv.pm_id,
        pm_name: srv.pm_name,
        pm_username: srv.pm_username,
        pm_email: srv.pm_email
      });
    }

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
      SELECT id, category, concept, amount, transaction_date, payment_reference, payment_method, recipient_or_payer_name, notes, created_at, campaign_id
      FROM server_financial_transactions
      WHERE server_id = ? AND type = 'expense_pm'
        AND (campaign_id IS NULL OR campaign_id NOT IN (SELECT id FROM campaigns WHERE deleted_at IS NOT NULL))
        ${transDateFilter}
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
      WHERE c.server_id = ? AND ae.status = 'paid' AND c.deleted_at IS NULL ${evidenceDateFilter}
      ORDER BY ae.paid_at DESC
    `).all(srv.id);

    const manualStreamerExpenses = db.prepare(`
      SELECT id, category, concept, amount, transaction_date, payment_reference, payment_method, recipient_or_payer_name, notes, created_at, campaign_id
      FROM server_financial_transactions
      WHERE server_id = ? AND type = 'expense_streamer'
        AND (campaign_id IS NULL OR campaign_id NOT IN (SELECT id FROM campaigns WHERE deleted_at IS NOT NULL))
        ${transDateFilter}
      ORDER BY transaction_date DESC, id DESC
    `).all(srv.id);

    const totalStreamersExpense = paidEvidences.reduce((acc, ev) => acc + (parseFloat(ev.payout_amount) || 0), 0) +
                                  manualStreamerExpenses.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);

    // 4. Contracts for this server (Streamers and PMs) with final budget calculation
    const contracts = db.prepare(`
      SELECT 
        sc.*,
        u.full_name as user_full_name, u.username as user_username,
        cp.alias as creator_alias,
        (sc.total_budgeted - sc.total_paid) as remaining_balance
      FROM server_contracts sc
      JOIN users u ON sc.user_id = u.id
      LEFT JOIN creator_profiles cp ON u.id = cp.user_id
      WHERE sc.server_id = ?
      ORDER BY sc.role DESC, sc.id DESC
    `).all(srv.id);

    const streamerContractsBudget = contracts
      .filter(c => c.role === 'streamer' && c.status !== 'cancelled')
      .reduce((acc, c) => acc + (parseFloat(c.total_budgeted) || 0), 0);

    const pmContractsBudget = contracts
      .filter(c => c.role === 'pm' && c.status !== 'cancelled')
      .reduce((acc, c) => acc + (parseFloat(c.total_budgeted) || 0), 0);

    const totalBudgetedContracts = streamerContractsBudget + pmContractsBudget;

    const totalContractsPaid = contracts
      .filter(c => c.status !== 'cancelled')
      .reduce((acc, c) => acc + (parseFloat(c.total_paid) || 0), 0);

    const remainingCommittedBudget = Math.max(0, totalBudgetedContracts - totalContractsPaid);

    // 5. Campaigns P&L for this server (Ganancia y Rentabilidad por Campaña)
    const rawCampaigns = db.prepare(`
      SELECT 
        c.id as campaign_id,
        c.name as campaign_name,
        c.status as campaign_status,
        c.budget_internal as campaign_budget,
        c.target_evidences,
        c.target_hours,
        c.pm_fee,
        c.start_date,
        c.end_date,
        c.pm_user_id,
        pm.full_name as pm_name,
        pm.username as pm_username,
        (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id = c.id) as creators_count,
        (SELECT COUNT(*) FROM activity_evidences ae WHERE ae.campaign_id = c.id AND ae.status IN ('approved', 'paid')) as total_evidences,
        (SELECT COALESCE(SUM(ae.duration_minutes), 0) FROM activity_evidences ae WHERE ae.campaign_id = c.id AND ae.status IN ('approved', 'paid')) as duration_minutes,
        (SELECT COALESCE(SUM(ae.total_views), 0) FROM activity_evidences ae WHERE ae.campaign_id = c.id AND ae.status IN ('approved', 'paid')) as total_views
      FROM campaigns c
      LEFT JOIN users pm ON c.pm_user_id = pm.id
      WHERE c.server_id = ? AND c.deleted_at IS NULL
      ORDER BY c.id DESC
    `).all(srv.id);

    const campaignsPnl = rawCampaigns.map(camp => {
      const cBudget = parseFloat(camp.campaign_budget) || 0;
      const campPmFee = parseFloat(camp.pm_fee) || 0;

      // Gastos liquidados (evidencias pagadas) de esta campaña
      const paidRow = db.prepare(`
        SELECT COALESCE(SUM(payout_amount), 0) as paid_amount
        FROM activity_evidences
        WHERE campaign_id = ? AND status = 'paid' ${evidenceDateFilter}
      `).get(camp.campaign_id);
      const paidExpense = parseFloat(paidRow?.paid_amount) || 0;

      // Gastos liquidados en honorarios/comisión de PM vinculados a esta campaña
      const paidPmRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as paid_pm
        FROM server_financial_transactions
        WHERE campaign_id = ? AND type = 'expense_pm' AND status = 'completed' ${transDateFilter}
      `).get(camp.campaign_id);
      const paidPmExpense = parseFloat(paidPmRow?.paid_pm) || 0;

      const totalCampaignSpent = paidExpense + paidPmExpense;

      // Entregas aprobadas pendientes de pago
      const approvedEvs = db.prepare(`
        SELECT ae.duration_minutes, cp.hourly_rate_internal, cp.fixed_rate_internal
        FROM activity_evidences ae
        JOIN creator_profiles cp ON ae.creator_id = cp.user_id
        WHERE ae.campaign_id = ? AND ae.status = 'approved'
      `).all(camp.campaign_id);

      const approvedPendingExpense = approvedEvs.reduce((acc, ev) => {
        const hRate = parseFloat(ev.hourly_rate_internal) || 0;
        const fRate = parseFloat(ev.fixed_rate_internal) || 0;
        const hours = (ev.duration_minutes || 0) / 60;
        return acc + (hours * hRate) + fRate;
      }, 0);

      const pendingPmFee = (camp.campaign_status !== 'completed' && campPmFee > paidPmExpense) 
        ? (campPmFee - paidPmExpense) 
        : 0;

      // Ganancia de campaña = Presupuesto aún no usado = Presupuesto Asignado - Gastos Totales
      const campaignNetProfit = cBudget - totalCampaignSpent;
      const unusedBudget = campaignNetProfit;

      const projectedSpent = totalCampaignSpent + approvedPendingExpense + pendingPmFee;
      const campaignProjectedProfit = cBudget - projectedSpent;

      const campaignMargin = cBudget > 0 ? parseFloat(((campaignNetProfit / cBudget) * 100).toFixed(1)) : 0;
      const campaignProjectedMargin = cBudget > 0 ? parseFloat(((campaignProjectedProfit / cBudget) * 100).toFixed(1)) : 0;
      const budgetUsedPercentage = cBudget > 0 ? parseFloat(((totalCampaignSpent / cBudget) * 100).toFixed(1)) : 0;

      const campPms = db.prepare(`
        SELECT u.id, u.full_name as name, u.username, u.email
        FROM campaign_pms cp
        JOIN users u ON cp.pm_id = u.id
        WHERE cp.campaign_id = ?
      `).all(camp.campaign_id);

      return {
        campaign_id: camp.campaign_id,
        campaign_name: camp.campaign_name,
        status: camp.campaign_status,
        start_date: camp.start_date,
        end_date: camp.end_date,
        pms: campPms,
        pm_names: campPms.map(p => p.name).join(', ') || camp.pm_name || 'Sin PM asignado',
        pm: campPms[0] || {
          id: camp.pm_user_id,
          name: camp.pm_name,
          username: camp.pm_username
        },
        creators_count: camp.creators_count,
        total_evidences: camp.total_evidences,
        target_evidences: camp.target_evidences || 0,
        total_views: camp.total_views,
        hours_streamed: parseFloat(((camp.duration_minutes || 0) / 60).toFixed(1)),
        target_hours: parseFloat(camp.target_hours) || 0,
        budget: parseFloat(cBudget.toFixed(2)),
        paid_streamers_expense: parseFloat(paidExpense.toFixed(2)),
        paid_pm_expense: parseFloat(paidPmExpense.toFixed(2)),
        pm_fee: parseFloat(campPmFee.toFixed(2)),
        total_spent: parseFloat(totalCampaignSpent.toFixed(2)),
        unused_budget: parseFloat(unusedBudget.toFixed(2)),
        approved_pending_expense: parseFloat(approvedPendingExpense.toFixed(2)),
        net_profit: parseFloat(campaignNetProfit.toFixed(2)),
        projected_net_profit: parseFloat(campaignProjectedProfit.toFixed(2)),
        budget_execution_percentage: budgetUsedPercentage,
        profit_margin_percentage: campaignMargin,
        projected_profit_margin_percentage: campaignProjectedMargin,
        is_profitable: campaignNetProfit >= 0
      };
    });

    const serverCampaignsBudget = campaignsPnl.reduce((acc, c) => acc + c.budget, 0);
    const serverCampaignsStreamersSpent = campaignsPnl.reduce((acc, c) => acc + c.paid_streamers_expense, 0);
    const serverCampaignsPmSpent = campaignsPnl.reduce((acc, c) => acc + c.paid_pm_expense, 0);
    const serverCampaignsSpent = serverCampaignsStreamersSpent + serverCampaignsPmSpent;
    const serverCampaignsNetProfit = serverCampaignsBudget - serverCampaignsSpent;
    const serverCampaignsMargin = serverCampaignsBudget > 0 ? parseFloat(((serverCampaignsNetProfit / serverCampaignsBudget) * 100).toFixed(1)) : 0;

    // 6. Balances, margins, and server budget execution
    const serverBudget = parseFloat(srv.server_budget) || 0;
    const totalExpenses = totalStreamersExpense + totalPmExpense;
    const effectiveServerFunds = totalIncome > 0 ? totalIncome : serverBudget;
    const actualNetProfit = effectiveServerFunds - totalExpenses;
    const actualProfitMargin = effectiveServerFunds > 0 ? parseFloat(((actualNetProfit / effectiveServerFunds) * 100).toFixed(1)) : 0;
    const isProfitable = effectiveServerFunds > 0 ? (totalExpenses <= effectiveServerFunds) : (totalExpenses === 0);

    // Projected profit after deducting the full contracts final budget
    const projectedNetProfit = effectiveServerFunds - totalBudgetedContracts;
    const projectedProfitMargin = effectiveServerFunds > 0 ? parseFloat(((projectedNetProfit / effectiveServerFunds) * 100).toFixed(1)) : 0;

    // Server Budget Execution
    const budgetRemaining = Math.max(0, serverBudget - totalExpenses);
    const budgetExecutionPercentage = serverBudget > 0 ? parseFloat(((totalExpenses / serverBudget) * 100).toFixed(1)) : 0;

    grandTotalIncome += totalIncome;
    grandTotalStreamersExpense += totalStreamersExpense;
    grandTotalPmExpense += totalPmExpense;
    grandTotalServerBudgets += serverBudget;
    grandTotalCampaignsBudget += serverCampaignsBudget;
    grandTotalCampaignsSpent += serverCampaignsSpent;
    grandTotalCampaignsNetProfit += serverCampaignsNetProfit;

    return {
      server_id: srv.id,
      server_name: srv.name,
      game: srv.game,
      status: srv.status,
      logo_url: srv.logo_url,
      server_budget: parseFloat(serverBudget.toFixed(2)),
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
      assigned_pms: assignedPms,
      contracts_summary: {
        total_contracts_count: contracts.length,
        total_budgeted: parseFloat(totalBudgetedContracts.toFixed(2)),
        streamers_budget: parseFloat(streamerContractsBudget.toFixed(2)),
        pm_budget: parseFloat(pmContractsBudget.toFixed(2)),
        total_paid: parseFloat(totalContractsPaid.toFixed(2)),
        remaining_balance: parseFloat(remainingCommittedBudget.toFixed(2))
      },
      campaigns_summary: {
        total_campaigns_count: campaignsPnl.length,
        total_budget: parseFloat(serverCampaignsBudget.toFixed(2)),
        total_streamers_spent: parseFloat(serverCampaignsStreamersSpent.toFixed(2)),
        total_pm_spent: parseFloat(serverCampaignsPmSpent.toFixed(2)),
        total_spent: parseFloat(serverCampaignsSpent.toFixed(2)),
        unused_budget: parseFloat((serverCampaignsBudget - serverCampaignsSpent).toFixed(2)),
        total_net_profit: parseFloat(serverCampaignsNetProfit.toFixed(2)),
        profit_margin_percentage: serverCampaignsMargin,
        remaining_budget_for_campaigns: parseFloat(Math.max(0, serverBudget - serverCampaignsBudget).toFixed(2))
      },
      financials: {
        server_budget: parseFloat(serverBudget.toFixed(2)),
        budget_used: parseFloat(totalExpenses.toFixed(2)),
        budget_remaining: parseFloat(budgetRemaining.toFixed(2)),
        budget_execution_percentage: budgetExecutionPercentage,
        total_income: parseFloat(totalIncome.toFixed(2)),
        effective_funds: parseFloat(effectiveServerFunds.toFixed(2)),
        total_streamers_expense: parseFloat(totalStreamersExpense.toFixed(2)),
        total_pm_expense: parseFloat(totalPmExpense.toFixed(2)),
        total_expenses: parseFloat(totalExpenses.toFixed(2)),
        net_profit: parseFloat(actualNetProfit.toFixed(2)), // actual net profit/ahorro por servidor
        profit_margin_percentage: actualProfitMargin,
        is_profitable: isProfitable,
        status_label: isProfitable ? 'EFICIENTE' : 'DÉFICIT',
        // Projected profit after deducting contract commitments:
        total_budgeted_contracts: parseFloat(totalBudgetedContracts.toFixed(2)),
        projected_net_profit: parseFloat(projectedNetProfit.toFixed(2)),
        projected_profit_margin_percentage: projectedProfitMargin,
        remaining_committed_budget: parseFloat(remainingCommittedBudget.toFixed(2))
      },
      breakdown: {
        incomes,
        pm_expenses: pmExpenses,
        paid_streamers: paidEvidences,
        manual_streamer_expenses: manualStreamerExpenses,
        contracts,
        campaigns_pnl: campaignsPnl
      }
    };
  });

  const grandTotalExpenses = grandTotalStreamersExpense + grandTotalPmExpense;
  const grandTotalFunds = grandTotalIncome > 0 ? grandTotalIncome : grandTotalServerBudgets;
  const grandNetProfit = grandTotalFunds - grandTotalExpenses;
  const grandProfitMargin = grandTotalFunds > 0 ? parseFloat(((grandNetProfit / grandTotalFunds) * 100).toFixed(1)) : 0;

  // Grand total contracts
  const grandTotalBudgetedContracts = serverReports.reduce((acc, s) => acc + s.contracts_summary.total_budgeted, 0);
  const grandTotalProjectedNetProfit = grandTotalFunds - grandTotalBudgetedContracts;
  const grandTotalProjectedMargin = grandTotalFunds > 0 ? parseFloat(((grandTotalProjectedNetProfit / grandTotalFunds) * 100).toFixed(1)) : 0;
  const grandCampaignsMargin = grandTotalCampaignsBudget > 0 ? parseFloat(((grandTotalCampaignsNetProfit / grandTotalCampaignsBudget) * 100).toFixed(1)) : 0;

  return res.json({
    timeRange,
    summary: {
      total_platform_income: parseFloat(grandTotalIncome.toFixed(2)),
      total_servers_budget: parseFloat(grandTotalServerBudgets.toFixed(2)),
      total_streamers_paid: parseFloat(grandTotalStreamersExpense.toFixed(2)),
      total_pms_paid: parseFloat(grandTotalPmExpense.toFixed(2)),
      total_expenses: parseFloat(grandTotalExpenses.toFixed(2)),
      net_platform_profit: parseFloat(grandNetProfit.toFixed(2)),
      profit_margin_percentage: grandProfitMargin,
      total_budgeted_contracts: parseFloat(grandTotalBudgetedContracts.toFixed(2)),
      projected_net_platform_profit: parseFloat(grandTotalProjectedNetProfit.toFixed(2)),
      projected_profit_margin_percentage: grandTotalProjectedMargin,
      total_campaigns_budget: parseFloat(grandTotalCampaignsBudget.toFixed(2)),
      total_campaigns_spent: parseFloat(grandTotalCampaignsSpent.toFixed(2)),
      total_campaigns_net_profit: parseFloat(grandTotalCampaignsNetProfit.toFixed(2)),
      campaigns_profit_margin_percentage: grandCampaignsMargin,
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
    campaign_id,
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
      server_id, campaign_id, type, category, concept, amount, transaction_date,
      payment_reference, payment_method, status, recipient_or_payer_name,
      recipient_user_id, notes, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)
  `).run(
    server_id,
    campaign_id || null,
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
 * PUT /api/financials/transactions/:id
 * Exclusivo de Super Admin & Director Ops.
 * Permite editar el monto, concepto, categoría, fecha, referencia, método o notas de una transacción.
 */
function updateFinancialTransaction(req, res) {
  const { role, id: userId } = req.user;

  if (role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({
      error: 'Acceso denegado: Únicamente el Administrador puede editar transacciones financieras.'
    });
  }

  const transactionId = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT * FROM server_financial_transactions WHERE id = ?').get(transactionId);
  if (!row) {
    return res.status(404).json({ error: 'Registro financiero no encontrado.' });
  }

  const {
    amount,
    concept,
    category,
    transaction_date,
    payment_reference,
    payment_method,
    recipient_or_payer_name,
    notes,
    campaign_id
  } = req.body;

  const parsedAmount = amount !== undefined ? parseFloat(amount) : row.amount;
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ error: 'El monto debe ser un número positivo válido.' });
  }

  // Si está vinculado a un contrato y cambia el monto, actualizar total_paid del contrato
  if (row.contract_id && parsedAmount !== row.amount) {
    const diff = parsedAmount - row.amount;
    db.prepare('UPDATE server_contracts SET total_paid = MAX(0, total_paid + ?) WHERE id = ?').run(diff, row.contract_id);
  }

  const updatedConcept = concept !== undefined ? concept.trim() : row.concept;
  const updatedCategory = category || row.category;
  const updatedDate = transaction_date || row.transaction_date;
  const updatedRef = payment_reference !== undefined ? (payment_reference ? payment_reference.trim() : null) : row.payment_reference;
  const updatedMethod = payment_method || row.payment_method;
  const updatedRecipient = recipient_or_payer_name !== undefined ? (recipient_or_payer_name ? recipient_or_payer_name.trim() : null) : row.recipient_or_payer_name;
  const updatedNotes = notes !== undefined ? (notes ? notes.trim() : null) : row.notes;
  const updatedCampaignId = campaign_id !== undefined ? (campaign_id || null) : row.campaign_id;

  db.prepare(`
    UPDATE server_financial_transactions
    SET amount = ?,
        concept = ?,
        category = ?,
        transaction_date = ?,
        payment_reference = ?,
        payment_method = ?,
        recipient_or_payer_name = ?,
        notes = ?,
        campaign_id = ?
    WHERE id = ?
  `).run(
    parsedAmount,
    updatedConcept,
    updatedCategory,
    updatedDate,
    updatedRef,
    updatedMethod,
    updatedRecipient,
    updatedNotes,
    updatedCampaignId,
    transactionId
  );

  logAudit(userId, 'SERVER_FINANCIAL_RECORD_UPDATED', 'server_financial_transactions', transactionId, {
    previous: row,
    updated: {
      amount: parsedAmount,
      concept: updatedConcept,
      category: updatedCategory,
      transaction_date: updatedDate,
      payment_reference: updatedRef
    }
  }, req);

  return res.json({
    message: 'Registro financiero actualizado correctamente.',
    id: transactionId,
    amount: parsedAmount,
    concept: updatedConcept,
    transaction_date: updatedDate
  });
}

/**
 * DELETE /api/financials/transactions/:id
 * Exclusivo de Super Admin & Director Ops.
 */
function deleteFinancialTransaction(req, res) {
  const { role, id: userId } = req.user;

  if (role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({
      error: 'Acceso denegado: Únicamente el Administrador puede anular transacciones financieras.'
    });
  }

  const transactionId = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT * FROM server_financial_transactions WHERE id = ?').get(transactionId);
  if (!row) {
    return res.status(404).json({ error: 'Registro financiero no encontrado.' });
  }

  // Si la transacción estaba asociada a un contrato, descontar el monto pagado del contrato
  if (row.contract_id) {
    db.prepare('UPDATE server_contracts SET total_paid = MAX(0, total_paid - ?) WHERE id = ?').run(row.amount, row.contract_id);
  }

  db.prepare('DELETE FROM server_financial_transactions WHERE id = ?').run(transactionId);

  logAudit(userId, 'SERVER_FINANCIAL_RECORD_DELETED', 'server_financial_transactions', transactionId, {
    previous: row
  }, req);

  return res.json({ message: 'Registro financiero anulado y eliminado correctamente.' });
}

function formatYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolveCutoffDates(cutoff, customStart, customEnd) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let startDate = null;
  let endDate = null;
  let label = 'Histórico Completo';

  switch (cutoff) {
    case 'q1_current': {
      startDate = formatYMD(new Date(y, m, 1));
      endDate = formatYMD(new Date(y, m, 15));
      const monthName = new Date(y, m, 1).toLocaleString('es-ES', { month: 'long' });
      label = `1ª Quincena ${monthName} ${y} (01 al 15)`;
      break;
    }
    case 'q2_current': {
      startDate = formatYMD(new Date(y, m, 16));
      const lastDay = new Date(y, m + 1, 0);
      endDate = formatYMD(lastDay);
      const monthName = lastDay.toLocaleString('es-ES', { month: 'long' });
      label = `2ª Quincena ${monthName} ${y} (16 al ${lastDay.getDate()})`;
      break;
    }
    case 'current_month': {
      startDate = formatYMD(new Date(y, m, 1));
      const lastDay = new Date(y, m + 1, 0);
      endDate = formatYMD(lastDay);
      const monthName = lastDay.toLocaleString('es-ES', { month: 'long' });
      label = `Mes Completo: ${monthName} ${y}`;
      break;
    }
    case 'q1_previous': {
      const prevM = m === 0 ? 11 : m - 1;
      const prevY = m === 0 ? y - 1 : y;
      startDate = formatYMD(new Date(prevY, prevM, 1));
      endDate = formatYMD(new Date(prevY, prevM, 15));
      const monthName = new Date(prevY, prevM, 1).toLocaleString('es-ES', { month: 'long' });
      label = `1ª Quincena ${monthName} ${prevY} (01 al 15)`;
      break;
    }
    case 'q2_previous': {
      const prevM = m === 0 ? 11 : m - 1;
      const prevY = m === 0 ? y - 1 : y;
      startDate = formatYMD(new Date(prevY, prevM, 16));
      const lastDay = new Date(prevY, prevM + 1, 0);
      endDate = formatYMD(lastDay);
      const monthName = lastDay.toLocaleString('es-ES', { month: 'long' });
      label = `2ª Quincena ${monthName} ${prevY} (16 al ${lastDay.getDate()})`;
      break;
    }
    case 'previous_month': {
      const prevM = m === 0 ? 11 : m - 1;
      const prevY = m === 0 ? y - 1 : y;
      startDate = formatYMD(new Date(prevY, prevM, 1));
      const lastDay = new Date(prevY, prevM + 1, 0);
      endDate = formatYMD(lastDay);
      const monthName = lastDay.toLocaleString('es-ES', { month: 'long' });
      label = `Mes Anterior: ${monthName} ${prevY}`;
      break;
    }
    case '7d': {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      startDate = formatYMD(start);
      endDate = formatYMD(now);
      label = `Últimos 7 días (${startDate} al ${endDate})`;
      break;
    }
    case '15d': {
      const start = new Date(now);
      start.setDate(now.getDate() - 15);
      startDate = formatYMD(start);
      endDate = formatYMD(now);
      label = `Últimos 15 días (${startDate} al ${endDate})`;
      break;
    }
    case '30d': {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      startDate = formatYMD(start);
      endDate = formatYMD(now);
      label = `Últimos 30 días (${startDate} al ${endDate})`;
      break;
    }
    case 'custom': {
      if (customStart && customEnd) {
        startDate = customStart;
        endDate = customEnd;
        label = `Corte por Fechas: ${startDate} al ${endDate}`;
      } else if (customStart) {
        startDate = customStart;
        label = `Desde ${startDate}`;
      } else if (customEnd) {
        endDate = customEnd;
        label = `Hasta ${endDate}`;
      }
      break;
    }
    default: {
      if (customStart && customEnd) {
        startDate = customStart;
        endDate = customEnd;
        label = `Periodo: ${startDate} al ${endDate}`;
      } else {
        label = 'Histórico Completo';
      }
      break;
    }
  }

  return { startDate, endDate, label, cutoffType: cutoff || 'all' };
}

/**
 * GET /api/financials/expense-report
 * Exclusivo de Super Admin & Director Ops.
 * Genera el informe consolidado de gastos por cortes o por fechas:
 * - Gastos por cada streamer (directos/evidencias pagadas + abonos de contratos a streamers).
 * - Gastos por servidor (liquidaciones a streamers + honorarios/pagos a PMs + gastos operativos del servidor).
 * - Pagos a PMs (honorarios de supervisión, abonos de contratos y comisiones).
 * - Ingresos registrados y balance neto de ganancias en el corte/periodo.
 * - Auditoría detallada de cada transacción del corte.
 */
function getExpenseCutoffReport(req, res) {
  const { role, id: userId } = req.user;

  if (role !== 'super_admin' && role !== 'director_ops') {
    return res.status(403).json({
      error: 'Acceso denegado: Únicamente el Administrador puede consultar el informe de gastos y cortes.'
    });
  }

  const {
    cutoff = 'all',
    startDate: customStart,
    endDate: customEnd,
    serverId,
    streamerId,
    pmId
  } = req.query;

  // 1. Resolver el rango de fechas efectivo
  const { startDate, endDate, label, cutoffType } = resolveCutoffDates(cutoff, customStart, customEnd);

  // 2. Construir cláusulas SQL de filtrado por fecha y servidor
  let evidenceWhere = "WHERE ae.status = 'paid' AND c.deleted_at IS NULL AND s.deleted_at IS NULL";
  let transWhere = "WHERE s.deleted_at IS NULL";
  const evidenceParams = [];
  const transParams = [];

  if (startDate && endDate) {
    evidenceWhere += " AND DATE(COALESCE(ae.paid_at, ae.activity_date, ae.created_at)) >= ? AND DATE(COALESCE(ae.paid_at, ae.activity_date, ae.created_at)) <= ?";
    evidenceParams.push(startDate, endDate);

    transWhere += " AND DATE(COALESCE(sft.transaction_date, sft.created_at)) >= ? AND DATE(COALESCE(sft.transaction_date, sft.created_at)) <= ?";
    transParams.push(startDate, endDate);
  } else if (startDate) {
    evidenceWhere += " AND DATE(COALESCE(ae.paid_at, ae.activity_date, ae.created_at)) >= ?";
    evidenceParams.push(startDate);

    transWhere += " AND DATE(COALESCE(sft.transaction_date, sft.created_at)) >= ?";
    transParams.push(startDate);
  } else if (endDate) {
    evidenceWhere += " AND DATE(COALESCE(ae.paid_at, ae.activity_date, ae.created_at)) <= ?";
    evidenceParams.push(endDate);

    transWhere += " AND DATE(COALESCE(sft.transaction_date, sft.created_at)) <= ?";
    transParams.push(endDate);
  }

  if (serverId) {
    const sId = parseInt(serverId, 10);
    evidenceWhere += " AND c.server_id = ?";
    evidenceParams.push(sId);

    transWhere += " AND sft.server_id = ?";
    transParams.push(sId);
  }

  // 3. Consultar servidores disponibles
  let serversQuery = "SELECT id, name, game, status, budget, logo_url, pm_user_id FROM servers WHERE deleted_at IS NULL";
  if (serverId) {
    serversQuery += ` AND id = ${parseInt(serverId, 10)}`;
  }
  serversQuery += " ORDER BY name ASC";
  const allServers = db.prepare(serversQuery).all();

  // 4. Consultar creadores/streamers disponibles
  let streamersQuery = `
    SELECT 
      u.id as streamer_id, u.username, u.full_name, u.email,
      cp.alias, cp.avatar_url, cp.hourly_rate_internal, cp.fixed_rate_internal
    FROM users u
    LEFT JOIN creator_profiles cp ON u.id = cp.user_id
    WHERE u.role = 'creator' AND u.deleted_at IS NULL
  `;
  if (streamerId) {
    streamersQuery += ` AND u.id = ${parseInt(streamerId, 10)}`;
  }
  streamersQuery += " ORDER BY COALESCE(cp.alias, u.full_name) ASC";
  const allStreamers = db.prepare(streamersQuery).all();

  // 5. Consultar PMs disponibles
  let pmsQuery = `
    SELECT u.id as pm_id, u.username, u.full_name, u.email
    FROM users u
    WHERE u.role = 'pm' AND u.deleted_at IS NULL
  `;
  if (pmId) {
    pmsQuery += ` AND u.id = ${parseInt(pmId, 10)}`;
  }
  pmsQuery += " ORDER BY u.full_name ASC";
  const allPms = db.prepare(pmsQuery).all();

  // 6. Obtener todas las evidencias pagadas en el corte
  const paidEvidencesSql = `
    SELECT 
      ae.id as evidence_id,
      ae.creator_id,
      ae.payout_amount,
      ae.payment_reference,
      ae.payment_notes,
      COALESCE(ae.paid_at, ae.activity_date) as paid_at,
      ae.activity_date,
      ae.duration_minutes,
      ae.total_views,
      ae.peak_viewers,
      ae.platform,
      ae.type as evidence_type,
      c.id as campaign_id,
      c.name as campaign_name,
      s.id as server_id,
      s.name as server_name,
      s.game as server_game,
      u.full_name as creator_name,
      u.username as creator_username,
      cp.alias as creator_alias,
      cp.avatar_url as creator_avatar
    FROM activity_evidences ae
    JOIN campaigns c ON ae.campaign_id = c.id
    JOIN servers s ON c.server_id = s.id
    JOIN users u ON ae.creator_id = u.id
    LEFT JOIN creator_profiles cp ON ae.creator_id = cp.user_id
    ${evidenceWhere}
    ORDER BY COALESCE(ae.paid_at, ae.activity_date) DESC, ae.id DESC
  `;
  const paidEvidencesList = db.prepare(paidEvidencesSql).all(...evidenceParams);

  // 7. Obtener todas las transacciones financieras en el corte
  const transactionsSql = `
    SELECT 
      sft.id as transaction_id,
      sft.server_id,
      sft.type,
      sft.category,
      sft.concept,
      sft.amount,
      sft.transaction_date,
      sft.payment_reference,
      sft.payment_method,
      sft.status,
      sft.recipient_or_payer_name,
      sft.recipient_user_id,
      sft.contract_id,
      sft.notes,
      s.name as server_name,
      s.game as server_game,
      sc.title as contract_title,
      sc.role as contract_role,
      u.full_name as recipient_full_name,
      u.username as recipient_username,
      u.role as recipient_role,
      cp.alias as recipient_alias
    FROM server_financial_transactions sft
    JOIN servers s ON sft.server_id = s.id
    LEFT JOIN server_contracts sc ON sft.contract_id = sc.id
    LEFT JOIN users u ON sft.recipient_user_id = u.id
    LEFT JOIN creator_profiles cp ON u.id = cp.user_id
    ${transWhere}
    ORDER BY sft.transaction_date DESC, sft.id DESC
  `;
  const transactionsList = db.prepare(transactionsSql).all(...transParams);

  // 8. Construir Desglose de Gastos por Streamer
  const streamersReport = allStreamers.map(st => {
    // Evidencias pagadas de este streamer en el corte
    const myEvidences = paidEvidencesList.filter(ev => ev.creator_id === st.streamer_id);
    const evidencePayout = myEvidences.reduce((acc, ev) => acc + (parseFloat(ev.payout_amount) || 0), 0);
    const streamsCount = myEvidences.length;
    const durationMinutes = myEvidences.reduce((acc, ev) => acc + (parseInt(ev.duration_minutes, 10) || 0), 0);
    const totalHours = parseFloat((durationMinutes / 60).toFixed(1));
    const totalViews = myEvidences.reduce((acc, ev) => acc + (parseInt(ev.total_views, 10) || 0), 0);
    const peakViewers = myEvidences.reduce((acc, ev) => Math.max(acc, parseInt(ev.peak_viewers, 10) || 0), 0);

    // Servidores donde transmitió en este corte
    const serverMap = new Map();
    myEvidences.forEach(ev => {
      if (!serverMap.has(ev.server_id)) {
        serverMap.set(ev.server_id, {
          server_id: ev.server_id,
          server_name: ev.server_name,
          streams_count: 0,
          payout: 0
        });
      }
      const s = serverMap.get(ev.server_id);
      s.streams_count += 1;
      s.payout += (parseFloat(ev.payout_amount) || 0);
    });

    // Abonos de contrato o pagos manuales registrados en server_financial_transactions
    const myTransactions = transactionsList.filter(
      tr => tr.type === 'expense_streamer' && (tr.recipient_user_id === st.streamer_id || tr.recipient_username === st.username)
    );
    const contractAndManualPayout = myTransactions.reduce((acc, tr) => acc + (parseFloat(tr.amount) || 0), 0);

    myTransactions.forEach(tr => {
      if (!serverMap.has(tr.server_id)) {
        serverMap.set(tr.server_id, {
          server_id: tr.server_id,
          server_name: tr.server_name,
          streams_count: 0,
          payout: 0
        });
      }
      const s = serverMap.get(tr.server_id);
      s.payout += (parseFloat(tr.amount) || 0);
    });

    const totalSpent = evidencePayout + contractAndManualPayout;
    const costPerHour = totalHours > 0 ? parseFloat((totalSpent / totalHours).toFixed(2)) : 0;
    const costPerStream = streamsCount > 0 ? parseFloat((totalSpent / streamsCount).toFixed(2)) : 0;

    return {
      streamer_id: st.streamer_id,
      alias: st.alias || st.full_name,
      username: st.username,
      full_name: st.full_name,
      email: st.email,
      avatar_url: st.avatar_url,
      streams_count: streamsCount,
      total_hours: totalHours,
      total_views: totalViews,
      peak_viewers: peakViewers,
      evidence_payout: parseFloat(evidencePayout.toFixed(2)),
      contract_and_manual_payout: parseFloat(contractAndManualPayout.toFixed(2)),
      total_spent: parseFloat(totalSpent.toFixed(2)),
      cost_per_hour: costPerHour,
      cost_per_stream: costPerStream,
      servers: Array.from(serverMap.values()).map(s => ({
        ...s,
        payout: parseFloat(s.payout.toFixed(2))
      })),
      payment_details: [
        ...myEvidences.map(ev => ({
          id: `ev-${ev.evidence_id}`,
          source: 'evidence',
          date: (ev.paid_at || ev.activity_date).slice(0, 10),
          concept: `Directo ${ev.platform} (${ev.duration_minutes}m) - ${ev.campaign_name}`,
          server_id: ev.server_id,
          server_name: ev.server_name,
          amount: parseFloat((ev.payout_amount || 0).toFixed(2)),
          payment_reference: ev.payment_reference,
          notes: ev.payment_notes
        })),
        ...myTransactions.map(tr => ({
          id: `tx-${tr.transaction_id}`,
          source: 'transaction',
          date: tr.transaction_date,
          concept: tr.concept,
          server_id: tr.server_id,
          server_name: tr.server_name,
          amount: parseFloat((tr.amount || 0).toFixed(2)),
          payment_reference: tr.payment_reference,
          notes: tr.notes
        }))
      ]
    };
  }).filter(st => streamerId ? true : (st.total_spent > 0 || st.streams_count > 0));

  streamersReport.sort((a, b) => b.total_spent - a.total_spent);

  // 9. Construir Desglose de Gastos por Servidor
  const serversReport = allServers.map(srv => {
    // PMs asignados a este servidor
    const pmsOfServer = db.prepare(`
      SELECT u.id as pm_id, u.full_name, u.username
      FROM server_pms sp
      JOIN users u ON sp.pm_id = u.id
      WHERE sp.server_id = ? AND sp.status = 'active'
    `).all(srv.id);

    if (pmsOfServer.length === 0 && srv.pm_user_id) {
      const pmUser = db.prepare("SELECT id as pm_id, full_name, username FROM users WHERE id = ?").get(srv.pm_user_id);
      if (pmUser) pmsOfServer.push(pmUser);
    }

    // Evidencias pagadas en este servidor
    const srvEvidences = paidEvidencesList.filter(ev => ev.server_id === srv.id);
    const streamersEvidenceExpense = srvEvidences.reduce((acc, ev) => acc + (parseFloat(ev.payout_amount) || 0), 0);
    const totalStreams = srvEvidences.length;
    const durationMinutes = srvEvidences.reduce((acc, ev) => acc + (parseInt(ev.duration_minutes, 10) || 0), 0);
    const totalHours = parseFloat((durationMinutes / 60).toFixed(1));
    const totalViews = srvEvidences.reduce((acc, ev) => acc + (parseInt(ev.total_views, 10) || 0), 0);

    const distinctStreamers = new Set(srvEvidences.map(ev => ev.creator_id));

    // Transacciones de este servidor en el corte
    const srvTransactions = transactionsList.filter(tr => tr.server_id === srv.id);

    const streamerManualExpenses = srvTransactions
      .filter(tr => tr.type === 'expense_streamer')
      .reduce((acc, tr) => acc + (parseFloat(tr.amount) || 0), 0);

    const pmExpenses = srvTransactions
      .filter(tr => tr.type === 'expense_pm')
      .reduce((acc, tr) => acc + (parseFloat(tr.amount) || 0), 0);

    const otherExpenses = srvTransactions
      .filter(tr => tr.type === 'expense_platform')
      .reduce((acc, tr) => acc + (parseFloat(tr.amount) || 0), 0);

    const incomes = srvTransactions
      .filter(tr => tr.type === 'income')
      .reduce((acc, tr) => acc + (parseFloat(tr.amount) || 0), 0);

    const totalStreamersExpense = streamersEvidenceExpense + streamerManualExpenses;
    const totalServerExpenses = totalStreamersExpense + pmExpenses + otherExpenses;
    const serverBudget = parseFloat(srv.budget) || 0;
    const effectiveFunds = incomes > 0 ? incomes : serverBudget;
    const netProfit = effectiveFunds - totalServerExpenses;
    const profitMargin = effectiveFunds > 0 ? parseFloat(((netProfit / effectiveFunds) * 100).toFixed(1)) : 0;
    const budgetRemaining = Math.max(0, serverBudget - totalServerExpenses);
    const budgetExecution = serverBudget > 0 ? parseFloat(((totalServerExpenses / serverBudget) * 100).toFixed(1)) : 0;
    const isProfitable = effectiveFunds > 0 ? (totalServerExpenses <= effectiveFunds) : (totalServerExpenses === 0);

    return {
      server_id: srv.id,
      server_name: srv.name,
      game: srv.game,
      logo_url: srv.logo_url,
      server_budget: parseFloat(serverBudget.toFixed(2)),
      effective_funds: parseFloat(effectiveFunds.toFixed(2)),
      assigned_pms: pmsOfServer.map(p => ({
        id: p.pm_id,
        name: p.full_name,
        username: p.username
      })),
      streamers_count: distinctStreamers.size,
      total_streams: totalStreams,
      total_hours: totalHours,
      total_views: totalViews,
      streamers_expense: parseFloat(totalStreamersExpense.toFixed(2)),
      streamers_evidence_expense: parseFloat(streamersEvidenceExpense.toFixed(2)),
      streamers_manual_expense: parseFloat(streamerManualExpenses.toFixed(2)),
      pm_expense: parseFloat(pmExpenses.toFixed(2)),
      other_expense: parseFloat(otherExpenses.toFixed(2)),
      total_expenses: parseFloat(totalServerExpenses.toFixed(2)),
      total_income: parseFloat(incomes.toFixed(2)),
      net_profit: parseFloat(netProfit.toFixed(2)),
      profit_margin_percentage: profitMargin,
      budget_remaining: parseFloat(budgetRemaining.toFixed(2)),
      budget_execution_percentage: budgetExecution,
      is_profitable: isProfitable,
      status_label: isProfitable ? 'EFICIENTE' : 'DÉFICIT'
    };
  });

  serversReport.sort((a, b) => b.total_expenses - a.total_expenses);

  // 10. Construir Desglose de Pagos a PMs
  const pmsReport = allPms.map(pm => {
    const pmTransactions = transactionsList.filter(
      tr => tr.type === 'expense_pm' && (tr.recipient_user_id === pm.pm_id || tr.recipient_username === pm.username)
    );

    const contractPayments = pmTransactions
      .filter(tr => tr.contract_id !== null && tr.contract_id !== undefined)
      .reduce((acc, tr) => acc + (parseFloat(tr.amount) || 0), 0);

    const feePayments = pmTransactions
      .filter(tr => !tr.contract_id)
      .reduce((acc, tr) => acc + (parseFloat(tr.amount) || 0), 0);

    const totalPaid = contractPayments + feePayments;

    const supervisedServers = db.prepare(`
      SELECT DISTINCT s.id, s.name, s.game
      FROM servers s
      LEFT JOIN server_pms sp ON s.id = sp.server_id
      WHERE (s.pm_user_id = ? OR (sp.pm_id = ? AND sp.status = 'active')) AND s.deleted_at IS NULL
    `).all(pm.pm_id, pm.pm_id);

    return {
      pm_id: pm.pm_id,
      username: pm.username,
      full_name: pm.full_name,
      email: pm.email,
      supervised_servers: supervisedServers,
      contract_payments: parseFloat(contractPayments.toFixed(2)),
      fee_payments: parseFloat(feePayments.toFixed(2)),
      total_paid: parseFloat(totalPaid.toFixed(2)),
      transactions_count: pmTransactions.length,
      payment_details: pmTransactions.map(tr => ({
        id: `tx-${tr.transaction_id}`,
        date: tr.transaction_date,
        concept: tr.concept,
        server_id: tr.server_id,
        server_name: tr.server_name,
        amount: parseFloat((tr.amount || 0).toFixed(2)),
        category: tr.category,
        payment_reference: tr.payment_reference,
        payment_method: tr.payment_method,
        notes: tr.notes
      }))
    };
  }).filter(pm => pmId ? true : (pm.total_paid > 0 || pm.supervised_servers.length > 0));

  pmsReport.sort((a, b) => b.total_paid - a.total_paid);

  // 11. Auditoría Detallada de Todas las Transacciones del Corte
  const allAuditLog = [
    ...paidEvidencesList.map(ev => ({
      id: `ev-${ev.evidence_id}`,
      raw_id: ev.evidence_id,
      type: 'streamer_evidence',
      category_label: 'Directo Streamer',
      recipient_id: ev.creator_id,
      recipient_name: ev.creator_alias || ev.creator_name,
      recipient_username: ev.creator_username,
      recipient_role: 'streamer',
      server_id: ev.server_id,
      server_name: ev.server_name,
      campaign_name: ev.campaign_name,
      concept: `Liquidación Directo (${ev.duration_minutes}m, ${ev.total_views} views)`,
      date: (ev.paid_at || ev.activity_date).slice(0, 10),
      payment_reference: ev.payment_reference || 'S/R',
      payment_method: 'Liquidación Directa',
      amount: parseFloat((ev.payout_amount || 0).toFixed(2)),
      notes: ev.payment_notes
    })),
    ...transactionsList.map(tr => ({
      id: `tx-${tr.transaction_id}`,
      raw_id: tr.transaction_id,
      type: tr.type,
      category_label: tr.type === 'expense_pm' ? 'Pago a PM' : tr.type === 'expense_streamer' ? 'Abono Streamer' : tr.type === 'income' ? 'Ingreso Servidor' : 'Gasto Servidor',
      recipient_id: tr.recipient_user_id,
      recipient_name: tr.recipient_alias || tr.recipient_full_name || tr.recipient_or_payer_name || 'N/A',
      recipient_username: tr.recipient_username,
      recipient_role: tr.type === 'expense_pm' ? 'pm' : tr.type === 'expense_streamer' ? 'streamer' : 'other',
      server_id: tr.server_id,
      server_name: tr.server_name,
      campaign_name: tr.contract_title || null,
      concept: tr.concept,
      date: tr.transaction_date,
      payment_reference: tr.payment_reference || 'S/R',
      payment_method: tr.payment_method || 'Transferencia',
      amount: parseFloat((tr.amount || 0).toFixed(2)),
      notes: tr.notes
    }))
  ];

  allAuditLog.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  // 12. Totales y KPIs Globales del Corte
  const totalStreamersPaid = streamersReport.reduce((acc, s) => acc + s.total_spent, 0);
  const totalPmsPaid = pmsReport.reduce((acc, p) => acc + p.total_paid, 0);
  const totalOtherExpenses = transactionsList
    .filter(tr => tr.type === 'expense_platform')
    .reduce((acc, tr) => acc + (parseFloat(tr.amount) || 0), 0);

  const totalExpenses = totalStreamersPaid + totalPmsPaid + totalOtherExpenses;

  const totalIncome = transactionsList
    .filter(tr => tr.type === 'income')
    .reduce((acc, tr) => acc + (parseFloat(tr.amount) || 0), 0);

  const totalServerBudgets = allServers.reduce((acc, s) => acc + (parseFloat(s.budget) || 0), 0);
  const effectiveTotalFunds = totalIncome > 0 ? totalIncome : totalServerBudgets;
  const netProfit = effectiveTotalFunds - totalExpenses;
  const profitMargin = effectiveTotalFunds > 0 ? parseFloat(((netProfit / effectiveTotalFunds) * 100).toFixed(1)) : 0;
  const isProfitable = effectiveTotalFunds > 0 ? (totalExpenses <= effectiveTotalFunds) : (totalExpenses === 0);

  const totalStreamsCount = streamersReport.reduce((acc, s) => acc + s.streams_count, 0);
  const totalStreamHours = parseFloat(streamersReport.reduce((acc, s) => acc + s.total_hours, 0).toFixed(1));
  const totalViews = streamersReport.reduce((acc, s) => acc + s.total_views, 0);

  return res.json({
    period: {
      cutoff: cutoffType,
      label,
      startDate: startDate || null,
      endDate: endDate || null,
      generatedAt: new Date().toISOString()
    },
    summary: {
      total_expenses: parseFloat(totalExpenses.toFixed(2)),
      total_streamers_paid: parseFloat(totalStreamersPaid.toFixed(2)),
      total_pms_paid: parseFloat(totalPmsPaid.toFixed(2)),
      total_other_expenses: parseFloat(totalOtherExpenses.toFixed(2)),
      total_income: parseFloat(totalIncome.toFixed(2)),
      total_budget: parseFloat(totalServerBudgets.toFixed(2)),
      effective_funds: parseFloat(effectiveTotalFunds.toFixed(2)),
      net_profit: parseFloat(netProfit.toFixed(2)),
      profit_margin_percentage: profitMargin,
      is_profitable: isProfitable,
      status_label: isProfitable ? 'EFICIENTE' : 'DÉFICIT',
      total_streams_count: totalStreamsCount,
      total_stream_hours: totalStreamHours,
      total_views: totalViews,
      active_streamers_count: streamersReport.filter(s => s.total_spent > 0).length,
      active_servers_count: serversReport.filter(s => s.total_expenses > 0 || s.total_income > 0).length,
      active_pms_count: pmsReport.filter(p => p.total_paid > 0).length
    },
    streamers: streamersReport,
    servers: serversReport,
    pms: pmsReport,
    audit_log: allAuditLog
  });
}

/**
 * GET /api/financials/pms-summary
 * Exclusivo de Super Admin & Directores (director_ops, director_pms).
 * Proporciona el resumen consolidado de cada PM:
 * - Datos del PM
 * - Estado de sus servidores a cargo
 * - Estado de sus campañas (avance, estado de conclusión, honorario y saldo pendiente)
 * - Historial detallado de pagos realizados
 * - Métricas agregadas (total ganado, total pagado, pendiente de pago)
 */
function getPmsPayoutsSummary(req, res) {
  const { role } = req.user;
  if (!['super_admin', 'director_ops', 'director_pms'].includes(role)) {
    return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de administración o dirección.' });
  }

  const { pm_id, server_id } = req.query;

  let pmsQuery = `
    SELECT u.id as pm_id, u.username, u.full_name, u.email, u.phone, u.status, u.notes, u.created_at
    FROM users u
    WHERE u.role = 'pm' AND u.deleted_at IS NULL
  `;
  const pmsParams = [];
  if (pm_id) {
    pmsQuery += ' AND u.id = ?';
    pmsParams.push(parseInt(pm_id, 10));
  }
  pmsQuery += ' ORDER BY u.full_name ASC';

  const pmsList = db.prepare(pmsQuery).all(...pmsParams);

  let grandTotalAccrued = 0;
  let grandTotalPaid = 0;
  let grandTotalPending = 0;
  const allManagedServerIds = new Set();
  const allManagedCampaignIds = new Set();

  const enrichedPms = pmsList.map(pm => {
    // 1. Servidores asignados a este PM
    let serversQuery = `
      SELECT DISTINCT s.id, s.name, s.game, s.status, s.budget, s.logo_url, s.website_url, s.created_at
      FROM servers s
      LEFT JOIN server_pms sp ON s.id = sp.server_id
      WHERE (s.pm_user_id = ? OR (sp.pm_id = ? AND sp.status = 'active'))
        AND s.deleted_at IS NULL
    `;
    const serverQueryParams = [pm.pm_id, pm.pm_id];
    if (server_id) {
      serversQuery += ' AND s.id = ?';
      serverQueryParams.push(parseInt(server_id, 10));
    }
    serversQuery += ' ORDER BY s.name ASC';

    const rawServers = db.prepare(serversQuery).all(...serverQueryParams);

    const servers = rawServers.map(srv => {
      allManagedServerIds.add(srv.id);

      // Métricas del servidor
      const campCounts = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM campaigns
        WHERE server_id = ? AND deleted_at IS NULL
      `).get(srv.id);

      const creatorsCountRow = db.prepare(`
        SELECT COUNT(DISTINCT creator_id) as cnt
        FROM server_creators
        WHERE server_id = ? AND status = 'active'
      `).get(srv.id);

      // Gastos del servidor
      const streamerExpenseRow = db.prepare(`
        SELECT COALESCE(SUM(payout_amount), 0) as paid_evidences
        FROM activity_evidences ae
        JOIN campaigns c ON ae.campaign_id = c.id
        WHERE c.server_id = ? AND ae.status = 'paid'
      `).get(srv.id);

      const transExpensesRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_tx
        FROM server_financial_transactions
        WHERE server_id = ? AND type IN ('expense_pm', 'expense_streamer', 'expense_platform')
      `).get(srv.id);

      const srvBudget = parseFloat(srv.budget) || 0;
      const srvSpent = (parseFloat(streamerExpenseRow?.paid_evidences) || 0) + (parseFloat(transExpensesRow?.total_tx) || 0);
      const remainingBudget = Math.max(0, srvBudget - srvSpent);

      return {
        id: srv.id,
        name: srv.name,
        game: srv.game,
        status: srv.status,
        budget: parseFloat(srvBudget.toFixed(2)),
        total_spent: parseFloat(srvSpent.toFixed(2)),
        budget_remaining: parseFloat(remainingBudget.toFixed(2)),
        logo_url: srv.logo_url,
        website_url: srv.website_url,
        creators_count: creatorsCountRow?.cnt || 0,
        active_campaigns: campCounts?.active || 0,
        completed_campaigns: campCounts?.completed || 0,
        total_campaigns: campCounts?.total || 0
      };
    });

    // 2. Campañas asignadas a este PM
    let campaignsQuery = `
      SELECT DISTINCT 
        c.id, c.name, c.server_id, c.status, c.start_date, c.end_date,
        c.objective, c.requirements, c.budget_internal, c.target_evidences,
        c.target_hours, c.pm_fee, c.notes, c.created_at,
        s.name as server_name, s.game as server_game, s.budget as server_budget
      FROM campaigns c
      JOIN servers s ON c.server_id = s.id
      LEFT JOIN campaign_pms cp ON c.id = cp.campaign_id
      WHERE (c.pm_user_id = ? OR cp.pm_id = ?)
        AND c.deleted_at IS NULL
        AND s.deleted_at IS NULL
    `;
    const campQueryParams = [pm.pm_id, pm.pm_id];
    if (server_id) {
      campaignsQuery += ' AND c.server_id = ?';
      campQueryParams.push(parseInt(server_id, 10));
    }
    campaignsQuery += ' ORDER BY c.created_at DESC';

    const rawCampaigns = db.prepare(campaignsQuery).all(...campQueryParams);

    const campaigns = rawCampaigns.map(camp => {
      allManagedCampaignIds.add(camp.id);

      // Creadores y entregas
      const creatorsCount = db.prepare('SELECT COUNT(DISTINCT creator_id) as cnt FROM campaign_creators WHERE campaign_id = ?').get(camp.id)?.cnt || 0;

      const evsStats = db.prepare(`
        SELECT 
          COUNT(*) as total_evidences,
          SUM(CASE WHEN status IN ('approved', 'paid') THEN 1 ELSE 0 END) as approved_evidences,
          COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN duration_minutes ELSE 0 END), 0) as actual_minutes,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN payout_amount ELSE 0 END), 0) as paid_streamers
        FROM activity_evidences
        WHERE campaign_id = ?
      `).get(camp.id);

      const targetEvs = camp.target_evidences || 0;
      const approvedEvs = evsStats?.approved_evidences || 0;
      const progressPercent = targetEvs > 0 ? Math.min(100, Math.round((approvedEvs / targetEvs) * 100)) : (camp.status === 'completed' ? 100 : 0);

      const actualHours = parseFloat(((evsStats?.actual_minutes || 0) / 60).toFixed(1));

      // Número de PMs asignados para dividir honorario equitativamente si aplica
      const assignedPmCountRow = db.prepare('SELECT COUNT(DISTINCT pm_id) as cnt FROM campaign_pms WHERE campaign_id = ?').get(camp.id);
      const pmCount = assignedPmCountRow?.cnt || 1;
      const rawPmFee = parseFloat(camp.pm_fee) || 0;
      const effectivePmFee = parseFloat((rawPmFee / pmCount).toFixed(2));

      // Cuánto se le ha pagado efectivamente a este PM para esta campaña
      const paidToThisPmRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as paid_amt
        FROM server_financial_transactions
        WHERE campaign_id = ? AND recipient_user_id = ? AND type = 'expense_pm'
      `).get(camp.id, pm.pm_id);

      const paidToPm = parseFloat((paidToThisPmRow?.paid_amt || 0).toFixed(2));
      const pendingPmFee = Math.max(0, parseFloat((effectivePmFee - paidToPm).toFixed(2)));

      let feeStatus = 'no_fee';
      if (effectivePmFee > 0) {
        if (paidToPm >= effectivePmFee) {
          feeStatus = 'paid';
        } else if (paidToPm > 0) {
          feeStatus = 'partial';
        } else {
          feeStatus = 'pending';
        }
      }

      return {
        id: camp.id,
        name: camp.name,
        server_id: camp.server_id,
        server_name: camp.server_name,
        server_game: camp.server_game,
        status: camp.status,
        start_date: camp.start_date,
        end_date: camp.end_date,
        budget_internal: parseFloat(camp.budget_internal) || 0,
        pm_fee: effectivePmFee,
        total_campaign_pm_fee: rawPmFee,
        creators_count: creatorsCount,
        target_evidences: targetEvs,
        approved_evidences: approvedEvs,
        evidences_progress_percentage: progressPercent,
        target_hours: parseFloat(camp.target_hours) || 0,
        actual_hours: actualHours,
        paid_to_pm: paidToPm,
        pending_fee: pendingPmFee,
        fee_status: feeStatus
      };
    });

    // 3. Historial de Pagos realizados a este PM
    let paymentsQuery = `
      SELECT 
        sft.id as transaction_id,
        sft.server_id,
        sft.campaign_id,
        sft.type,
        sft.category,
        sft.concept,
        sft.amount,
        sft.transaction_date,
        sft.payment_reference,
        sft.payment_method,
        sft.status,
        sft.notes,
        sft.created_at,
        s.name as server_name,
        s.game as server_game,
        c.name as campaign_name
      FROM server_financial_transactions sft
      JOIN servers s ON sft.server_id = s.id
      LEFT JOIN campaigns c ON sft.campaign_id = c.id
      WHERE sft.recipient_user_id = ? AND sft.type = 'expense_pm'
    `;
    const payQueryParams = [pm.pm_id];
    if (server_id) {
      paymentsQuery += ' AND sft.server_id = ?';
      payQueryParams.push(parseInt(server_id, 10));
    }
    paymentsQuery += ' ORDER BY sft.transaction_date DESC, sft.id DESC';

    const rawPayments = db.prepare(paymentsQuery).all(...payQueryParams);

    const payments = rawPayments.map(p => ({
      id: p.transaction_id,
      server_id: p.server_id,
      server_name: p.server_name,
      server_game: p.server_game,
      campaign_id: p.campaign_id,
      campaign_name: p.campaign_name || 'Supervisión General',
      concept: p.concept,
      amount: parseFloat((p.amount || 0).toFixed(2)),
      transaction_date: p.transaction_date,
      payment_reference: p.payment_reference,
      payment_method: p.payment_method || 'Transferencia',
      status: p.status,
      notes: p.notes,
      created_at: p.created_at
    }));

    // Métricas del PM
    const totalFeesEarned = parseFloat(campaigns.reduce((acc, c) => acc + c.pm_fee, 0).toFixed(2));
    const totalPaid = parseFloat(payments.reduce((acc, p) => acc + p.amount, 0).toFixed(2));
    const totalPending = parseFloat(campaigns.reduce((acc, c) => acc + c.pending_fee, 0).toFixed(2));

    grandTotalAccrued += totalFeesEarned;
    grandTotalPaid += totalPaid;
    grandTotalPending += totalPending;

    let statusLabel = 'AL DÍA';
    if (totalPending > 0) {
      statusLabel = 'PENDIENTE DE PAGO';
    } else if (totalFeesEarned === 0 && totalPaid === 0) {
      statusLabel = 'SIN HONORARIOS';
    }

    return {
      pm_id: pm.pm_id,
      username: pm.username,
      full_name: pm.full_name,
      email: pm.email,
      phone: pm.phone,
      status: pm.status,
      notes: pm.notes,
      created_at: pm.created_at,
      metrics: {
        total_servers: servers.length,
        active_servers: servers.filter(s => s.status === 'active').length,
        total_campaigns: campaigns.length,
        active_campaigns: campaigns.filter(c => c.status === 'active').length,
        completed_campaigns: campaigns.filter(c => c.status === 'completed').length,
        total_fees_earned: totalFeesEarned,
        total_paid: totalPaid,
        pending_balance: totalPending,
        status_label: statusLabel
      },
      servers,
      campaigns,
      payments
    };
  });

  return res.json({
    summary: {
      total_pms: enrichedPms.length,
      total_pms_with_pending: enrichedPms.filter(p => p.metrics.pending_balance > 0).length,
      grand_total_accrued_fees: parseFloat(grandTotalAccrued.toFixed(2)),
      grand_total_paid: parseFloat(grandTotalPaid.toFixed(2)),
      grand_total_pending: parseFloat(grandTotalPending.toFixed(2)),
      total_managed_servers: allManagedServerIds.size,
      total_managed_campaigns: allManagedCampaignIds.size
    },
    pms: enrichedPms
  });
}

/**
 * POST /api/financials/pm-payout
 * Exclusivo de Super Admin & Director Ops.
 * Registra y procesa un pago a un PM:
 * - Valida monto, servidor, y PM
 * - Inserta registro en server_financial_transactions (type: 'expense_pm', category: 'pm_fee')
 * - Genera notificación en tiempo real para el PM
 * - Registra log de auditoría
 */
function processPmPayout(req, res) {
  const { role, id: userId } = req.user;
  if (!['super_admin', 'director_ops'].includes(role)) {
    return res.status(403).json({ error: 'Acceso denegado: Únicamente el Administrador o Director Operativo pueden realizar pagos a PMs.' });
  }

  const {
    pm_id,
    server_id,
    campaign_id,
    amount,
    concept,
    payment_method = 'Transferencia',
    payment_reference,
    transaction_date,
    notes
  } = req.body;

  if (!pm_id || !server_id || !amount || !concept) {
    return res.status(400).json({
      error: 'PM, servidor, concepto y monto son campos obligatorios.'
    });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'El monto a pagar debe ser un valor numérico positivo mayor a cero.' });
  }

  const pmUser = db.prepare("SELECT id, full_name, username, email FROM users WHERE id = ? AND role = 'pm' AND deleted_at IS NULL").get(pm_id);
  if (!pmUser) {
    return res.status(404).json({ error: 'Promoter Manager no encontrado o no activo.' });
  }

  const server = db.prepare("SELECT id, name, game FROM servers WHERE id = ? AND deleted_at IS NULL").get(server_id);
  if (!server) {
    return res.status(404).json({ error: 'Servidor no encontrado o inactivo.' });
  }

  let campaign = null;
  if (campaign_id) {
    campaign = db.prepare("SELECT id, name FROM campaigns WHERE id = ? AND server_id = ? AND deleted_at IS NULL").get(campaign_id, server_id);
    if (!campaign) {
      return res.status(400).json({ error: 'La campaña especificada no pertenece a este servidor o fue eliminada.' });
    }
  }

  const effectiveDate = transaction_date ? transaction_date.slice(0, 10) : new Date().toISOString().split('T')[0];
  const refCode = payment_reference ? payment_reference.trim() : `PM-PAY-${Date.now()}`;

  const result = db.prepare(`
    INSERT INTO server_financial_transactions (
      server_id, campaign_id, type, category, concept, amount, transaction_date,
      payment_reference, payment_method, status, recipient_or_payer_name, recipient_user_id,
      notes, created_by_user_id
    ) VALUES (?, ?, 'expense_pm', 'pm_fee', ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)
  `).run(
    server_id,
    campaign_id || null,
    concept.trim(),
    parsedAmount,
    effectiveDate,
    refCode,
    payment_method,
    pmUser.full_name || pmUser.username,
    pm_id,
    notes ? notes.trim() : null,
    userId
  );

  const transactionId = Number(result.lastInsertRowid);

  // Enviar notificación al PM
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, 'success', '/dashboard/pm')
    `).run(
      pm_id,
      'Pago de Honorario Recibido',
      `Se ha registrado un pago a tu favor por $${parsedAmount.toFixed(2)} USD por concepto de "${concept.trim()}". Ref: ${refCode}.`
    );
  } catch (notifErr) {
    console.error('Error emitiendo notificación de pago a PM:', notifErr);
  }

  // Registrar auditoría
  logAudit(userId, 'PM_PAYOUT_PROCESSED', 'server_financial_transactions', transactionId, {
    pmId: pm_id,
    pmName: pmUser.full_name,
    serverId: server_id,
    serverName: server.name,
    campaignId: campaign_id || null,
    campaignName: campaign ? campaign.name : null,
    amount: parsedAmount,
    concept: concept.trim(),
    paymentReference: refCode,
    paymentMethod: payment_method
  }, req);

  return res.status(201).json({
    message: 'Pago a PM procesado y registrado exitosamente.',
    transaction_id: transactionId,
    transaction: {
      id: transactionId,
      pm_id,
      pm_name: pmUser.full_name,
      server_id,
      server_name: server.name,
      campaign_id: campaign_id || null,
      campaign_name: campaign ? campaign.name : null,
      amount: parsedAmount,
      concept: concept.trim(),
      payment_method,
      payment_reference: refCode,
      transaction_date: effectiveDate,
      notes: notes ? notes.trim() : null
    }
  });
}

module.exports = {
  getServerFinancialReport,
  createFinancialTransaction,
  updateFinancialTransaction,
  deleteFinancialTransaction,
  getExpenseCutoffReport,
  getPmsPayoutsSummary,
  processPmPayout
};
