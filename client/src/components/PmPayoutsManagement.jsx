import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Server, Target, DollarSign, CheckCircle2, Clock, 
  AlertTriangle, Filter, Search, Plus, RefreshCw, Download, 
  ExternalLink, Eye, Printer, ChevronDown, ChevronUp, Check, 
  X, ArrowUpRight, ShieldCheck, Wallet, Receipt, CreditCard,
  Building, Sparkles, TrendingUp, Calendar, Hash, FileText
} from 'lucide-react';

export default function PmPayoutsManagement({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'paid', 'active_campaigns'
  const [serverFilter, setServerFilter] = useState('all');

  // Expanded PM card state
  const [expandedPmId, setExpandedPmId] = useState(null);
  const [pmActiveSubTab, setPmActiveSubTab] = useState({}); // { [pmId]: 'campaigns' | 'servers' | 'payments' }

  // Payment Modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPmForPay, setSelectedPmForPay] = useState(null);
  const [payForm, setPayForm] = useState({
    pm_id: '',
    server_id: '',
    campaign_id: '',
    amount: '',
    concept: '',
    payment_method: 'Transferencia',
    payment_reference: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submittingPay, setSubmittingPay] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paySuccessMsg, setPaySuccessMsg] = useState(null);

  // Receipt Modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Fetch summary
  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/financials/pms-summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Error al cargar el resumen financiero de PMs.');
      }
      const json = await res.json();
      setData(json);
      // Auto-expand first PM if available and none selected
      if (json.pms && json.pms.length > 0 && expandedPmId === null) {
        setExpandedPmId(json.pms[0].pm_id);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [token]);

  // Open pay modal
  const handleOpenPayModal = (pm = null, campaign = null, server = null) => {
    setPayError(null);
    setPaySuccessMsg(null);
    setSelectedPmForPay(pm);

    const targetPmId = pm ? String(pm.pm_id) : '';
    const targetServerId = server ? String(server.id || server.server_id) : (campaign ? String(campaign.server_id) : '');
    const targetCampaignId = campaign ? String(campaign.id) : '';

    let suggestedAmount = '';
    let suggestedConcept = '';

    if (campaign) {
      suggestedAmount = campaign.pending_fee > 0 ? String(campaign.pending_fee) : String(campaign.pm_fee || '');
      suggestedConcept = `Honorario Campaña: ${campaign.name}`;
    } else if (server && pm) {
      suggestedConcept = `Supervisión de Servidor: ${server.name} - ${pm.full_name}`;
    } else if (pm) {
      suggestedConcept = `Honorario de Supervisión - ${pm.full_name}`;
    }

    setPayForm({
      pm_id: targetPmId,
      server_id: targetServerId,
      campaign_id: targetCampaignId,
      amount: suggestedAmount,
      concept: suggestedConcept,
      payment_method: 'Transferencia',
      payment_reference: `PM-PAY-${Date.now().toString().slice(-6)}`,
      transaction_date: new Date().toISOString().split('T')[0],
      notes: ''
    });

    setPayModalOpen(true);
  };

  // Submit payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setPayError(null);
    setSubmittingPay(true);

    try {
      const payload = {
        pm_id: parseInt(payForm.pm_id, 10),
        server_id: parseInt(payForm.server_id, 10),
        campaign_id: payForm.campaign_id ? parseInt(payForm.campaign_id, 10) : null,
        amount: parseFloat(payForm.amount),
        concept: payForm.concept.trim(),
        payment_method: payForm.payment_method,
        payment_reference: payForm.payment_reference.trim(),
        transaction_date: payForm.transaction_date,
        notes: payForm.notes.trim()
      };

      if (!payload.pm_id || !payload.server_id || !payload.amount || !payload.concept) {
        throw new Error('Por favor completa todos los campos requeridos (PM, Servidor, Monto y Concepto).');
      }

      if (isNaN(payload.amount) || payload.amount <= 0) {
        throw new Error('El monto debe ser un número positivo mayor a cero.');
      }

      const res = await fetch('/api/financials/pm-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'No se pudo registrar el pago al PM.');
      }

      setPaySuccessMsg(`¡Pago de $${payload.amount.toFixed(2)} USD registrado con éxito! Ref: ${payload.payment_reference}`);
      setTimeout(() => {
        setPayModalOpen(false);
        fetchSummary();
      }, 1200);

    } catch (err) {
      console.error(err);
      setPayError(err.message || 'Error al procesar el pago.');
    } finally {
      setSubmittingPay(false);
    }
  };

  // Delete payment
  const handleDeletePayment = async (transactionId) => {
    if (!window.confirm(`¿Estás seguro de anular y eliminar este pago registrado (#${transactionId})? El monto se revertirá automáticamente en los balances.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/financials/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al anular la transacción.');
      }
      fetchSummary();
    } catch (err) {
      alert(err.message || 'Error al eliminar pago.');
    }
  };

  // Filter PMs
  const filteredPms = useMemo(() => {
    if (!data?.pms) return [];
    return data.pms.filter(pm => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch = 
        pm.full_name?.toLowerCase().includes(search) ||
        pm.username?.toLowerCase().includes(search) ||
        pm.email?.toLowerCase().includes(search) ||
        pm.servers.some(s => s.name?.toLowerCase().includes(search)) ||
        pm.campaigns.some(c => c.name?.toLowerCase().includes(search));

      if (!matchSearch) return false;

      // Status Filter
      if (statusFilter === 'pending' && pm.metrics.pending_balance <= 0) return false;
      if (statusFilter === 'paid' && (pm.metrics.pending_balance > 0 || pm.metrics.total_fees_earned === 0)) return false;
      if (statusFilter === 'active_campaigns' && pm.metrics.active_campaigns === 0) return false;

      // Server Filter
      if (serverFilter !== 'all') {
        const sId = parseInt(serverFilter, 10);
        const hasServer = pm.servers.some(s => s.id === sId);
        if (!hasServer) return false;
      }

      return true;
    });
  }, [data, searchTerm, statusFilter, serverFilter]);

  // Unique list of servers across all PMs for dropdown
  const uniqueServers = useMemo(() => {
    if (!data?.pms) return [];
    const map = new Map();
    data.pms.forEach(pm => {
      pm.servers.forEach(s => {
        if (!map.has(s.id)) {
          map.set(s.id, { id: s.id, name: s.name, game: s.game });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Export CSV
  const handleExportCSV = () => {
    if (!data?.pms || data.pms.length === 0) return;
    const headers = [
      'PM ID', 'Nombre Completo', 'Usuario', 'Email', 'Teléfono',
      'Servidores Asignados', 'Campañas a Cargo', 'Campañas Activas', 'Campañas Concluidas',
      'Honorarios Totales ($ USD)', 'Total Pagado ($ USD)', 'Saldo Pendiente ($ USD)', 'Estado de Honorarios'
    ];

    const rows = data.pms.map(p => [
      p.pm_id,
      `"${p.full_name}"`,
      p.username,
      p.email,
      p.phone || 'N/A',
      p.metrics.total_servers,
      p.metrics.total_campaigns,
      p.metrics.active_campaigns,
      p.metrics.completed_campaigns,
      p.metrics.total_fees_earned.toFixed(2),
      p.metrics.total_paid.toFixed(2),
      p.metrics.pending_balance.toFixed(2),
      `"${p.metrics.status_label}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pmforgex_pagos_pms_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-300">Cargando Módulo de Pagos a PMs...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-6 text-center text-rose-300 max-w-lg mx-auto my-8">
        <AlertTriangle className="w-10 h-10 mx-auto text-rose-400 mb-3" />
        <h3 className="font-bold text-lg mb-1">Error al Cargar Pagos a PMs</h3>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={fetchSummary}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-sm inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  const summary = data?.summary || {
    total_pms: 0,
    total_pms_with_pending: 0,
    grand_total_accrued_fees: 0,
    grand_total_paid: 0,
    grand_total_pending: 0,
    total_managed_servers: 0,
    total_managed_campaigns: 0
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Title Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
                Módulo Financiero PMs
              </span>
              <span className="text-slate-500 text-xs">• Control de Honorarios & Supervisión</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Wallet className="w-8 h-8 text-amber-400" />
              Gestión de Pagos a Promoter Managers
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Supervisa el estado en tiempo real de los servidores y campañas asignadas a cada PM, calcula honorarios devengados y ejecuta liquidaciones directas con impacto automático en balances.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchSummary}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Exportar CSV
            </button>
            <button
              onClick={() => handleOpenPayModal(null, null, null)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Realizar Pago a PM
            </button>
          </div>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" /> PMs Activos
            </div>
            <div className="text-xl font-black text-white">{summary.total_pms}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {summary.total_pms_with_pending > 0 ? (
                <span className="text-amber-400 font-bold">{summary.total_pms_with_pending} con saldo por pagar</span>
              ) : (
                <span className="text-emerald-400">Todos al día</span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-purple-400" /> Servidores a Cargo
            </div>
            <div className="text-xl font-black text-purple-300">{summary.total_managed_servers}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Bajo supervisión de PMs</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" /> Campañas Gestionadas
            </div>
            <div className="text-xl font-black text-cyan-300">{summary.total_managed_campaigns}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Asignadas a PMs</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" /> Honorarios Totales
            </div>
            <div className="text-xl font-black text-slate-200">
              ${summary.grand_total_accrued_fees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Devengados en campañas</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Total Liquidado
            </div>
            <div className="text-xl font-black text-emerald-400">
              ${summary.grand_total_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Pagado efectivamente</div>
          </div>

          <div className={`rounded-xl p-3.5 border ${summary.grand_total_pending > 0 ? 'bg-amber-950/30 border-amber-600/50' : 'bg-slate-950/60 border-slate-800'}`}>
            <div className="text-xs font-semibold mb-1 flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Saldo Pendiente
            </div>
            <div className={`text-xl font-black ${summary.grand_total_pending > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
              ${summary.grand_total_pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {summary.grand_total_pending > 0 ? 'Por liquidar a PMs' : 'Sin saldos pendientes'}
            </div>
          </div>

        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por PM, servidor o campaña..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Todos los PMs ({data?.pms?.length || 0})</option>
              <option value="pending" className="bg-slate-900">Con Saldo Pendiente</option>
              <option value="paid" className="bg-slate-900">Al Día (Sin pendientes)</option>
              <option value="active_campaigns" className="bg-slate-900">Con Campañas Activas</option>
            </select>
          </div>

          {/* Server Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Building className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Todos los Servidores</option>
              {uniqueServers.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900">{s.name} ({s.game})</option>
              ))}
            </select>
          </div>

          <span className="text-xs font-medium text-slate-500 ml-auto md:ml-0">
            Mostrando {filteredPms.length} de {data?.pms?.length || 0} PMs
          </span>
        </div>
      </div>

      {/* Main PMs List */}
      {filteredPms.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-200 mb-1">No se encontraron Promoter Managers</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No hay PMs que coincidan con los filtros de búsqueda o servidores seleccionados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPms.map((pm) => {
            const isExpanded = expandedPmId === pm.pm_id;
            const activeTab = pmActiveSubTab[pm.pm_id] || 'campaigns';

            return (
              <div
                key={pm.pm_id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-700/80 shadow-lg"
              >
                {/* PM Header Card */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Avatar & Basic Info */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-lg shrink-0 shadow-inner">
                      {pm.full_name?.slice(0, 2).toUpperCase() || 'PM'}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-white hover:text-amber-400 transition-colors">
                          {pm.full_name}
                        </h2>
                        <span className="text-xs text-slate-400 font-mono">@{pm.username}</span>
                        
                        {/* Status Badge */}
                        {pm.metrics.pending_balance > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDIENTE: ${pm.metrics.pending_balance.toFixed(2)} USD
                          </span>
                        ) : pm.metrics.total_fees_earned > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> AL DÍA
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold">
                            Sin Honorarios Asignados
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>📧 {pm.email}</span>
                        {pm.phone && <span>📞 {pm.phone}</span>}
                        <span className="text-slate-600">•</span>
                        <span>{pm.servers.length} {pm.servers.length === 1 ? 'servidor' : 'servidores'} asignados</span>
                        <span className="text-slate-600">•</span>
                        <span>{pm.campaigns.length} {pm.campaigns.length === 1 ? 'campaña' : 'campañas'} a cargo</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Financial Stats & Actions */}
                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3.5 py-2 text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Devengado</div>
                      <div className="text-sm font-black text-slate-200">
                        ${pm.metrics.total_fees_earned.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3.5 py-2 text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pagado</div>
                      <div className="text-sm font-black text-emerald-400">
                        ${pm.metrics.total_paid.toFixed(2)}
                      </div>
                    </div>

                    <div className={`border rounded-xl px-3.5 py-2 text-right ${pm.metrics.pending_balance > 0 ? 'bg-amber-950/30 border-amber-500/40' : 'bg-slate-950/70 border-slate-800/80'}`}>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Por Pagar</div>
                      <div className={`text-sm font-black ${pm.metrics.pending_balance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        ${pm.metrics.pending_balance.toFixed(2)}
                      </div>
                    </div>

                    {/* Action Pay Button */}
                    <button
                      onClick={() => handleOpenPayModal(pm, null, null)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" /> Liquidar Pago
                    </button>

                    {/* Accordion Expand/Collapse Button */}
                    <button
                      onClick={() => setExpandedPmId(isExpanded ? null : pm.pm_id)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
                      title={isExpanded ? 'Colapsar detalles' : 'Expandir detalles'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/40 p-5 space-y-4">
                    
                    {/* Sub-tabs Header */}
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <button
                        onClick={() => setPmActiveSubTab(prev => ({ ...prev, [pm.pm_id]: 'campaigns' }))}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                          activeTab === 'campaigns'
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        <Target className="w-3.5 h-3.5" />
                        Campañas Asignadas ({pm.campaigns.length})
                      </button>

                      <button
                        onClick={() => setPmActiveSubTab(prev => ({ ...prev, [pm.pm_id]: 'servers' }))}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                          activeTab === 'servers'
                            ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        <Server className="w-3.5 h-3.5" />
                        Servidores a Cargo ({pm.servers.length})
                      </button>

                      <button
                        onClick={() => setPmActiveSubTab(prev => ({ ...prev, [pm.pm_id]: 'payments' }))}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                          activeTab === 'payments'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Historial de Pagos ({pm.payments.length})
                      </button>
                    </div>

                    {/* Sub-tab 1: Campaigns */}
                    {activeTab === 'campaigns' && (
                      <div>
                        {pm.campaigns.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-xs">
                            Este PM no tiene campañas activas o concluidas asignadas.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                                <tr>
                                  <th className="py-3 px-4">Campaña</th>
                                  <th className="py-3 px-4">Servidor</th>
                                  <th className="py-3 px-4">Estado</th>
                                  <th className="py-3 px-4">Avance Entregas</th>
                                  <th className="py-3 px-4">Streamers</th>
                                  <th className="py-3 px-4 text-right">Honorario PM</th>
                                  <th className="py-3 px-4 text-right">Pagado</th>
                                  <th className="py-3 px-4 text-right">Pendiente</th>
                                  <th className="py-3 px-4 text-center">Estado Honorario</th>
                                  <th className="py-3 px-4 text-right">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                                {pm.campaigns.map((camp) => {
                                  const isCompleted = camp.status === 'completed';
                                  const isPendingPay = camp.pending_fee > 0;

                                  return (
                                    <tr key={camp.id} className="hover:bg-slate-900/60 transition-colors">
                                      {/* Campaign Name */}
                                      <td className="py-3 px-4 font-bold text-slate-200">
                                        {camp.name}
                                        {camp.start_date && (
                                          <div className="text-[11px] text-slate-500 font-normal">
                                            {camp.start_date} {camp.end_date ? `al ${camp.end_date}` : ''}
                                          </div>
                                        )}
                                      </td>

                                      {/* Server Name */}
                                      <td className="py-3 px-4">
                                        <span className="font-semibold text-purple-300">{camp.server_name}</span>
                                        <span className="text-[10px] text-slate-500 block">{camp.server_game}</span>
                                      </td>

                                      {/* Status Badge */}
                                      <td className="py-3 px-4">
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                          camp.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : camp.status === 'completed'
                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                            : camp.status === 'paused'
                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            : 'bg-slate-800 text-slate-400'
                                        }`}>
                                          {camp.status === 'active' ? 'ACTIVA' : camp.status === 'completed' ? 'CONCLUIDA' : camp.status.toUpperCase()}
                                        </span>
                                      </td>

                                      {/* Progress */}
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                              className={`h-full ${camp.evidences_progress_percentage >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                              style={{ width: `${Math.min(100, camp.evidences_progress_percentage || 0)}%` }}
                                            />
                                          </div>
                                          <span className="text-[11px] font-mono text-slate-300">
                                            {camp.approved_evidences}/{camp.target_evidences || '∞'} ({camp.evidences_progress_percentage}%)
                                          </span>
                                        </div>
                                      </td>

                                      {/* Streamers & Hours */}
                                      <td className="py-3 px-4 text-slate-300 font-mono">
                                        {camp.creators_count} streamers • {camp.actual_hours}h
                                      </td>

                                      {/* Fee */}
                                      <td className="py-3 px-4 text-right font-black text-slate-200">
                                        ${camp.pm_fee.toFixed(2)}
                                      </td>

                                      {/* Paid */}
                                      <td className="py-3 px-4 text-right font-black text-emerald-400">
                                        ${camp.paid_to_pm.toFixed(2)}
                                      </td>

                                      {/* Pending */}
                                      <td className={`py-3 px-4 text-right font-black ${camp.pending_fee > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                        ${camp.pending_fee.toFixed(2)}
                                      </td>

                                      {/* Fee Status */}
                                      <td className="py-3 px-4 text-center">
                                        {camp.fee_status === 'paid' ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                            PAGADO
                                          </span>
                                        ) : camp.fee_status === 'partial' ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                            PARCIAL
                                          </span>
                                        ) : camp.fee_status === 'pending' ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                            PENDIENTE
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-slate-500">Sin Honorario</span>
                                        )}
                                      </td>

                                      {/* Action Button */}
                                      <td className="py-3 px-4 text-right">
                                        {isPendingPay ? (
                                          <button
                                            onClick={() => handleOpenPayModal(pm, camp, null)}
                                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold rounded-lg text-[11px] border border-amber-500/30 transition-colors"
                                          >
                                            Liquidar
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleOpenPayModal(pm, camp, null)}
                                            className="px-2 py-1 text-slate-400 hover:text-slate-200 text-[11px] font-medium"
                                          >
                                            + Abono
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-tab 2: Servers */}
                    {activeTab === 'servers' && (
                      <div>
                        {pm.servers.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-xs">
                            Este PM no tiene servidores asignados como supervisor directo.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {pm.servers.map((srv) => (
                              <div
                                key={srv.id}
                                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      {srv.logo_url ? (
                                        <img src={srv.logo_url} alt={srv.name} className="w-7 h-7 rounded-lg object-cover" />
                                      ) : (
                                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs">
                                          {srv.name.slice(0, 1)}
                                        </div>
                                      )}
                                      <div>
                                        <h4 className="font-bold text-white text-sm">{srv.name}</h4>
                                        <span className="text-[10px] text-slate-400">{srv.game}</span>
                                      </div>
                                    </div>

                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      srv.status === 'active'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {srv.status === 'active' ? 'ACTIVO' : srv.status.toUpperCase()}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5 text-xs text-slate-400 my-3">
                                    <div className="flex justify-between">
                                      <span>Presupuesto Servidor:</span>
                                      <span className="font-bold text-slate-200">${srv.budget.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Gasto Total Registrado:</span>
                                      <span className="font-bold text-rose-400">${srv.total_spent.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Presupuesto Restante:</span>
                                      <span className="font-bold text-emerald-400">${srv.budget_remaining.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-slate-800">
                                      <span>Campañas a cargo:</span>
                                      <span className="text-slate-300">{srv.active_campaigns} activas / {srv.total_campaigns} totales</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Creadores vinculados:</span>
                                      <span className="text-slate-300">{srv.creators_count} streamers</span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleOpenPayModal(pm, null, srv)}
                                  className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <DollarSign className="w-3.5 h-3.5 text-amber-400" /> Registrar Gasto/Pago en Servidor
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-tab 3: Payments History */}
                    {activeTab === 'payments' && (
                      <div>
                        {pm.payments.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-xs">
                            No se han registrado pagos previos a este Promoter Manager.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                                <tr>
                                  <th className="py-3 px-4">Fecha</th>
                                  <th className="py-3 px-4">Concepto</th>
                                  <th className="py-3 px-4">Servidor / Campaña</th>
                                  <th className="py-3 px-4">Método</th>
                                  <th className="py-3 px-4">Referencia</th>
                                  <th className="py-3 px-4 text-right">Monto Pagado</th>
                                  <th className="py-3 px-4 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                                {pm.payments.map((pay) => (
                                  <tr key={pay.id} className="hover:bg-slate-900/60 transition-colors">
                                    <td className="py-3 px-4 text-slate-300 font-mono">
                                      {pay.transaction_date}
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-200">
                                      {pay.concept}
                                      {pay.notes && (
                                        <span className="text-[10px] text-slate-500 block font-normal">{pay.notes}</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="font-medium text-purple-300">{pay.server_name}</span>
                                      {pay.campaign_name && pay.campaign_name !== 'Supervisión General' && (
                                        <span className="text-[10px] text-slate-400 block">• {pay.campaign_name}</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-400">
                                      {pay.payment_method}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                                      {pay.payment_reference || 'S/R'}
                                    </td>
                                    <td className="py-3 px-4 text-right font-black text-emerald-400">
                                      +${pay.amount.toFixed(2)} USD
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => {
                                            setSelectedReceipt({ ...pay, recipient_name: pm.full_name, recipient_username: pm.username });
                                            setReceiptModalOpen(true);
                                          }}
                                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                          title="Ver Comprobante de Pago"
                                        >
                                          <Printer className="w-3.5 h-3.5 text-blue-400" />
                                        </button>
                                        <button
                                          onClick={() => handleDeletePayment(pay.id)}
                                          className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                                          title="Anular Pago"
                                        >
                                          <X className="w-3.5 h-3.5" />
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
                    )}

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Realizar Pago a PM */}
      {payModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-black text-white text-base">Registrar Pago a Promoter Manager</h3>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              
              {payError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{payError}</span>
                </div>
              )}

              {paySuccessMsg && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{paySuccessMsg}</span>
                </div>
              )}

              {/* Selector de PM */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Promoter Manager (Destinatario) <span className="text-amber-400">*</span>
                </label>
                <select
                  value={payForm.pm_id}
                  onChange={(e) => {
                    const pId = e.target.value;
                    const pmObj = data?.pms?.find(p => String(p.pm_id) === pId);
                    setSelectedPmForPay(pmObj || null);
                    setPayForm(prev => ({
                      ...prev,
                      pm_id: pId,
                      server_id: pmObj?.servers?.[0]?.id ? String(pmObj.servers[0].id) : '',
                      campaign_id: ''
                    }));
                  }}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Seleccionar PM --</option>
                  {data?.pms?.map(p => (
                    <option key={p.pm_id} value={p.pm_id}>
                      {p.full_name} (@{p.username}) - {p.metrics.pending_balance > 0 ? `Pendiente: $${p.metrics.pending_balance.toFixed(2)}` : 'Al Día'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Servidor */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Servidor Asociado (Carga del gasto) <span className="text-amber-400">*</span>
                </label>
                <select
                  value={payForm.server_id}
                  onChange={(e) => {
                    const sId = e.target.value;
                    setPayForm(prev => ({
                      ...prev,
                      server_id: sId,
                      campaign_id: ''
                    }));
                  }}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Seleccionar Servidor --</option>
                  {/* Prioritize servers assigned to the PM */}
                  {selectedPmForPay?.servers && selectedPmForPay.servers.length > 0 ? (
                    <optgroup label="Servidores Asignados a este PM">
                      {selectedPmForPay.servers.map(s => (
                        <option key={`pm-srv-${s.id}`} value={s.id}>
                          {s.name} ({s.game}) - Presupuesto restante: ${s.budget_remaining.toFixed(2)}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  <optgroup label="Todos los Servidores Activos">
                    {uniqueServers.map(s => (
                      <option key={`all-srv-${s.id}`} value={s.id}>{s.name} ({s.game})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Selector de Campaña (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Campaña Específica (Opcional)
                </label>
                <select
                  value={payForm.campaign_id}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const camp = selectedPmForPay?.campaigns?.find(c => String(c.id) === cId);
                    setPayForm(prev => ({
                      ...prev,
                      campaign_id: cId,
                      concept: camp ? `Honorario Campaña: ${camp.name}` : prev.concept,
                      amount: camp && camp.pending_fee > 0 ? String(camp.pending_fee) : prev.amount
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Ninguna (Supervisión General / Bono) --</option>
                  {selectedPmForPay?.campaigns
                    ?.filter(c => !payForm.server_id || String(c.server_id) === String(payForm.server_id))
                    .map(c => (
                      <option key={`camp-${c.id}`} value={c.id}>
                        {c.name} ({c.status}) - Honorario: ${c.pm_fee.toFixed(2)} (Pendiente: ${c.pending_fee.toFixed(2)})
                      </option>
                    ))
                  }
                </select>
              </div>

              {/* Monto y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Monto ($ USD) <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={payForm.amount}
                      onChange={(e) => setPayForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Fecha de Transacción <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payForm.transaction_date}
                    onChange={(e) => setPayForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Concepto del Pago <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Honorario Cierre de Campaña, Supervisión quincenal..."
                  value={payForm.concept}
                  onChange={(e) => setPayForm(prev => ({ ...prev, concept: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Método de Pago y Referencia */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="USDT / TRC20">USDT / Cripto (TRC20 / BEP20)</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Western Union">Western Union</option>
                    <option value="Binance Pay">Binance Pay</option>
                    <option value="Efectivo">Efectivo / Mano a mano</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Referencia / Hash / Nº Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. TX-9384729"
                    value={payForm.payment_reference}
                    onChange={(e) => setPayForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Notas Internas (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Observaciones adicionales sobre la liquidación..."
                  value={payForm.notes}
                  onChange={(e) => setPayForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingPay ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" /> Confirmar y Registrar Pago
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Recibo de Pago Oficial */}
      {receiptModalOpen && selectedReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
            
            <div className="bg-slate-950 p-6 border-b border-slate-800 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">PMFORGEX</h3>
                  <p className="text-xs text-slate-400">Comprobante Oficial de Liquidación a PM</p>
                </div>
              </div>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">ID Transacción:</span>
                <span className="font-mono font-bold text-slate-200">TX-PM-{selectedReceipt.id}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Promoter Manager:</span>
                <span className="font-bold text-white">{selectedReceipt.recipient_name} (@{selectedReceipt.recipient_username})</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Servidor:</span>
                <span className="font-semibold text-purple-300">{selectedReceipt.server_name} ({selectedReceipt.server_game})</span>
              </div>

              {selectedReceipt.campaign_name && (
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Campaña:</span>
                  <span className="font-semibold text-amber-300">{selectedReceipt.campaign_name}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Concepto:</span>
                <span className="font-medium text-slate-200">{selectedReceipt.concept}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Método de Pago:</span>
                <span className="text-slate-200 font-medium">{selectedReceipt.payment_method}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Referencia:</span>
                <span className="font-mono text-slate-300">{selectedReceipt.payment_reference || 'S/R'}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Fecha de Liquidación:</span>
                <span className="text-slate-200">{selectedReceipt.transaction_date}</span>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex justify-between items-center my-3">
                <span className="font-bold text-emerald-300 text-sm">TOTAL LIQUIDADO:</span>
                <span className="text-xl font-black text-emerald-400">
                  ${selectedReceipt.amount.toFixed(2)} USD
                </span>
              </div>

              {selectedReceipt.notes && (
                <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-bold block text-slate-300 mb-0.5">Notas:</span>
                  {selectedReceipt.notes}
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-2 text-xs"
              >
                <Printer className="w-4 h-4 text-amber-400" /> Imprimir Comprobante
              </button>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
