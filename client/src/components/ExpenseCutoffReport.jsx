import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Calendar, Filter, Download, Printer, RefreshCw,
  Users, Server, Shield, FileText, Search, ChevronDown, ChevronUp,
  Clock, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight,
  CheckCircle2, AlertCircle, Eye, Sparkles, ExternalLink, X,
  Receipt, Briefcase, Award, Edit2, Trash2
} from 'lucide-react';

export default function ExpenseCutoffReport({
  token,
  servers = [],
  userRole = 'super_admin'
}) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('streamers'); // 'streamers', 'servers', 'pms', 'transactions'
  const [searchTerm, setSearchTerm] = useState('');

  // Cutoff & Date Filter States
  const [selectedCutoff, setSelectedCutoff] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedServerId, setSelectedServerId] = useState('');

  // Expanded rows for item details
  const [expandedStreamers, setExpandedStreamers] = useState({});
  const [expandedPms, setExpandedPms] = useState({});
  const [selectedItemModal, setSelectedItemModal] = useState(null);

  // Edit & Delete Payment State
  const [editLogModalOpen, setEditLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editLogForm, setEditLogForm] = useState({
    amount: '',
    concept: '',
    payment_reference: '',
    notes: ''
  });
  const [savingLog, setSavingLog] = useState(false);

  const handleDeleteLog = async (log) => {
    const isEvidence = log.type === 'streamer_evidence';
    const confirmMsg = isEvidence
      ? `¿Seguro que deseas anular y eliminar el pago de $${log.amount} USD a ${log.recipient_name}?\n\nLa entrega volverá a estado "Aprobado" y se recalcularán los gastos del corte.`
      : `¿Seguro que deseas anular y eliminar la transacción "${log.concept}" ($${log.amount} USD)?\n\nEsta acción recalculará los balances del corte contable.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const url = isEvidence
        ? `/api/evidences/${log.raw_id}/pay`
        : `/api/financials/transactions/${log.raw_id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        fetchReport();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al anular la transacción.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al anular.');
    }
  };

  const handleOpenEditLog = (log) => {
    setEditingLog(log);
    setEditLogForm({
      amount: log.amount || '',
      concept: log.concept || '',
      payment_reference: log.payment_reference === 'S/R' ? '' : (log.payment_reference || ''),
      notes: log.notes || ''
    });
    setEditLogModalOpen(true);
  };

  const handleSaveEditLog = async (e) => {
    e.preventDefault();
    if (!editingLog) return;
    setSavingLog(true);

    try {
      const isEvidence = editingLog.type === 'streamer_evidence';
      const url = isEvidence
        ? `/api/evidences/${editingLog.raw_id}/pay`
        : `/api/financials/transactions/${editingLog.raw_id}`;

      const payload = isEvidence
        ? {
            payout_amount: editLogForm.amount,
            payment_reference: editLogForm.payment_reference,
            payment_notes: editLogForm.notes
          }
        : {
            amount: editLogForm.amount,
            concept: editLogForm.concept,
            payment_reference: editLogForm.payment_reference,
            notes: editLogForm.notes
          };

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEditLogModalOpen(false);
        setEditingLog(null);
        fetchReport();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar el pago.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar.');
    } finally {
      setSavingLog(false);
    }
  };

  // Fetch report data from API
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCutoff) params.append('cutoff', selectedCutoff);
      if (selectedCutoff === 'custom') {
        if (customStartDate) params.append('startDate', customStartDate);
        if (customEndDate) params.append('endDate', customEndDate);
      }
      if (selectedServerId) params.append('serverId', selectedServerId);

      const res = await fetch(`/api/financials/expense-report?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        if (data.period?.startDate) setCustomStartDate(data.period.startDate);
        if (data.period?.endDate) setCustomEndDate(data.period.endDate);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al obtener el informe de gastos por corte.');
      }
    } catch (err) {
      console.error('Error fetching expense cutoff report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedCutoff, selectedServerId]);

  // Handle Cutoff Change
  const handleCutoffChange = (cutoffVal) => {
    setSelectedCutoff(cutoffVal);
  };

  // Toggle Streamer Details
  const toggleStreamerExpand = (id) => {
    setExpandedStreamers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle PM Details
  const togglePmExpand = (id) => {
    setExpandedPms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!reportData) return;
    const periodLabel = reportData.period?.label || 'corte';
    const cleanLabel = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `informe_gastos_corte_${cleanLabel}_${dateStr}.csv`;

    let csvContent = '\uFEFF'; // BOM for Excel UTF-8

    // Header & Summary Section
    csvContent += `INFORME CONSOLIDADO DE GASTOS Y CORTES DE PAGO - PMFORGEX\n`;
    csvContent += `Periodo del Corte:;${reportData.period?.label || 'Histórico'}\n`;
    csvContent += `Fecha Generación:;${new Date().toLocaleString()}\n`;
    csvContent += `Total Gastos Globales ($):;${reportData.summary?.total_expenses || 0}\n`;
    csvContent += `Total Liquidado a Streamers ($):;${reportData.summary?.total_streamers_paid || 0}\n`;
    csvContent += `Total Pagado a PMs ($):;${reportData.summary?.total_pms_paid || 0}\n`;
    csvContent += `Otros Gastos Operativos ($):;${reportData.summary?.total_other_expenses || 0}\n`;
    csvContent += `Total Ingresos del Corte ($):;${reportData.summary?.total_income || 0}\n`;
    csvContent += `Ganancia Neta del Corte ($):;${reportData.summary?.net_profit || 0}\n`;
    csvContent += `Margen de Ganancia (%):;${reportData.summary?.profit_margin_percentage || 0}%\n`;
    csvContent += `Total Horas Transmitidas:;${reportData.summary?.total_stream_hours || 0}h\n`;
    csvContent += `Total Directos Auditados:;${reportData.summary?.total_streams_count || 0}\n\n`;

    // Section 1: Streamers Expenses
    csvContent += `--- DESGLOSE DE GASTOS POR STREAMER ---\n`;
    csvContent += `ID;Alias;Nombre;Usuario;Servidores;Directos Pagados;Horas Transmitidas;Pago Directos ($);Otros Abonos ($);Gasto Total ($);Costo/Hora ($/h)\n`;
    (reportData.streamers || []).forEach(st => {
      const srvList = (st.servers || []).map(s => s.server_name).join(' | ');
      csvContent += `${st.streamer_id};"${st.alias}";"${st.full_name}";"@${st.username}";"${srvList}";${st.streams_count};${st.total_hours};${st.evidence_payout};${st.contract_and_manual_payout};${st.total_spent};${st.cost_per_hour}\n`;
    });
    csvContent += `\n`;

    // Section 2: Servers Expenses
    csvContent += `--- DESGLOSE DE GASTOS POR SERVIDOR ---\n`;
    csvContent += `ID;Servidor;Juego;Presupuesto ($);PMs Asignados;Gasto Streamers ($);Pagos PMs ($);Otros Gastos ($);Gasto Total ($);Ingresos ($);Ganancia / Remanente ($);Margen (%);Estado\n`;
    (reportData.servers || []).forEach(srv => {
      const pmsList = (srv.assigned_pms || []).map(p => p.name).join(' | ');
      const statusLabel = srv.status_label || (srv.is_profitable ? 'EFICIENTE' : 'DÉFICIT');
      csvContent += `${srv.server_id};"${srv.server_name}";"${srv.game}";${srv.server_budget};"${pmsList}";${srv.streamers_expense};${srv.pm_expense};${srv.other_expense};${srv.total_expenses};${srv.total_income};${srv.net_profit};${srv.profit_margin_percentage}%;"${statusLabel}"\n`;
    });
    csvContent += `\n`;

    // Section 3: PMs Payments
    csvContent += `--- DESGLOSE DE PAGOS A PROMOTER MANAGERS ---\n`;
    csvContent += `ID;PM;Usuario;Email;Servidores;Honorarios y Pagos ($);Total Pagado ($);Recibos\n`;
    (reportData.pms || []).forEach(pm => {
      const srvList = (pm.supervised_servers || []).map(s => s.name).join(' | ');
      csvContent += `${pm.pm_id};"${pm.full_name}";"@${pm.username}";"${pm.email}";"${srvList}";${pm.fee_payments};${pm.total_paid};${pm.transactions_count}\n`;
    });
    csvContent += `\n`;

    // Section 4: Detailed Payments Audit Log
    csvContent += `--- AUDITORÍA DETALLADA DE TRANSACCIONES Y PAGOS DEL CORTE ---\n`;
    csvContent += `ID;Fecha;Tipo;Destinatario;Rol;Servidor;Campaña Asociada;Concepto;Referencia;Método Pago;Monto ($);Notas\n`;
    (reportData.audit_log || []).forEach(log => {
      csvContent += `"${log.id}";"${log.date}";"${log.category_label}";"${log.recipient_name}";"${log.recipient_role}";"${log.server_name || ''}";"${log.campaign_name || ''}";"${log.concept}";"${log.payment_reference}";"${log.payment_method}";${log.amount};"${log.notes || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Filtered streamers by search
  const filteredStreamers = useMemo(() => {
    if (!reportData?.streamers) return [];
    if (!searchTerm.trim()) return reportData.streamers;
    const term = searchTerm.toLowerCase().trim();
    return reportData.streamers.filter(s =>
      (s.alias && s.alias.toLowerCase().includes(term)) ||
      (s.full_name && s.full_name.toLowerCase().includes(term)) ||
      (s.username && s.username.toLowerCase().includes(term)) ||
      (s.servers && s.servers.some(srv => srv.server_name.toLowerCase().includes(term)))
    );
  }, [reportData?.streamers, searchTerm]);

  // Filtered servers by search
  const filteredServers = useMemo(() => {
    if (!reportData?.servers) return [];
    if (!searchTerm.trim()) return reportData.servers;
    const term = searchTerm.toLowerCase().trim();
    return reportData.servers.filter(s =>
      (s.server_name && s.server_name.toLowerCase().includes(term)) ||
      (s.game && s.game.toLowerCase().includes(term)) ||
      (s.assigned_pms && s.assigned_pms.some(p => p.name.toLowerCase().includes(term)))
    );
  }, [reportData?.servers, searchTerm]);

  // Filtered PMs by search
  const filteredPms = useMemo(() => {
    if (!reportData?.pms) return [];
    if (!searchTerm.trim()) return reportData.pms;
    const term = searchTerm.toLowerCase().trim();
    return reportData.pms.filter(p =>
      (p.full_name && p.full_name.toLowerCase().includes(term)) ||
      (p.username && p.username.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term))
    );
  }, [reportData?.pms, searchTerm]);

  // Filtered audit log by search
  const filteredAuditLog = useMemo(() => {
    if (!reportData?.audit_log) return [];
    if (!searchTerm.trim()) return reportData.audit_log;
    const term = searchTerm.toLowerCase().trim();
    return reportData.audit_log.filter(a =>
      (a.recipient_name && a.recipient_name.toLowerCase().includes(term)) ||
      (a.concept && a.concept.toLowerCase().includes(term)) ||
      (a.server_name && a.server_name.toLowerCase().includes(term)) ||
      (a.payment_reference && a.payment_reference.toLowerCase().includes(term))
    );
  }, [reportData?.audit_log, searchTerm]);

  return (
    <div className="space-y-6">

      {/* ================= CONTROLES DE CORTE & FECHAS ================= */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
        
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white font-heading flex items-center gap-2">
                  <span>Informe de Gastos por Cortes & Fechas</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                    Auditoría Financiera
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Liquidación por streamers, gastos por servidor, pagos de PMs y auditoría de transacciones por ciclo contable.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={loading || !reportData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
              title="Descargar informe completo como archivo CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !reportData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
              title="Imprimir informe oficial o guardar como PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={fetchReport}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-700"
              title="Actualizar datos del informe"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cutoff Preset Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Corte / Ciclo:</span>
              </span>
              <select
                value={selectedCutoff}
                onChange={e => handleCutoffChange(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-semibold focus:outline-none focus:border-amber-500/60"
              >
                <option value="all">🌟 Histórico Completo</option>
                <option value="current_month">📅 Mes Actual (Completo)</option>
                <option value="previous_month">📅 Mes Anterior (Completo)</option>
                <option value="q1_current">✂️ 1ª Quincena Actual (01 al 15)</option>
                <option value="q2_current">✂️ 2ª Quincena Actual (16 al Fin)</option>
                <option value="q1_previous">✂️ 1ª Quincena Anterior (01 al 15)</option>
                <option value="q2_previous">✂️ 2ª Quincena Anterior (16 al Fin)</option>
                <option value="7d">⏱️ Últimos 7 Días</option>
                <option value="15d">⏱️ Últimos 15 Días</option>
                <option value="30d">⏱️ Últimos 30 Días</option>
                <option value="custom">📆 Rango por Fechas Personalizado</option>
              </select>
            </div>

            {/* Custom Date Inputs (if custom is selected or to refine) */}
            {selectedCutoff === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Desde:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500/60"
                  />
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Hasta:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchReport}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Filtrar
                </button>
              </div>
            )}

            {/* Server Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Servidor:</span>
              </span>
              <select
                value={selectedServerId}
                onChange={e => setSelectedServerId(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-semibold focus:outline-none focus:border-amber-500/60"
              >
                <option value="">Todos los Servidores ({servers.length})</option>
                {servers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.game || 'Metin2'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Period Badge */}
          {reportData?.period && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-amber-500/30 rounded-xl text-amber-300 font-semibold shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{reportData.period.label}</span>
            </div>
          )}

        </div>

      </div>

      {/* ================= TARJETAS KPI RESUMEN DEL CORTE ================= */}
      {reportData && reportData.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* Total Expenses */}
          <div className="p-5 bg-slate-900 border border-red-500/30 rounded-2xl relative overflow-hidden">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center justify-between">
              <span>Gasto Total del Corte</span>
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-white font-heading mt-2 font-mono">
              ${reportData.summary.total_expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
              <span>Streamers + PMs + Otros</span>
              <span className="font-semibold text-red-400">Salidas</span>
            </div>
          </div>

          {/* Streamers Expenses */}
          <div className="p-5 bg-slate-900 border border-purple-500/30 rounded-2xl relative overflow-hidden">
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center justify-between">
              <span>Gastos en Streamers</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-300 font-heading mt-2 font-mono">
              ${reportData.summary.total_streamers_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
              <span>{reportData.summary.total_streams_count} directos pagados</span>
              <span className="font-semibold text-slate-300">{reportData.summary.total_stream_hours}h</span>
            </div>
          </div>

          {/* PMs Payments */}
          <div className="p-5 bg-slate-900 border border-amber-500/30 rounded-2xl relative overflow-hidden">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Pagos a PMs</span>
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300 font-heading mt-2 font-mono">
              ${reportData.summary.total_pms_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
              <span>Honorarios & Liquidaciones</span>
              <span className="font-semibold text-amber-400">{reportData.summary.active_pms_count} PMs</span>
            </div>
          </div>

          {/* Server Income */}
          <div className="p-5 bg-slate-900 border border-emerald-500/30 rounded-2xl relative overflow-hidden">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>Ingresos en el Corte</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-300 font-heading mt-2 font-mono">
              ${reportData.summary.total_income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
              <span>Aperturas & Cuotas</span>
              <span className="font-semibold text-emerald-400">Entradas</span>
            </div>
          </div>

          {/* Net Profit & Margin */}
          <div className={`p-5 bg-slate-900 border rounded-2xl relative overflow-hidden ${
            reportData.summary.is_profitable ? 'border-emerald-500/30' : 'border-red-500/30'
          }`}>
            <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
              <span className={reportData.summary.is_profitable ? 'text-emerald-400' : 'text-red-400'}>
                {reportData.summary.is_profitable ? 'Eficiencia / Ganancia Neta' : 'Déficit del Corte'}
              </span>
              <TrendingUp className={`w-4 h-4 ${reportData.summary.is_profitable ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div className={`text-2xl font-black font-heading mt-2 font-mono ${
              reportData.summary.is_profitable ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {reportData.summary.net_profit >= 0 ? '+' : ''}${reportData.summary.net_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
              <span>Estado Operativo</span>
              <span className={`font-bold uppercase ${reportData.summary.is_profitable ? 'text-emerald-400' : 'text-red-400'}`}>
                {reportData.summary.status_label || (reportData.summary.is_profitable ? 'EFICIENTE' : 'DÉFICIT')} ({reportData.summary.profit_margin_percentage}%)
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ================= PESTAÑAS DEL INFORME & BUSCADOR ================= */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Subtabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('streamers')}
            className={`px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'streamers'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gastos por Streamer ({reportData?.streamers?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('servers')}
            className={`px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'servers'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Gastos por Servidor ({reportData?.servers?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('pms')}
            className={`px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'pms'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Pagos a PMs ({reportData?.pms?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('transactions')}
            className={`px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'transactions'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Auditoría de Pagos ({reportData?.audit_log?.length || 0})</span>
          </button>
        </div>

        {/* Live Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario, servidor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 text-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

      </div>

      {/* ================= CONTENIDO DE CADA PESTAÑA ================= */}

      {/* TAB 1: GASTOS POR STREAMER */}
      {subTab === 'streamers' && (
        <div className="space-y-4">
          {filteredStreamers.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No hay gastos en streamers registrados en este corte</h4>
              <p className="text-xs text-slate-500">Prueba a seleccionar otro periodo o rango de fechas.</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/90 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-4">Streamer / Creador</th>
                      <th className="py-3 px-4">Servidores en el Corte</th>
                      <th className="py-3 px-4 text-center">Directos</th>
                      <th className="py-3 px-4 text-center">Horas</th>
                      <th className="py-3 px-4 text-right">Pago Directos</th>
                      <th className="py-3 px-4 text-right">Otros Abonos</th>
                      <th className="py-3 px-4 text-right">Gasto Total</th>
                      <th className="py-3 px-4 text-right">Costo / Hora</th>
                      <th className="py-3 px-4 text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredStreamers.map(st => {
                      const isExpanded = !!expandedStreamers[st.streamer_id];

                      return (
                        <React.Fragment key={st.streamer_id}>
                          <tr className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={st.avatar_url || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=120'}
                                  alt={st.alias}
                                  className="w-9 h-9 rounded-xl object-cover border border-amber-500/20 shrink-0"
                                />
                                <div>
                                  <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                                    <span>{st.alias || st.full_name}</span>
                                    <span className="text-[10px] text-amber-400 font-mono">@{st.username}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">{st.full_name}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {st.servers.length === 0 ? (
                                <span className="text-slate-600 italic">Sin directos en corte</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {st.servers.map(s => (
                                    <span key={s.server_id} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[10px] text-slate-300">
                                      {s.server_name} (${s.payout})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center font-bold text-white">
                              {st.streams_count}
                            </td>

                            <td className="py-3 px-4 text-center font-bold text-emerald-400">
                              {st.total_hours}h
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-300">
                              ${st.evidence_payout.toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-300">
                              ${st.contract_and_manual_payout.toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <span className="font-black text-amber-400 font-mono text-sm">
                                ${st.total_spent.toFixed(2)}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                              ${st.cost_per_hour}/h
                            </td>

                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => toggleStreamerExpand(st.streamer_id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Ver comprobantes y pagos individuales de este corte"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Payment Details */}
                          {isExpanded && (
                            <tr className="bg-slate-950/70">
                              <td colSpan={9} className="p-4 border-b border-slate-800">
                                <div className="space-y-2">
                                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>Comprobantes y Pagos de {st.alias || st.full_name} en este corte ({st.payment_details.length}):</span>
                                    <span className="text-slate-400 font-normal">Total Liquidado: <strong>${st.total_spent.toFixed(2)} USD</strong></span>
                                  </div>

                                  {st.payment_details.length === 0 ? (
                                    <div className="text-slate-500 italic text-[11px]">No hay transacciones individuales registradas.</div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                                      {st.payment_details.map((p, idx) => (
                                        <div key={idx} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-slate-400 font-mono text-[10px]">{p.date}</span>
                                            <span className="font-extrabold text-amber-400 font-mono">${p.amount.toFixed(2)}</span>
                                          </div>
                                          <div className="text-white font-semibold line-clamp-1">{p.concept}</div>
                                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                                            <span>Servidor: <strong className="text-slate-300">{p.server_name}</strong></span>
                                            <span className="font-mono text-slate-500">{p.payment_reference || 'S/R'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GASTOS POR SERVIDOR */}
      {subTab === 'servers' && (
        <div className="space-y-4">
          {filteredServers.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <Server className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No se encontraron servidores con movimientos en este corte</h4>
              <p className="text-xs text-slate-500">Prueba a limpiar los filtros de búsqueda o seleccionar otro periodo.</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/90 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-4">Servidor</th>
                      <th className="py-3 px-4">PMs Asignados</th>
                      <th className="py-3 px-4 text-right">Límite Servidor</th>
                      <th className="py-3 px-4 text-right">Gasto Streamers</th>
                      <th className="py-3 px-4 text-right">Pagos a PMs</th>
                      <th className="py-3 px-4 text-right">Otros Gastos</th>
                      <th className="py-3 px-4 text-right">Gasto Total Corte</th>
                      <th className="py-3 px-4 text-right">Ingresos Corte</th>
                      <th className="py-3 px-4 text-right">Ganancia / Remanente</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredServers.map(srv => {
                      const isProfitable = srv.is_profitable;
                      const statusLabel = srv.status_label || (isProfitable ? 'EFICIENTE' : 'DÉFICIT');

                      return (
                        <tr key={srv.server_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={srv.logo_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120'}
                                alt={srv.server_name}
                                className="w-9 h-9 rounded-xl object-cover border border-amber-500/20 shrink-0"
                              />
                              <div>
                                <div className="font-extrabold text-white text-xs">
                                  {srv.server_name}
                                </div>
                                <div className="text-[10px] text-amber-400 font-medium">
                                  {srv.game || 'Metin2'} • {srv.total_streams} directos ({srv.total_hours}h)
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {srv.assigned_pms.length === 0 ? (
                              <span className="text-slate-600 italic">Sin PM</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {srv.assigned_pms.map(p => (
                                  <span key={p.id} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[10px] text-slate-300">
                                    @{p.username}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            ${srv.server_budget.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-purple-300">
                            ${srv.streamers_expense.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-amber-300">
                            ${srv.pm_expense.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            ${srv.other_expense.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right font-black font-mono text-white text-sm">
                            ${srv.total_expenses.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">
                            ${srv.total_income.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className={`font-mono font-black ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                              {srv.net_profit >= 0 ? '+' : ''}${srv.net_profit.toFixed(2)}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              {srv.profit_margin_percentage}% {isProfitable ? 'eficiencia' : 'déficit'}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isProfitable
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAGOS A PROMOTER MANAGERS (PMS) */}
      {subTab === 'pms' && (
        <div className="space-y-4">
          {filteredPms.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <Shield className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No hay pagos a PMs registrados en este corte</h4>
              <p className="text-xs text-slate-500">Selecciona otro corte o registra transacciones a favor del equipo de PMs.</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/90 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-4">Promoter Manager</th>
                      <th className="py-3 px-4">Servidores Asignados</th>
                      <th className="py-3 px-4 text-right">Abonos Adicionales</th>
                      <th className="py-3 px-4 text-right">Honorarios Campañas</th>
                      <th className="py-3 px-4 text-right">Total Liquidado</th>
                      <th className="py-3 px-4 text-center">Recibos</th>
                      <th className="py-3 px-4 text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPms.map(pm => {
                      const isExpanded = !!expandedPms[pm.pm_id];

                      return (
                        <React.Fragment key={pm.pm_id}>
                          <tr className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                                  {pm.full_name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                                    <span>{pm.full_name}</span>
                                    <span className="text-[10px] text-amber-400 font-mono">@{pm.username}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">{pm.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {pm.supervised_servers.length === 0 ? (
                                <span className="text-slate-600 italic">Sin servidores</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {pm.supervised_servers.map(s => (
                                    <span key={s.id} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[10px] text-slate-300">
                                      {s.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-300">
                              ${pm.contract_payments.toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-300">
                              ${pm.fee_payments.toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <span className="font-black text-amber-400 font-mono text-sm">
                                ${pm.total_paid.toFixed(2)}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center font-bold text-slate-300">
                              {pm.transactions_count}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => togglePmExpand(pm.pm_id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Ver comprobantes y pagos individuales"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded PM Payment Details */}
                          {isExpanded && (
                            <tr className="bg-slate-950/70">
                              <td colSpan={7} className="p-4 border-b border-slate-800">
                                <div className="space-y-2">
                                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>Comprobantes de Pago de {pm.full_name} en este corte:</span>
                                    <span className="text-slate-400 font-normal">Total Liquidado: <strong>${pm.total_paid.toFixed(2)} USD</strong></span>
                                  </div>

                                  {pm.payment_details.length === 0 ? (
                                    <div className="text-slate-500 italic text-[11px]">No hay recibos individuales registrados en este corte.</div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                                      {pm.payment_details.map((p, idx) => (
                                        <div key={idx} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-slate-400 font-mono text-[10px]">{p.date}</span>
                                            <span className="font-extrabold text-amber-400 font-mono">${p.amount.toFixed(2)}</span>
                                          </div>
                                          <div className="text-white font-semibold line-clamp-1">{p.concept}</div>
                                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                                            <span>Servidor: <strong className="text-slate-300">{p.server_name}</strong></span>
                                            <span className="font-mono text-slate-500">{p.payment_reference || 'S/R'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDITORÍA DE PAGOS INDIVIDUALES */}
      {subTab === 'transactions' && (
        <div className="space-y-4">
          {filteredAuditLog.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No hay transacciones registradas en este corte</h4>
              <p className="text-xs text-slate-500">Prueba a seleccionar otro rango de fechas o limpiar el término de búsqueda.</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/90 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Tipo Movimiento</th>
                      <th className="py-3 px-4">Beneficiario / Destinatario</th>
                      <th className="py-3 px-4">Servidor</th>
                      <th className="py-3 px-4">Concepto</th>
                      <th className="py-3 px-4">Referencia / TXID</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Importe</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredAuditLog.map((log) => {
                      const isIncome = log.type === 'income';

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {log.date}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.type === 'expense_pm'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : log.type === 'streamer_evidence' || log.type === 'expense_streamer'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : isIncome
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {log.category_label}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-sans font-bold text-white text-xs">
                            {log.recipient_name}
                            {log.recipient_username && (
                              <span className="text-[10px] text-amber-400 ml-1 font-mono">@{log.recipient_username}</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-sans text-slate-300">
                            {log.server_name || 'N/A'}
                          </td>

                          <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate" title={log.concept}>
                            {log.concept}
                          </td>

                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {log.payment_reference || 'S/R'}
                          </td>

                          <td className="py-3 px-4 font-sans text-slate-400 text-[11px]">
                            {log.payment_method || 'Transferencia'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className={`font-black text-xs ${
                              isIncome ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {isIncome ? '+' : '-'}${log.amount.toFixed(2)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-sans">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditLog(log)}
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
                                title="Editar pago o movimiento"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log)}
                                className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                                title={log.type === 'streamer_evidence' ? "Anular pago de entrega (revertir a aprobado)" : "Anular y eliminar transacción"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: EDITAR PAGO O MOVIMIENTO CONTABLE ================= */}
      {editLogModalOpen && editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => { setEditLogModalOpen(false); setEditingLog(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-base font-extrabold text-white">Editar Pago / Transacción</h4>
                <p className="text-xs text-slate-400">
                  Modifica los datos del comprobante para recalcular automáticamente el corte contable.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditLog} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  value={editLogForm.concept}
                  onChange={e => setEditLogForm({ ...editLogForm, concept: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Monto ($ USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editLogForm.amount}
                  onChange={e => setEditLogForm({ ...editLogForm, amount: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-bold font-mono text-base"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Referencia / Comprobante</label>
                <input
                  type="text"
                  value={editLogForm.payment_reference}
                  onChange={e => setEditLogForm({ ...editLogForm, payment_reference: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Notas / Observaciones</label>
                <input
                  type="text"
                  value={editLogForm.notes}
                  onChange={e => setEditLogForm({ ...editLogForm, notes: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setEditLogModalOpen(false); setEditingLog(null); }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLog}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold"
                >
                  {savingLog ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
