import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Plus, CheckCircle2, AlertCircle, Clock, 
  TrendingUp, Server, Users, UserCheck, Shield, 
  Search, Filter, ChevronDown, ChevronUp, RefreshCw, X,
  Briefcase, Percent, Calendar, Sparkles, BarChart3, ArrowDownRight, ArrowUpRight,
  Target, Edit2, Trash2
} from 'lucide-react';

export default function ServerFinancialsAndContracts({
  servers = [],
  creators = [],
  pms = [],
  token,
  userRole = 'super_admin'
}) {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all'); // 'all', '30d', '7d'
  const [selectedServerFilter, setSelectedServerFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedServers, setExpandedServers] = useState({});

  // Modals state
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    server_id: '',
    category: 'opening_fee',
    concept: 'Fee de Apertura y Setup Oficial',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_reference: '',
    payment_method: 'Transferencia',
    recipient_or_payer_name: '',
    notes: ''
  });

  // Edit Transaction State (Ingresos o Gastos de PM/Streamer)
  const [editTransactionModalOpen, setEditTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editTransactionForm, setEditTransactionForm] = useState({
    amount: '',
    concept: '',
    category: '',
    transaction_date: '',
    payment_reference: '',
    payment_method: '',
    recipient_or_payer_name: '',
    notes: ''
  });

  // Edit Evidence Payment State (Liquidaciones de Streamers)
  const [editEvidencePayModalOpen, setEditEvidencePayModalOpen] = useState(false);
  const [editingEvidencePay, setEditingEvidencePay] = useState(null);
  const [editEvidencePayForm, setEditEvidencePayForm] = useState({
    payout_amount: '',
    payment_reference: '',
    payment_notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch financial report
  const loadData = async (range = timeRange) => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const fRes = await fetch(`/api/financials/servers?timeRange=${range}`, { headers });
      if (fRes.ok) setFinancialData(await fRes.json());
    } catch (err) {
      console.error('Error cargando datos financieros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(timeRange);
  }, [token, timeRange]);

  // Handle open register opening income modal
  const handleOpenIncomeModal = (prefillServerId = '') => {
    setIncomeForm({
      server_id: prefillServerId || (servers[0]?.id ? String(servers[0].id) : ''),
      category: 'opening_fee',
      concept: 'Fee de Apertura y Campaña de Lanzamiento',
      amount: '',
      transaction_date: new Date().toISOString().split('T')[0],
      payment_reference: `INV-OPEN-${Math.floor(100000 + Math.random() * 900000)}`,
      payment_method: 'Transferencia',
      recipient_or_payer_name: '',
      notes: 'Pago recibido por el dueño del servidor para campaña de apertura y streamers.'
    });
    setIncomeModalOpen(true);
  };

  // Submit opening income
  const handleSubmitIncome = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        server_id: parseInt(incomeForm.server_id, 10),
        type: 'income',
        category: incomeForm.category,
        concept: incomeForm.concept,
        amount: parseFloat(incomeForm.amount),
        transaction_date: incomeForm.transaction_date,
        payment_reference: incomeForm.payment_reference,
        payment_method: incomeForm.payment_method,
        recipient_or_payer_name: incomeForm.recipient_or_payer_name,
        notes: incomeForm.notes
      };

      const res = await fetch('/api/financials/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIncomeModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al registrar ingreso.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Actions for Manual / General Financial Transactions
  const handleDeleteTransaction = async (transactionId, concept) => {
    if (!window.confirm(`¿Seguro que deseas anular y eliminar la transacción "${concept}"?\n\nEsta acción revertirá los balances y recalculará la ganancia del servidor.`)) return;
    try {
      const res = await fetch(`/api/financials/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al anular la transacción.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setEditTransactionForm({
      amount: tx.amount || '',
      concept: tx.concept || '',
      category: tx.category || '',
      transaction_date: tx.transaction_date || '',
      payment_reference: tx.payment_reference || '',
      payment_method: tx.payment_method || 'Transferencia',
      recipient_or_payer_name: tx.recipient_or_payer_name || '',
      notes: tx.notes || ''
    });
    setEditTransactionModalOpen(true);
  };

  const handleSaveEditTransaction = async (e) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/financials/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editTransactionForm)
      });
      if (res.ok) {
        setEditTransactionModalOpen(false);
        setEditingTransaction(null);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar la transacción.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Actions for Paid Streamer Evidences
  const handleRevertEvidencePayment = async (evidenceId, creatorName, amount) => {
    if (!window.confirm(`¿Seguro que deseas anular y eliminar el pago de $${amount} USD a ${creatorName}?\n\nLa entrega volverá al estado "Aprobado", se descontará de los gastos del servidor y se recalculará la ganancia.`)) return;
    try {
      const res = await fetch(`/api/evidences/${evidenceId}/pay`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al revertir el pago de la entrega.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditEvidencePay = (ev) => {
    setEditingEvidencePay(ev);
    setEditEvidencePayForm({
      payout_amount: ev.payout_amount || '',
      payment_reference: ev.payment_reference || '',
      payment_notes: ev.payment_notes || ''
    });
    setEditEvidencePayModalOpen(true);
  };

  const handleSaveEditEvidencePay = async (e) => {
    e.preventDefault();
    if (!editingEvidencePay) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/evidences/${editingEvidencePay.id}/pay`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editEvidencePayForm)
      });
      if (res.ok) {
        setEditEvidencePayModalOpen(false);
        setEditingEvidencePay(null);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar la liquidación de la entrega.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter servers
  const filteredServerReports = useMemo(() => {
    if (!financialData || !Array.isArray(financialData.servers)) return [];
    let list = financialData.servers;

    if (selectedServerFilter !== 'all') {
      const sId = parseInt(selectedServerFilter, 10);
      list = list.filter(s => s.server_id === sId);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(s => 
        s.server_name.toLowerCase().includes(q) ||
        (s.game && s.game.toLowerCase().includes(q)) ||
        (s.pm && s.pm.name && s.pm.name.toLowerCase().includes(q)) ||
        (s.owner && s.owner.name && s.owner.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [financialData, selectedServerFilter, searchTerm]);

  // Toggle server accordion
  const toggleServerAccordion = (serverId) => {
    setExpandedServers(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  const summary = financialData?.summary || {};

  return (
    <div className="space-y-6">
      
      {/* ================= HEADER & CONTROLS ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-bold text-white font-heading">
              Finanzas, Presupuestos y Balances P&L por Servidor
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Control consolidado de presupuestos asignados, liquidaciones a streamers, honorarios de PMs y balances netos en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range selector */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              Histórico
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === '30d' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              Últimos 30d
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === '7d' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              Últimos 7d
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => handleOpenIncomeModal()}
            className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Registrar pago de apertura recibido de un servidor"
          >
            <TrendingUp className="w-4 h-4" />
            <span>+ Ingreso Apertura</span>
          </button>
        </div>
      </div>

      {/* ================= RESUMEN GLOBAL (KPIs) ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Ingresos Totales */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Ingresos Registrados</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
            ${(summary.total_platform_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">Cobrado a clientes</span>
        </div>

        {/* 2. Presupuesto Total de Servidores */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-400 font-bold uppercase">Presupuesto Servidores</span>
            <Server className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-300 font-mono mt-1">
            ${(summary.total_servers_budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">Asignado a servidores</span>
        </div>

        {/* 3. Presupuesto Campañas */}
        <div className="p-4 bg-slate-900/90 border border-cyan-500/30 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-cyan-400 font-bold uppercase">Presupuesto Campañas</span>
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-cyan-300 font-mono mt-1">
            ${(summary.total_campaigns_budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">En ejecución activa</span>
        </div>

        {/* 4. Gastos Ya Pagados / Descontados */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Gastos Pagados</span>
            <ArrowDownRight className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl font-extrabold text-orange-400 font-mono mt-1">
            ${(summary.total_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">
            Streamers + PMs liquidados
          </span>
        </div>

        {/* 5. Ganancia Final de Servidores */}
        <div className="p-4 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase">Ganancia Neta Servidores</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white font-mono mt-1">
            ${(summary.total_platform_income > 0 ? (summary.total_platform_income - summary.total_expenses) : (summary.total_servers_budget - summary.total_expenses) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-400 font-bold">
            Eficiencia: {summary.profit_margin_percentage || 0}%
          </div>
        </div>
      </div>

      {/* ================= BARRA DE FILTROS ================= */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por servidor, PM o dueño..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedServerFilter}
            onChange={e => setSelectedServerFilter(e.target.value)}
            className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs w-full md:w-auto"
          >
            <option value="all">Todos los Servidores ({servers.length})</option>
            {servers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.game})</option>
            ))}
          </select>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ================= TARJETAS POR SERVIDOR ================= */}
      {filteredServerReports.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <Server className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">No hay datos financieros registrados</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Registra los ingresos de apertura de tus servidores o asigna campañas con presupuesto para comenzar a calcular las ganancias.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => handleOpenIncomeModal()}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold"
            >
              + Registrar Ingreso de Apertura
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredServerReports.map(srv => {
            const fin = srv.financials;
            const isExpanded = !!expandedServers[srv.server_id];

            return (
              <div 
                key={srv.server_id}
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all"
              >
                {/* ---------------- CABECERA DEL SERVIDOR ---------------- */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={srv.logo_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120'} 
                      alt={srv.server_name}
                      className="w-12 h-12 rounded-2xl object-cover border border-amber-500/30 shadow-md shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-extrabold text-white font-heading">
                          {srv.server_name}
                        </h4>
                        <span className="text-xs text-amber-400 font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                          {srv.game || 'Metin2'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {srv.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span>PMs: <strong className="text-white">
                          {srv.assigned_pms && srv.assigned_pms.length > 0 
                            ? srv.assigned_pms.map(p => p.pm_name || ('@' + p.pm_username)).join(', ') 
                            : (srv.pm?.name || 'No asignado')}
                        </strong></span>
                        {srv.server_budget > 0 && (
                          <>
                            <span className="text-slate-700">•</span>
                            <span className="text-amber-400 font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                              Presupuesto Servidor: ${srv.server_budget.toLocaleString()} USD
                            </span>
                          </>
                        )}
                        <span className="text-slate-700">•</span>
                        <span>Dueño: <strong className="text-slate-300">{srv.owner?.name || 'Cliente'}</strong></span>
                        <span className="text-slate-700">•</span>
                        <span className="text-emerald-400 font-bold">{(srv.breakdown?.campaigns_pnl || []).length} campañas</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de Servidor */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenIncomeModal(srv.server_id)}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      title="Registrar pago recibido para este servidor"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Ingreso</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">

                  {/* ---------------- P&L BOX: DESGLOSE DE INGRESOS, GASTOS Y GANANCIA ---------------- */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    
                    {/* 1. Presupuesto Servidor */}
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-amber-500/20">
                      <span className="text-[10px] text-amber-400 uppercase font-bold block">Presupuesto Servidor</span>
                      <span className="text-base font-extrabold text-amber-300 font-mono mt-0.5 block">
                        ${(srv.server_budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500">Ejecutado: {fin.budget_execution_percentage || 0}%</span>
                    </div>

                    {/* 2. Ingresos Totales */}
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Ingresos Totales</span>
                      <span className="text-base font-extrabold text-emerald-400 font-mono mt-0.5 block">
                        +${fin.total_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500">Cobros apertura</span>
                    </div>

                    {/* 3. Presupuesto en Campañas */}
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
                      <span className="text-[10px] text-cyan-400 uppercase font-bold block">Presupuesto Campañas</span>
                      <span className="text-base font-extrabold text-cyan-300 font-mono mt-0.5 block">
                        ${srv.campaigns_summary?.total_budget?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                      </span>
                      <span className="text-[10px] text-slate-500">{(srv.breakdown?.campaigns_pnl || []).length} activas/concluidas</span>
                    </div>

                    {/* 4. Gastos en Streamers */}
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Gasto Streamers</span>
                      <span className="text-base font-extrabold text-orange-400 font-mono mt-0.5 block">
                        -${fin.streamers_expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500">Directos liquidados</span>
                    </div>

                    {/* 5. Gastos Totales Pagados */}
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Gastos Totales</span>
                      <span className="text-base font-extrabold text-rose-400 font-mono mt-0.5 block">
                        -${fin.total_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500">PMs + Streamers</span>
                    </div>

                    {/* 6. Ganancia Neta / Remanente */}
                    <div className="p-3.5 bg-gradient-to-b from-slate-950 to-emerald-950/30 rounded-2xl border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">Remanente / Ganancia</span>
                      <span className={`text-base font-black font-mono mt-0.5 block ${
                        fin.net_profit >= 0 ? 'text-white' : 'text-red-400'
                      }`}>
                        ${fin.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        Eficiencia: {fin.profit_margin_percentage}%
                      </span>
                    </div>

                  </div>

                  {/* ---------------- P&L POR CAMPAÑA DEL SERVIDOR ---------------- */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                          Ganancia y Rendimiento por Campaña ({(srv.breakdown?.campaigns_pnl || []).length})
                        </h5>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Presupuesto Campañas: <strong className="text-emerald-400">${srv.campaigns_summary?.total_budget?.toLocaleString() || 0}</strong> • Consumido: <strong className="text-orange-400">${srv.campaigns_summary?.total_spent?.toLocaleString() || 0}</strong> (Streamers: ${srv.campaigns_summary?.total_streamers_spent?.toLocaleString() || 0} • PMs: ${srv.campaigns_summary?.total_pm_spent?.toLocaleString() || 0}) • No Usado / Ganancia: <strong className="text-white">${srv.campaigns_summary?.total_net_profit?.toLocaleString() || 0} ({srv.campaigns_summary?.profit_margin_percentage || 0}%)</strong>
                      </span>
                    </div>

                    {(srv.breakdown?.campaigns_pnl || []).length === 0 ? (
                      <div className="p-5 bg-slate-950/40 border border-slate-800/60 rounded-2xl text-center text-slate-500 text-xs italic">
                        No hay campañas registradas para este servidor aún.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {srv.breakdown.campaigns_pnl.map(camp => (
                          <div key={camp.campaign_id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-white text-sm truncate">{camp.campaign_name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                camp.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                camp.status === 'completed' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {camp.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                              <div>
                                <span className="text-slate-500 block uppercase font-semibold">Presupuesto</span>
                                <span className="font-extrabold text-white text-[11px] font-mono">${camp.budget}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-semibold">Streamers</span>
                                <span className="font-extrabold text-orange-400 text-[11px] font-mono">-${camp.paid_streamers_expense}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block uppercase font-semibold">PM</span>
                                <span className="font-extrabold text-blue-400 text-[11px] font-mono">
                                  {camp.paid_pm_expense > 0 ? `-$${camp.paid_pm_expense}` : (camp.pm_fee > 0 ? `$${camp.pm_fee}` : '$0')}
                                </span>
                              </div>
                              <div>
                                <span className="text-emerald-400 block uppercase font-bold">No Usado</span>
                                <span className={`font-extrabold text-[11px] font-mono ${
                                  camp.is_profitable ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {camp.net_profit >= 0 ? '+' : ''}${camp.net_profit}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                              <span>Margen: <strong className={camp.is_profitable ? 'text-emerald-400' : 'text-red-400'}>{camp.profit_margin_percentage}%</strong></span>
                              <span>Vistas: <strong className="text-amber-400">{camp.total_views.toLocaleString()}</strong> ({camp.hours_streamed}h)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ---------------- ACCORDEÓN: HISTORIAL DE PAGOS DEL SERVIDOR ---------------- */}
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleServerAccordion(srv.server_id)}
                      className="w-full py-2.5 px-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-left text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span>Ver Historial Detallado de Movimientos (Ingresos y Pagos Realizados)</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4 text-xs">
                        
                        {/* Incomes table */}
                        <div>
                          <h6 className="font-bold text-emerald-400 uppercase text-[10px] mb-2">Ingresos Registrados</h6>
                          {(srv.breakdown?.incomes || []).length === 0 ? (
                            <span className="text-slate-500 italic text-[11px]">No hay ingresos registrados aún.</span>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11px] text-slate-300">
                                <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                                  <tr>
                                    <th className="pb-2">Fecha</th>
                                    <th className="pb-2">Concepto</th>
                                    <th className="pb-2">Referencia</th>
                                    <th className="pb-2">Método</th>
                                    <th className="pb-2 text-right">Monto</th>
                                    <th className="pb-2 text-center">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {srv.breakdown.incomes.map(inc => (
                                    <tr key={inc.id}>
                                      <td className="py-2 text-slate-400">{inc.transaction_date}</td>
                                      <td className="py-2 text-white font-medium">{inc.concept}</td>
                                      <td className="py-2 font-mono text-slate-400">{inc.payment_reference || '-'}</td>
                                      <td className="py-2">{inc.payment_method}</td>
                                      <td className="py-2 text-right font-bold text-emerald-400 font-mono">+${inc.amount}</td>
                                      <td className="py-2 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditTransaction(inc)}
                                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
                                            title="Editar Ingreso"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteTransaction(inc.id, inc.concept)}
                                            className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                                            title="Anular Ingreso"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Streamer Evidences Paid table */}
                        <div className="pt-2 border-t border-slate-800">
                          <h6 className="font-bold text-orange-400 uppercase text-[10px] mb-2">Liquidaciones de Directos a Streamers</h6>
                          {(srv.breakdown?.paid_evidences || []).length === 0 ? (
                            <span className="text-slate-500 italic text-[11px]">No hay directos liquidados en este servidor aún.</span>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11px] text-slate-300">
                                <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                                  <tr>
                                    <th className="pb-2">Fecha</th>
                                    <th className="pb-2">Streamer</th>
                                    <th className="pb-2">Campaña</th>
                                    <th className="pb-2">Directo</th>
                                    <th className="pb-2">Referencia</th>
                                    <th className="pb-2 text-right">Monto</th>
                                    <th className="pb-2 text-center">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {srv.breakdown.paid_evidences.map(ev => (
                                    <tr key={ev.id}>
                                      <td className="py-2 text-slate-400">{ev.paid_at?.split(' ')[0] || ev.activity_date}</td>
                                      <td className="py-2 font-medium text-white">{ev.creator_alias || ev.creator_name}</td>
                                      <td className="py-2 text-slate-400">{ev.campaign_name}</td>
                                      <td className="py-2 text-slate-400">{ev.duration_minutes}m ({ev.platform})</td>
                                      <td className="py-2 font-mono text-slate-400">{ev.payment_reference || '-'}</td>
                                      <td className="py-2 text-right font-bold text-orange-400 font-mono">-${ev.payout_amount}</td>
                                      <td className="py-2 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditEvidencePay(ev)}
                                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
                                            title="Editar Liquidación"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRevertEvidencePayment(ev.id, ev.creator_alias || ev.creator_name, ev.payout_amount)}
                                            className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                                            title="Anular Liquidación de Entrega"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* General Expenses table */}
                        <div className="pt-2 border-t border-slate-800">
                          <h6 className="font-bold text-slate-400 uppercase text-[10px] mb-2">Gastos Manuales & Liquidaciones Operativas</h6>
                          {(srv.breakdown?.expenses || []).length === 0 ? (
                            <span className="text-slate-500 italic text-[11px]">No hay gastos manuales registrados.</span>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11px] text-slate-300">
                                <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                                  <tr>
                                    <th className="pb-2">Fecha</th>
                                    <th className="pb-2">Concepto</th>
                                    <th className="pb-2">Beneficiario</th>
                                    <th className="pb-2">Tipo</th>
                                    <th className="pb-2">Referencia</th>
                                    <th className="pb-2 text-right">Monto</th>
                                    <th className="pb-2 text-center">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {srv.breakdown.expenses.map(exp => (
                                    <tr key={exp.id}>
                                      <td className="py-2 text-slate-400">{exp.transaction_date}</td>
                                      <td className="py-2 text-white font-medium">{exp.concept}</td>
                                      <td className="py-2 text-slate-300">{exp.recipient_or_payer_name || '-'}</td>
                                      <td className="py-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                          exp.type === 'expense_pm' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                          {exp.type === 'expense_pm' ? 'PM' : 'Operativo'}
                                        </span>
                                      </td>
                                      <td className="py-2 font-mono text-slate-400">{exp.payment_reference || '-'}</td>
                                      <td className="py-2 text-right font-bold text-rose-400 font-mono">-${exp.amount}</td>
                                      <td className="py-2 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditTransaction(exp)}
                                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
                                            title="Editar Gasto"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteTransaction(exp.id, exp.concept)}
                                            className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                                            title="Anular Gasto"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: REGISTRAR INGRESO DE APERTURA ================= */}
      {incomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIncomeModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-heading">
                  Registrar Ingreso de Servidor
                </h4>
                <p className="text-xs text-slate-400">
                  Suma fondos oficiales al balance del servidor.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitIncome} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Servidor</label>
                <select
                  value={incomeForm.server_id}
                  onChange={e => setIncomeForm({ ...incomeForm, server_id: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Seleccionar Servidor</option>
                  {servers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.game})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  value={incomeForm.concept}
                  onChange={e => setIncomeForm({ ...incomeForm, concept: e.target.value })}
                  placeholder="Ej: Fee de Apertura"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Monto ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={incomeForm.amount}
                    onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold font-mono text-base"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={incomeForm.transaction_date}
                    onChange={e => setIncomeForm({ ...incomeForm, transaction_date: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Método de Pago</label>
                  <select
                    value={incomeForm.payment_method}
                    onChange={e => setIncomeForm({ ...incomeForm, payment_method: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Cripto / USDT">Cripto / USDT</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Western Union">Western Union</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Referencia / Factura</label>
                  <input
                    type="text"
                    required
                    value={incomeForm.payment_reference}
                    onChange={e => setIncomeForm({ ...incomeForm, payment_reference: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Cliente / Dueño Pagador</label>
                <input
                  type="text"
                  value={incomeForm.recipient_or_payer_name}
                  onChange={e => setIncomeForm({ ...incomeForm, recipient_or_payer_name: e.target.value })}
                  placeholder="Nombre del cliente o entidad pagadora"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Notas</label>
                <input
                  type="text"
                  value={incomeForm.notes}
                  onChange={e => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIncomeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold"
                >
                  {submitting ? 'Guardando...' : 'Registrar Ingreso'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR MOVIMIENTO / TRANSACCIÓN ================= */}
      {editTransactionModalOpen && editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => { setEditTransactionModalOpen(false); setEditingTransaction(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-base font-extrabold text-white">Editar Registro Financiero</h4>
                <p className="text-xs text-slate-400">Modifica los datos del comprobante o importe para recalcular balances.</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditTransaction} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  value={editTransactionForm.concept}
                  onChange={e => setEditTransactionForm({ ...editTransactionForm, concept: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Monto ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editTransactionForm.amount}
                    onChange={e => setEditTransactionForm({ ...editTransactionForm, amount: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold font-mono text-base"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={editTransactionForm.transaction_date}
                    onChange={e => setEditTransactionForm({ ...editTransactionForm, transaction_date: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Método de Pago</label>
                  <select
                    value={editTransactionForm.payment_method}
                    onChange={e => setEditTransactionForm({ ...editTransactionForm, payment_method: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Cripto / USDT">Cripto / USDT</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Western Union">Western Union</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Referencia</label>
                  <input
                    type="text"
                    required
                    value={editTransactionForm.payment_reference}
                    onChange={e => setEditTransactionForm({ ...editTransactionForm, payment_reference: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Beneficiario / Pagador</label>
                <input
                  type="text"
                  value={editTransactionForm.recipient_or_payer_name}
                  onChange={e => setEditTransactionForm({ ...editTransactionForm, recipient_or_payer_name: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Notas</label>
                <input
                  type="text"
                  value={editTransactionForm.notes}
                  onChange={e => setEditTransactionForm({ ...editTransactionForm, notes: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setEditTransactionModalOpen(false); setEditingTransaction(null); }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold"
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR LIQUIDACIÓN DE ENTREGA STREAMER ================= */}
      {editEvidencePayModalOpen && editingEvidencePay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => { setEditEvidencePayModalOpen(false); setEditingEvidencePay(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-base font-extrabold text-white">Editar Liquidación de Entrega</h4>
                <p className="text-xs text-slate-400">{editingEvidencePay.creator_alias || editingEvidencePay.creator_name} - {editingEvidencePay.campaign_name}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditEvidencePay} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Monto Liquidado ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editEvidencePayForm.payout_amount}
                  onChange={e => setEditEvidencePayForm({ ...editEvidencePayForm, payout_amount: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold font-mono text-base"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Referencia / Comprobante</label>
                <input
                  type="text"
                  required
                  value={editEvidencePayForm.payment_reference}
                  onChange={e => setEditEvidencePayForm({ ...editEvidencePayForm, payment_reference: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Notas de Pago</label>
                <input
                  type="text"
                  value={editEvidencePayForm.payment_notes}
                  onChange={e => setEditEvidencePayForm({ ...editEvidencePayForm, payment_notes: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setEditEvidencePayModalOpen(false); setEditingEvidencePay(null); }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold"
                >
                  {submitting ? 'Guardando...' : 'Actualizar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
