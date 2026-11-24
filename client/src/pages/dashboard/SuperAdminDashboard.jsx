import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import GroupedCampaignsView from '../../components/GroupedCampaignsView';
import ServerFinancialsAndContracts from '../../components/ServerFinancialsAndContracts';
import ExpenseCutoffReport from '../../components/ExpenseCutoffReport';
import PmPayoutsManagement from '../../components/PmPayoutsManagement';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
import { useAuth } from '../../context/AuthContext';
import { 
  ImageIcon, Receipt, Users, Server, Target, Shield, AlertTriangle, CheckCircle2, 
  Plus, Edit, Trash2, UserPlus, RefreshCw, Eye, Lock, Ban, Check,
  Search, UserCheck, DollarSign, Tv, Phone, Mail, FileText, Sparkles, X, ExternalLink, Clock, TrendingUp, Gamepad2, CheckCircle, Tag,
  BarChart3, Flame, Download, Printer, Trophy, Layers, PieChart, Activity, Award, Filter, ArrowUpRight
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [servers, setServers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [creatorsList, setCreatorsList] = useState([]);
  const [loading, setLoading] = useState(true);

    // Evidences & Payouts State
  const [evidences, setEvidences] = useState([]);
  const [evidenceFilter, setEvidenceFilter] = useState('all'); // 'all', 'approved', 'paid', 'review', 'rejected'
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedEvidenceForPay, setSelectedEvidenceForPay] = useState(null);
  const [payoutForm, setPayoutForm] = useState({ payout_amount: '', payment_reference: '', payment_notes: '' });
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [imageModalUrl, setImageModalUrl] = useState(null);

  // Reports & Analytics State
  const [reportsData, setReportsData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsTimeRange, setReportsTimeRange] = useState('all'); // 'all', '30d', '7d'
  const [reportsSubTab, setReportsSubTab] = useState('streamers'); // 'streamers', 'platform', 'servers', 'pms', 'financials'
  const [reportSearch, setReportSearch] = useState('');

    // Server Financial Reports State (P&L por Servidor)
  const [serverFinancials, setServerFinancials] = useState(null);
  const [serverFinancialsLoading, setServerFinancialsLoading] = useState(false);
  const [financialModalOpen, setFinancialModalOpen] = useState(false);
  const [financialForm, setFinancialForm] = useState({
    server_id: '',
    type: 'income',
    category: 'opening_fee',
    concept: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_reference: '',
    payment_method: 'Transferencia',
    recipient_or_payer_name: '',
    notes: ''
  });
  const [financialSubmitting, setFinancialSubmitting] = useState(false);
  const [selectedServerLedger, setSelectedServerLedger] = useState(null);
  const [serverLedgerModalOpen, setServerLedgerModalOpen] = useState(false);
  const [financialSearch, setFinancialSearch] = useState('');

  // Talent management state (PM & Streamers)
  const [talentSearch, setTalentSearch] = useState('');
  const [talentRoleFilter, setTalentRoleFilter] = useState('all'); // 'all', 'pm', 'creator'
  const [talentStatusFilter, setTalentStatusFilter] = useState('all'); // 'all', 'active', 'suspended'
  const [detailTalentModalOpen, setDetailTalentModalOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState(null);
  const [editTalentModalOpen, setEditTalentModalOpen] = useState(false);
  const [editingTalent, setEditingTalent] = useState(null);
  const [talentSaving, setTalentSaving] = useState(false);

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [editCampaignModalOpen, setEditCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const [newUser, setNewUser] = useState({
    username: '', email: '', password: '', full_name: '', role: 'pm', phone: '', notes: '',
    alias: '', hourly_rate_internal: 0, fixed_rate_internal: 0
  });
  const [newServer, setNewServer] = useState({
    name: '', game: 'Metin2', contact_info: '', pm_user_id: '', pm_ids: [], budget: '', owner_user_id: '', website_url: '', notes: '', creator_ids: []
  });
  const [newCampaign, setNewCampaign] = useState({
    name: '', server_id: '', objective: '', requirements: '', budget_internal: 0, target_evidences: 0, target_hours: 0, pm_fee: 0, status: 'active', creator_ids: [], pm_ids: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [mRes, uRes, sRes, cRes, aRes, crRes, eRes] = await Promise.all([
        fetch('/api/metrics/dashboard', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/servers', { headers }),
        fetch('/api/campaigns', { headers }),
        fetch('/api/audit?limit=25', { headers }),
        fetch('/api/creators', { headers }),
        fetch('/api/evidences', { headers })
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (sRes.ok) setServers(await sRes.json());
      if (cRes.ok) setCampaigns(await cRes.json());
      if (aRes.ok) setAuditLogs(await aRes.json());
      if (crRes.ok) setCreatorsList(await crRes.json());
      if (eRes && eRes.ok) setEvidences(await eRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle User Status Toggle
  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete User (Soft Delete)
  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Seguro que deseas dar de baja este usuario? Se conservará en el histórico pero no podrá acceder.')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Assign PM to Server
  const handleAssignPm = async (serverId, pmId) => {
    try {
      await fetch(`/api/servers/${serverId}/pms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pm_id: parseInt(pmId, 10) })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Remove PM from Server
  const handleRemovePm = async (serverId, pmId) => {
    try {
      await fetch(`/api/servers/${serverId}/pms/${pmId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Update Server Budget
  const handleUpdateServerBudget = async (serverId, budgetVal) => {
    try {
      await fetch(`/api/servers/${serverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ budget: parseFloat(budgetVal) || 0 })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Assign Streamer to Server (Admin Exclusive)
  const handleAssignCreatorToServer = async (serverId, creatorId) => {
    if (!creatorId) return;
    try {
      const res = await fetch(`/api/servers/${serverId}/creators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ creator_id: parseInt(creatorId, 10) })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Remove Streamer from Server (Admin Exclusive)
  const handleRemoveCreatorFromServer = async (serverId, creatorId) => {
    if (!confirm('¿Desvincular este streamer del servidor?')) return;
    try {
      const res = await fetch(`/api/servers/${serverId}/creators/${creatorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Create User
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setUserModalOpen(false);
        setNewUser({ username: '', email: '', password: '', full_name: '', role: 'pm', phone: '', notes: '', alias: '', hourly_rate_internal: 0, fixed_rate_internal: 0 });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Create Server
  const handleCreateServerSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newServer)
      });
      if (res.ok) {
        setServerModalOpen(false);
        setNewServer({ name: '', game: 'Metin2', contact_info: '', pm_user_id: '', pm_ids: [], budget: '', owner_user_id: '', website_url: '', notes: '', creator_ids: [] });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Toggle Suspend / Reactivate Server (Super Admin Exclusive)
  const handleToggleSuspendServer = async (server) => {
    const isSuspended = server.status === 'suspended';
    const actionText = isSuspended ? 'reactivar' : 'suspender';
    if (!confirm(`¿Estás seguro de que deseas ${actionText} el servidor "${server.name}"?`)) return;

    try {
      const targetStatus = isSuspended ? 'active' : 'suspended';
      const res = await fetch(`/api/servers/${server.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || `Error al ${actionText} servidor`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    }
  };

  // Handle Delete Server (Super Admin Exclusive)
  const handleDeleteServer = async (server) => {
    if (!confirm(`⚠️ ATENCIÓN: ¿Estás seguro de que deseas eliminar permanentemente el servidor "${server.name}"?\n\nEsta acción cancelará sus campañas y asignaciones de streamers.`)) return;

    try {
      const res = await fetch(`/api/servers/${server.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al eliminar servidor');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    }
  };

  // Handle Create Campaign (Admin)
  const handleCreateCampaignSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newCampaign)
      });
      if (res.ok) {
        setCampaignModalOpen(false);
        setNewCampaign({ name: '', server_id: '', objective: '', requirements: '', budget_internal: 0, target_evidences: 0, target_hours: 0, pm_fee: 0, status: 'active', creator_ids: [], pm_ids: [] });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Create Campaign modal (optionally pre-selecting a server)
  const handleOpenCreateCampaignWithServer = (serverId = null) => {
    const sId = serverId ? String(serverId) : (servers[0]?.id ? String(servers[0].id) : '');
    const srv = servers.find(s => String(s.id) === sId);
    const initialPmIds = (srv?.assigned_pms || []).map(p => p.pm_id);
    if (initialPmIds.length === 0 && srv?.pm_user_id) initialPmIds.push(srv.pm_user_id);

    setNewCampaign({
      name: '',
      server_id: sId,
      objective: '',
      requirements: '',
      budget_internal: 0,
      target_evidences: 0,
      target_hours: 0,
      pm_fee: 0,
      status: 'active',
      creator_ids: [],
      pm_ids: initialPmIds
    });
    setCampaignModalOpen(true);
  };

  // Toggle Campaign Status (Active / Paused / Completed)
  const handleToggleCampaignStatus = async (camp, newStatus) => {
    try {
      const res = await fetch(`/api/campaigns/${camp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Open Edit Campaign
  const handleOpenEditCampaign = (camp) => {
    const campPmIds = Array.isArray(camp.pm_ids) && camp.pm_ids.length > 0 
      ? camp.pm_ids 
      : (camp.assigned_pms && camp.assigned_pms.length > 0 
          ? camp.assigned_pms.map(p => p.pm_id) 
          : (camp.pm_user_id ? [camp.pm_user_id] : []));

    setEditingCampaign({
      id: camp.id,
      server_id: camp.server_id,
      server_name: camp.server_name,
      server_budget: camp.server_budget,
      name: camp.name,
      status: camp.status,
      objective: camp.objective || '',
      requirements: camp.requirements || '',
      budget_internal: camp.budget_internal || 0,
      target_evidences: camp.target_evidences || 0,
      target_hours: camp.target_hours || 0,
      pm_fee: camp.pm_fee || 0,
      creators_count: (camp.creators || []).length,
      notes: camp.notes || '',
      pm_ids: campPmIds
    });
    setEditCampaignModalOpen(true);
  };

  // Handle Update Campaign
  const handleUpdateCampaignSubmit = async (e) => {
    e.preventDefault();
    if (!editingCampaign) return;
    try {
      const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingCampaign)
      });
      if (res.ok) {
        setEditCampaignModalOpen(false);
        setEditingCampaign(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete Campaign
  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('¿Seguro que deseas dar de baja esta campaña?')) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Assign Streamer to Campaign
  const handleAssignCreatorToCampaign = async (campaignId, creatorId) => {
    if (!creatorId) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ creator_id: parseInt(creatorId, 10) })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Remove Streamer from Campaign
  const handleRemoveCreatorFromCampaign = async (campaignId, creatorId) => {
    if (!confirm('¿Desvincular este streamer de la campaña?')) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators/${creatorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

    // Handle Evidence Payment by Admin
  const handleOpenPayModal = (ev) => {
    setSelectedEvidenceForPay(ev);
    setIsEditingPayment(false);
    setPayoutForm({
      payout_amount: ev.suggested_payout !== undefined ? ev.suggested_payout : 0,
      payment_reference: `TRX-${Math.floor(100000 + Math.random() * 900000)}`,
      payment_notes: `Liquidación por ${((ev.duration_minutes || 0) / 60).toFixed(1)}h de stream en ${ev.platform}`
    });
    setPayModalOpen(true);
  };

  const handleOpenEditPayModal = (ev) => {
    setSelectedEvidenceForPay(ev);
    setIsEditingPayment(true);
    setPayoutForm({
      payout_amount: ev.payout_amount !== undefined ? ev.payout_amount : 0,
      payment_reference: ev.payment_reference || '',
      payment_notes: ev.payment_notes || ''
    });
    setPayModalOpen(true);
  };

  const handleRevertEvidencePayment = async (ev) => {
    if (!window.confirm(`¿Seguro que deseas anular y eliminar el pago de $${ev.payout_amount} USD de esta entrega?\n\nLa entrega volverá al estado "Aprobado", se descontará de los gastos del servidor y se recalcularán los informes contables.`)) return;
    try {
      const res = await fetch(`/api/evidences/${ev.id}/pay`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        if (activeTab === 'reports') fetchReports();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al revertir pago.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al revertir pago.');
    }
  };

  const handleDeleteEvidence = async (ev) => {
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente esta entrega de ${ev.creator_alias || ev.creator_full_name}?\n\nSi tenía un pago asociado, se eliminará automáticamente y los balances del servidor se recalcularán.`)) return;
    try {
      const res = await fetch(`/api/evidences/${ev.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        if (activeTab === 'reports') fetchReports();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al eliminar entrega.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al eliminar entrega.');
    }
  };

  const handleProcessPayout = async (e) => {
    e.preventDefault();
    if (!selectedEvidenceForPay) return;
    setPaySubmitting(true);
    try {
      const method = isEditingPayment ? 'PUT' : 'POST';
      const res = await fetch(`/api/evidences/${selectedEvidenceForPay.id}/pay`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payoutForm)
      });
      if (res.ok) {
        setPayModalOpen(false);
        setSelectedEvidenceForPay(null);
        setIsEditingPayment(false);
        fetchData();
        if (activeTab === 'reports') fetchReports();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al procesar pago');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al procesar liquidación.');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleDirectApprove = async (evidenceId) => {
    try {
      const res = await fetch(`/api/evidences/${evidenceId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved', internal_notes: 'Aprobado directamente por Super Administrador' })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al aprobar entrega.');
      }
    } catch (err) {
      console.error(err);
    }
  };

    // Fetch Server Financials P&L
  const fetchServerFinancials = async (range = reportsTimeRange) => {
    setServerFinancialsLoading(true);
    try {
      const res = await fetch(`/api/financials/servers?timeRange=${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServerFinancials(data);
      }
    } catch (err) {
      console.error('Error fetching server financials:', err);
    } finally {
      setServerFinancialsLoading(false);
    }
  };

  const handleOpenFinancialModal = (prefillServerId = '') => {
    setFinancialForm({
      server_id: prefillServerId || (servers[0] ? servers[0].id : ''),
      type: 'income',
      category: 'opening_fee',
      concept: 'Fee de Apertura y Lanzamiento',
      amount: '',
      transaction_date: new Date().toISOString().split('T')[0],
      payment_reference: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      payment_method: 'Transferencia',
      recipient_or_payer_name: '',
      notes: ''
    });
    setFinancialModalOpen(true);
  };

  const handleCreateFinancialTransaction = async (e) => {
    e.preventDefault();
    setFinancialSubmitting(true);
    try {
      const res = await fetch('/api/financials/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(financialForm)
      });
      if (res.ok) {
        setFinancialModalOpen(false);
        fetchServerFinancials();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al registrar transacción');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al registrar transacción.');
    } finally {
      setFinancialSubmitting(false);
    }
  };

  const handleDeleteFinancialTransaction = async (transId) => {
    if (!confirm('¿Anular este registro financiero?')) return;
    try {
      const res = await fetch(`/api/financials/transactions/${transId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchServerFinancials();
        fetchData();
        if (selectedServerLedger) {
          setServerLedgerModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Reports Metrics
  const fetchReports = async (range = reportsTimeRange) => {
    setReportsLoading(true);
    try {
      const res = await fetch(`/api/metrics/reports?timeRange=${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports(reportsTimeRange);
    }
  }, [activeTab, reportsTimeRange]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!reportsData) return;
    let csvContent = '';
    const dateStr = new Date().toISOString().split('T')[0];
    let filename = `informe_pmforgex_${reportsSubTab}_${dateStr}.csv`;

    if (reportsSubTab === 'streamers') {
      csvContent = 'Posicion,Alias,Nombre Real,Usuario,Vistas Totales,Horas Transmitidas,Pico Viewers,Media Viewers,Directos Aprobados,Tarifa/Hora ($),Comision (%)\n';
      (reportsData.top_streamers || []).forEach(s => {
        csvContent += `"${s.rank}","${s.alias || ''}","${s.full_name}","@${s.username || ''}","${s.total_views}","${s.total_hours}","${s.peak_viewers}","${s.avg_viewers}","${s.approved_streams_count}","${s.hourly_rate_internal || 0}","${s.commission_percentage || 0}"\n`;
      });
    } else if (reportsSubTab === 'servers') {
      csvContent = 'Servidor,Juego,Estado,PM Asignado,Dueño Vinculado,Creadores Asignados,Campañas Activas,Vistas Totales,Horas Transmitidas\n';
      (reportsData.servers || []).forEach(srv => {
        csvContent += `"${srv.name}","${srv.game}","${srv.status}","${srv.pm_name || 'N/A'}","${srv.owner_name || 'N/A'}","${srv.creators_count}","${srv.active_campaigns_count}","${srv.total_views}","${srv.total_hours}"\n`;
      });
    } else if (reportsSubTab === 'pms') {
      csvContent = 'Promoter Manager,Usuario,Email,Telefono,Servidores a Cargo,Campañas Activas,Evidencias Auditadas,Vistas Gestionadas,Horas Gestionadas\n';
      (reportsData.pms || []).forEach(pm => {
        csvContent += `"${pm.full_name}","@${pm.username || ''}","${pm.email}","${pm.phone || ''}","${pm.servers_count}","${pm.active_campaigns_count}","${pm.approved_evidences_count}","${pm.total_views_managed}","${pm.total_hours_managed}"\n`;
      });
    } else if (reportsSubTab === 'financials') {
      csvContent = 'Campaña,Servidor,Juego,PM,Estado,Presupuesto ($),Creadores,Vistas Totales,Horas,Costo x Hora ($),CPM ($)\n';
      (reportsData.campaigns || []).forEach(c => {
        csvContent += `"${c.name}","${c.server_name}","${c.server_game}","${c.pm_name || ''}","${c.status}","${c.budget_internal}","${c.creators_count}","${c.total_views}","${c.total_hours}","${c.cost_per_hour}","${c.cpm}"\n`;
      });
    } else {
      csvContent = 'Ecosistema / Juego,Servidores,Campañas,Vistas Totales,Horas Totales,% Audiencia\n';
      (reportsData.ecosystems || []).forEach(e => {
        csvContent += `"${e.game}","${e.servers_count}","${e.campaigns_count}","${e.total_views}","${e.total_hours}","${e.views_share_percentage}%"\n`;
      });
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Handle Open Detail Modal (Dossier)
  const handleOpenDetailTalent = (user) => {
    setSelectedTalent(user);
    setDetailTalentModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEditTalent = (user) => {
    setEditingTalent({
      id: user.id,
      username: user.username || '',
      role: user.role,
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      status: user.status || 'active',
      notes: user.notes || '',
      alias: user.creator_alias || '',
      bio: user.creator_bio || '',
      games: Array.isArray(user.creator_games) ? user.creator_games.join(', ') : (user.creator_games || ''),
      platforms: Array.isArray(user.creator_platforms) ? user.creator_platforms.join(', ') : (user.creator_platforms || ''),
      is_available: user.creator_availability !== undefined ? (user.creator_availability === 1 || user.creator_availability === true) : true,
      hourly_rate_internal: user.hourly_rate_internal ?? 0,
      fixed_rate_internal: user.fixed_rate_internal ?? 0,
      commission_percentage: user.commission_percentage ?? 0,
      twitch: user.creator_social_links?.twitch || '',
      youtube: user.creator_social_links?.youtube || '',
      kick: user.creator_social_links?.kick || '',
      discord: user.creator_social_links?.discord || '',
      tiktok: user.creator_social_links?.tiktok || ''
    });
    setEditTalentModalOpen(true);
  };

  // Handle Save Talent Submit
  const handleSaveTalentSubmit = async (e) => {
    e.preventDefault();
    if (!editingTalent) return;
    setTalentSaving(true);
    try {
      const payload = {
        username: editingTalent.username,
        full_name: editingTalent.full_name,
        email: editingTalent.email,
        phone: editingTalent.phone,
        status: editingTalent.status,
        notes: editingTalent.notes
      };

      if (editingTalent.role === 'creator') {
        payload.alias = editingTalent.alias;
        payload.bio = editingTalent.bio;
        payload.games = typeof editingTalent.games === 'string'
          ? editingTalent.games.split(',').map(s => s.trim()).filter(Boolean)
          : editingTalent.games;
        payload.platforms = typeof editingTalent.platforms === 'string'
          ? editingTalent.platforms.split(',').map(s => s.trim()).filter(Boolean)
          : editingTalent.platforms;
        payload.is_available = editingTalent.is_available ? 1 : 0;
        payload.hourly_rate_internal = parseFloat(editingTalent.hourly_rate_internal) || 0;
        payload.fixed_rate_internal = parseFloat(editingTalent.fixed_rate_internal) || 0;
        payload.commission_percentage = parseFloat(editingTalent.commission_percentage) || 0;
        payload.social_links = {
          twitch: editingTalent.twitch || '',
          youtube: editingTalent.youtube || '',
          kick: editingTalent.kick || '',
          discord: editingTalent.discord || '',
          tiktok: editingTalent.tiktok || ''
        };
      }

      const res = await fetch(`/api/users/${editingTalent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchData();
        if (selectedTalent && selectedTalent.id === editingTalent.id) {
          setSelectedTalent(prev => ({
            ...prev,
            ...payload,
            creator_alias: payload.alias !== undefined ? payload.alias : prev.creator_alias,
            creator_bio: payload.bio !== undefined ? payload.bio : prev.creator_bio,
            creator_games: payload.games !== undefined ? payload.games : prev.creator_games,
            creator_platforms: payload.platforms !== undefined ? payload.platforms : prev.creator_platforms,
            creator_social_links: payload.social_links !== undefined ? payload.social_links : prev.creator_social_links,
            creator_availability: payload.is_available !== undefined ? payload.is_available : prev.creator_availability,
            hourly_rate_internal: payload.hourly_rate_internal !== undefined ? payload.hourly_rate_internal : prev.hourly_rate_internal,
            fixed_rate_internal: payload.fixed_rate_internal !== undefined ? payload.fixed_rate_internal : prev.fixed_rate_internal,
            commission_percentage: payload.commission_percentage !== undefined ? payload.commission_percentage : prev.commission_percentage
          }));
        }
        setEditTalentModalOpen(false);
        setEditingTalent(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar información.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al actualizar.');
    } finally {
      setTalentSaving(false);
    }
  };

  const safeUsers = Array.isArray(users) ? users : [];
  const safeServers = Array.isArray(servers) ? servers : [];
  const safeCreatorsList = Array.isArray(creatorsList) ? creatorsList : [];
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];

  const pmsList = safeUsers.filter(u => u.role === 'pm');
  const ownersList = safeUsers.filter(u => u.role === 'server_owner');

  // Filtered PMs and Creators for Talent Directory
  const talentUsers = safeUsers.filter(u => u.role === 'pm' || u.role === 'creator');
  const filteredTalent = talentUsers.filter(u => {
    if (talentRoleFilter !== 'all' && u.role !== talentRoleFilter) return false;
    if (talentStatusFilter !== 'all' && u.status !== talentStatusFilter) return false;
    if (talentSearch.trim()) {
      const q = talentSearch.toLowerCase();
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchName = (u.full_name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchAlias = (u.creator_alias || '').toLowerCase().includes(q);
      const matchPhone = (u.phone || '').toLowerCase().includes(q);
      const matchGames = Array.isArray(u.creator_games)
        ? u.creator_games.some(g => (g || '').toLowerCase().includes(q))
        : (u.creator_games || '').toLowerCase().includes(q);
      const matchPlatforms = Array.isArray(u.creator_platforms)
        ? u.creator_platforms.some(p => (p || '').toLowerCase().includes(q))
        : (u.creator_platforms || '').toLowerCase().includes(q);

      if (!matchUsername && !matchName && !matchEmail && !matchAlias && !matchPhone && !matchGames && !matchPlatforms) {
        return false;
      }
    }
    return true;
  });

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Top KPI Cards */}
          {metrics && metrics.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Total Usuarios</div>
                <div className="text-3xl font-extrabold text-white font-heading mt-2">{metrics.summary.total_users || 0}</div>
                <div className="text-[11px] text-slate-500 mt-1">{metrics.summary.total_pms || 0} PMs • {metrics.summary.total_creators || 0} Creadores</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Servidores Activos</div>
                <div className="text-3xl font-extrabold text-amber-400 font-heading mt-2">{metrics.summary.total_servers || 0}</div>
                <div className="text-[11px] text-slate-500 mt-1">{metrics.summary.active_campaigns || 0} Campañas en curso</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Horas Auditadas</div>
                <div className="text-3xl font-extrabold text-orange-400 font-heading mt-2">{metrics.summary.total_stream_hours || '0.0'}h</div>
                <div className="text-[11px] text-slate-500 mt-1">Directos verificados</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Audiencia Acumulada</div>
                <div className="text-3xl font-extrabold text-emerald-400 font-heading mt-2">{metrics.summary.total_views || 0}</div>
                <div className="text-[11px] text-slate-500 mt-1">Pico máx: {metrics.summary.peak_viewers || 0} viewers</div>
              </div>
            </div>
          )}

          {/* Critical Operational Alerts */}
          {metrics && metrics.alerts && (
            <div className="space-y-3">
              {Array.isArray(metrics.alerts.servers_without_pm) && metrics.alerts.servers_without_pm.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-amber-300">
                        {metrics.alerts.servers_without_pm.length} Servidor(es) sin Promoter Manager asignado
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {metrics.alerts.servers_without_pm.map(s => s?.name).filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('servers')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    Asignar PM Ahora
                  </button>
                </div>
              )}

              {Array.isArray(metrics.alerts.unassigned_creators) && metrics.alerts.unassigned_creators.length > 0 && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-orange-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-orange-300">
                        {metrics.alerts.unassigned_creators.length} Creador(es) sin servidor vinculado actualmente
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Disponibles para nuevas campañas comerciales.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('servers')}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    Vincular Creadores
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Access Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              onClick={() => setActiveTab('evidences')}
              className="p-6 bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <DollarSign className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-base font-bold text-white">Entregas & Liquidación</h3>
              <p className="text-xs text-slate-400 mt-1">Revisión de directos, verificación de horas, cálculo y liquidación de pagos a streamers.</p>
            </div>


            <div 
              onClick={() => setActiveTab('users')}
              className="p-6 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Users className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="text-base font-bold text-white">Administración de Usuarios</h3>
              <p className="text-xs text-slate-400 mt-1">Crear cuentas, suspender accesos, asignar roles y proteger cuentas clave.</p>
            </div>

            <div 
              onClick={() => setActiveTab('servers')}
              className="p-6 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Server className="w-8 h-8 text-orange-400 mb-3" />
              <h3 className="text-base font-bold text-white">Servidores & Asignaciones</h3>
              <p className="text-xs text-slate-400 mt-1">Asignar PMs, vincular dueños y coordinar creadores por servidor.</p>
            </div>

            <div 
              onClick={() => setActiveTab('audit')}
              className="p-6 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Shield className="w-8 h-8 text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-white">Trazabilidad & Auditoría</h3>
              <p className="text-xs text-slate-400 mt-1">Historial cronológico de cambios de estado, aprobaciones e ingresos.</p>
            </div>

            <div 
              onClick={() => setActiveTab('talent')}
              className="p-6 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <UserCheck className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="text-base font-bold text-white">PMs & Streamers</h3>
              <p className="text-xs text-slate-400 mt-1">Buscador unificado, fichas completas, asignaciones y actualización de tarifas.</p>
            </div>

            <div 
              onClick={() => setActiveTab('reports')}
              className="p-6 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <BarChart3 className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="text-base font-bold text-white">Informes & Analytics</h3>
              <p className="text-xs text-slate-400 mt-1">Ranking de top streamers por vistas, salud de ecosistemas, impacto y finanzas.</p>
            </div>

            <div 
              onClick={() => setActiveTab('cutoffs')}
              className="p-6 bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] bg-gradient-to-br from-slate-900 to-amber-950/20"
            >
              <Receipt className="w-8 h-8 text-amber-400 mb-3" />
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Cortes & Liquidación de Gastos</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-slate-950 uppercase">Cortes</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Informe financiero por cortes o fechas con gastos por streamer, servidor y pagos de PMs.</p>
            </div>
          </div>

        </div>
      )}

      {/* Evidences and Payouts Tab */}
      {activeTab === 'evidences' && (() => {
        const safeEv = Array.isArray(evidences) ? evidences : [];
        const pendingReview = safeEv.filter(e => e.status === 'review');
        const approvedForPay = safeEv.filter(e => e.status === 'approved');
        const paidEv = safeEv.filter(e => e.status === 'paid');
        const rejectedEv = safeEv.filter(e => e.status === 'rejected');
        const totalPaidOut = paidEv.reduce((acc, e) => acc + (parseFloat(e.payout_amount) || 0), 0);

        const filteredEvidences = safeEv.filter(e => {
          if (evidenceFilter !== 'all' && e.status !== evidenceFilter) return false;
          if (evidenceSearch.trim()) {
            const q = evidenceSearch.toLowerCase();
            const matchCreator = (e.creator_alias || '').toLowerCase().includes(q) ||
                                 (e.creator_full_name || '').toLowerCase().includes(q) ||
                                 (e.creator_username || '').toLowerCase().includes(q);
            const matchServer = (e.server_name || '').toLowerCase().includes(q) ||
                                (e.server_game || '').toLowerCase().includes(q);
            const matchCamp = (e.campaign_name || '').toLowerCase().includes(q);
            const matchRef = (e.payment_reference || '').toLowerCase().includes(q);
            if (!matchCreator && !matchServer && !matchCamp && !matchRef) return false;
          }
          return true;
        });

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Módulo de Tesorería & Auditoría
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white font-heading mt-1">Auditoría de Entregas & Liquidación de Pagos</h3>
                <p className="text-xs text-slate-400">Supervisa las transmisiones realizadas, verifica horas/audiencia y procesa pagos con comprobante oficial.</p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Entregas</div>
                <div className="text-2xl font-extrabold text-white font-heading mt-1">{safeEv.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">En plataforma</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Por Revisar PM</div>
                <div className="text-2xl font-extrabold text-amber-400 font-heading mt-1">{pendingReview.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">En bandeja de auditoría</div>
              </div>

              <div className="p-4 bg-slate-900 border border-emerald-500/30 rounded-2xl bg-emerald-500/5">
                <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider flex items-center justify-between">
                  <span>Listas para Pago</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-2xl font-extrabold text-emerald-300 font-heading mt-1">{approvedForPay.length}</div>
                <div className="text-[11px] text-emerald-500/80 mt-0.5">Requieren liquidación admin</div>
              </div>

              <div className="p-4 bg-slate-900 border border-purple-500/30 rounded-2xl bg-purple-500/5">
                <div className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">Entregas Pagadas</div>
                <div className="text-2xl font-extrabold text-purple-300 font-heading mt-1">{paidEv.length}</div>
                <div className="text-[11px] text-purple-500/80 mt-0.5">Liquidadas con éxito</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Liquidado</div>
                <div className="text-2xl font-extrabold text-white font-heading mt-1">${totalPaidOut.toFixed(2)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">USD acumulados</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: 'all', label: 'Todas', count: safeEv.length },
                    { id: 'approved', label: 'Listas para Pago', count: approvedForPay.length, badgeColor: 'bg-emerald-500/20 text-emerald-300' },
                    { id: 'paid', label: 'Pagadas', count: paidEv.length, badgeColor: 'bg-purple-500/20 text-purple-300' },
                    { id: 'review', label: 'En Revisión', count: pendingReview.length, badgeColor: 'bg-amber-500/20 text-amber-300' },
                    { id: 'rejected', label: 'Rechazadas', count: rejectedEv.length, badgeColor: 'bg-red-500/20 text-red-300' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setEvidenceFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        evidenceFilter === tab.id
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        evidenceFilter === tab.id ? 'bg-slate-950/20 text-slate-950' : (tab.badgeColor || 'bg-slate-800 text-slate-400')
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={evidenceSearch}
                    onChange={e => setEvidenceSearch(e.target.value)}
                    placeholder="Buscar streamer, servidor, campaña o TXID..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* List of Evidences */}
            {filteredEvidences.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white">No se encontraron entregas</h4>
                <p className="text-xs text-slate-400 mt-1">No hay entregas que coincidan con los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredEvidences.map(ev => {
                  let screenshots = [];
                  try {
                    screenshots = Array.isArray(ev.evidence_screenshots) ? ev.evidence_screenshots : JSON.parse(ev.evidence_screenshots || '[]');
                  } catch(e) {
                    if (ev.evidence_screenshots) screenshots = [ev.evidence_screenshots];
                  }

                  const isApproved = ev.status === 'approved';
                  const isPaid = ev.status === 'paid';
                  const isReview = ev.status === 'review';
                  const isRejected = ev.status === 'rejected';

                  return (
                    <div key={ev.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 hover:border-slate-700 transition-all">
                      {/* Header row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={ev.creator_avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100'}
                            alt={ev.creator_alias}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{ev.creator_alias || ev.creator_full_name}</span>
                              {ev.creator_username && (
                                <span className="font-mono text-xs text-amber-400 font-semibold">@{ev.creator_username}</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              <span className="text-amber-400 font-semibold">{ev.campaign_name}</span> • {ev.server_name} ({ev.server_game})
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300">
                            {ev.platform}
                          </span>
                          <span className="text-xs text-slate-400">{ev.activity_date}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${
                            isPaid
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : isApproved
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isRejected
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {isPaid ? '💰 Pagada' : isApproved ? 'Aprobada (Pendiente Pago)' : isRejected ? 'Rechazada' : 'En Revisión'}
                          </span>
                        </div>
                      </div>

                      {/* Metrics Snapshot */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Duración</span>
                          <div className="font-bold text-white mt-0.5">{ev.duration_minutes} min ({((ev.duration_minutes || 0) / 60).toFixed(1)}h)</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Audiencia Media</span>
                          <div className="font-bold text-white mt-0.5">{ev.avg_viewers} viewers</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Pico Máximo</span>
                          <div className="font-bold text-orange-400 mt-0.5">{ev.peak_viewers} viewers</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Visualizaciones</span>
                          <div className="font-bold text-emerald-400 mt-0.5">{ev.total_views}</div>
                        </div>
                      </div>

                      {/* Content URL, Notes and Proofs */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-semibold">Enlace VOD / Video:</span>
                          <a 
                            href={ev.content_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-amber-400 hover:underline flex items-center gap-1 font-mono truncate max-w-md"
                          >
                            <span>{ev.content_url}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        </div>

                        {screenshots.length > 0 && (
                          <div className="pt-1 flex items-center gap-2">
                            <span className="text-slate-400 font-semibold flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                              Capturas Anexas:
                            </span>
                            <div className="flex gap-2 flex-wrap">
                              {screenshots.map((imgUrl, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => setImageModalUrl(imgUrl)}
                                  className="w-20 h-14 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer hover:border-amber-500 transition-colors relative group"
                                >
                                  <img src={imgUrl} alt="Captura" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-3.5 h-3.5 text-white" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {ev.creator_notes && (
                          <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/60 text-slate-300">
                            <span className="text-slate-500 font-semibold">Nota del creador: </span>
                            {ev.creator_notes}
                          </div>
                        )}
                      </div>

                      {/* Financial & Settlement Section */}
                      <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Tarifa Streamer</span>
                            <span className="font-bold text-slate-300">${parseFloat(ev.hourly_rate_internal || 0).toFixed(2)}/h</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Liquidación Calculada</span>
                            <span className="font-extrabold text-amber-400">${parseFloat(ev.suggested_payout || 0).toFixed(2)} USD</span>
                          </div>

                          {isPaid && (
                            <div className="pl-3 border-l border-slate-800">
                              <span className="text-[10px] text-purple-400 uppercase font-bold block">Monto Pagado</span>
                              <span className="font-extrabold text-purple-300">${parseFloat(ev.payout_amount || 0).toFixed(2)} USD</span>
                            </div>
                          )}
                          {isPaid && ev.payment_reference && (
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">Referencia TXID</span>
                              <span className="font-mono text-xs text-slate-300">{ev.payment_reference}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 justify-end">
                          {isReview && (
                            <button
                              onClick={() => handleDirectApprove(ev.id)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Aprobar (Admin)</span>
                            </button>
                          )}

                          {isApproved && (
                            <button
                              onClick={() => handleOpenPayModal(ev)}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                            >
                              <DollarSign className="w-4 h-4" />
                              <span>Revisar y Pagar Entrega</span>
                            </button>
                          )}

                          {isPaid && (
                            <>
                              <button
                                onClick={() => { setSelectedReceipt(ev); setReceiptModalOpen(true); }}
                                className="px-3.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Ver Comprobante</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditPayModal(ev)}
                                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Editar Pago de Entrega"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Editar Pago</span>
                              </button>
                              <button
                                onClick={() => handleRevertEvidencePayment(ev)}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Anular Pago (Revertir entrega a Aprobada)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Anular Pago</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteEvidence(ev)}
                            className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Entrega definitivamente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        );
      })()}

      {/* Users Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white font-heading">Directorio Integral de Usuarios</h3>
              <p className="text-xs text-slate-400">Control estricto de roles y accesos cerrados.</p>
            </div>
            <button
              onClick={() => setUserModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Nuevo Usuario</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Nombre Completo</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Tarifa Interna (H)</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono text-slate-400">{u.id}</td>
                      <td className="p-4 font-bold text-white">
                        {u.full_name}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-amber-400 font-mono">@{u.username}</span>
                          {u.creator_alias && (
                            <span className="text-[10px] text-emerald-400 font-normal">• Alias: {u.creator_alias}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">{u.email}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-amber-300 border border-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">
                        {u.hourly_rate_internal ? `\$${u.hourly_rate_internal}/h` : '-'}
                      </td>
                      <td className="p-4 text-right">
                        {u.id === 1 ? (
                          <span className="text-[10px] text-amber-400/70 font-semibold italic flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Protegido</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.status)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                u.status === 'active' 
                                  ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-400' 
                                  : 'hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400'
                              }`}
                              title={u.status === 'active' ? 'Suspender cuenta' : 'Reactivar cuenta'}
                            >
                              {u.status === 'active' ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Dar de baja (Soft delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Servers & Assignments Tab */}
      {activeTab === 'servers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white font-heading">Servidores & Asignaciones de PMs</h3>
              <p className="text-xs text-slate-400">Vinculación de servidores con Promoter Managers y Creadores.</p>
            </div>
            <button
              onClick={() => setServerModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Servidor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {safeServers.map(server => (
              <div key={server.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={server.logo_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100'} 
                      alt={server.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                    />
                    <div>
                      <h4 className="text-base font-bold text-white">{server.name}</h4>
                      <span className="text-[11px] text-amber-400 font-semibold">{server.game || 'Metin2'}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    server.status === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : server.status === 'suspended'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {server.status === 'suspended' ? '🚫 Suspendido' : server.status === 'active' ? '🟢 Activo' : '⏸️ ' + server.status}
                  </span>
                </div>

                {/* Assignment Selectors & Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        Promoter Managers Asignados:
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignPm(server.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-amber-400 focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">+ Asignar Otro PM</option>
                        {pmsList.filter(pm => !(server.assigned_pms || []).some(ap => ap.pm_id === pm.id)).map(pm => (
                          <option key={pm.id} value={pm.id}>{pm.full_name} (@{pm.username || pm.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[30px] p-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                      {(!server.assigned_pms || server.assigned_pms.length === 0) && !server.pm_name ? (
                        <span className="text-slate-500 text-[11px] italic px-1">Sin PMs asignados</span>
                      ) : (
                        (server.assigned_pms && server.assigned_pms.length > 0 
                          ? server.assigned_pms 
                          : [{ pm_id: server.pm_user_id, pm_name: server.pm_name, pm_username: server.pm_username }]
                        ).map(pmObj => (
                          <span 
                            key={pmObj.pm_id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-md text-[11px] text-amber-300 font-medium"
                          >
                            <Shield className="w-3 h-3 text-amber-400" />
                            <span>{pmObj.pm_name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePm(server.id, pmObj.pm_id)}
                              className="text-slate-500 hover:text-red-400 transition-colors ml-0.5"
                              title="Desvincular este PM"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Presupuesto Servidor:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={server.budget || 0}
                      onBlur={(e) => handleUpdateServerBudget(server.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-amber-500"
                      placeholder="0.00 USD"
                    />
                    <div className="text-[10px] text-slate-500 mt-1 truncate">
                      Dueño: {server.owner_name || 'Sin dueño'}
                    </div>
                  </div>
                </div>

                {/* Assigned Creators Roster & Management (Admin Exclusive) */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Creadores / Streamers Asignados ({Array.isArray(server.creators) ? server.creators.length : 0}):
                    </div>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignCreatorToServer(server.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-amber-500 rounded-lg text-xs text-amber-400 font-semibold focus:outline-none"
                    >
                      <option value="">+ Asignar Streamer al Servidor</option>
                      {safeCreatorsList
                        .filter(cr => cr && !(server.creators || []).some(sc => sc && sc.creator_user_id === cr.user_id))
                        .map(cr => (
                          <option key={cr.user_id} value={cr.user_id}>
                            {cr.alias || cr.full_name} ({cr.full_name})
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(!server.creators || server.creators.length === 0) ? (
                      <span className="text-xs text-slate-500 italic">No hay streamers asignados a este servidor aún.</span>
                    ) : (
                      server.creators.map(c => c && (
                        <span key={c.creator_user_id || Math.random()} className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 flex items-center gap-2 group">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="font-medium">{c.alias || c.full_name || 'Streamer'}</span>
                          <button
                            title="Desvincular streamer del servidor"
                            onClick={() => handleRemoveCreatorFromServer(server.id, c.creator_user_id)}
                            className="text-slate-500 hover:text-red-400 text-xs font-bold leading-none ml-1 transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Server Administration Controls: Suspender / Reactivar & Eliminar (Exclusivo Super Admin) */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Control Exclusivo Super Admin</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Suspender / Reactivar */}
                    <button
                      type="button"
                      onClick={() => handleToggleSuspendServer(server)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        server.status === 'suspended'
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                      title={server.status === 'suspended' ? 'Reactivar este servidor' : 'Suspender temporalmente este servidor'}
                    >
                      {server.status === 'suspended' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reactivar Servidor</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspender Servidor</span>
                        </>
                      )}
                    </button>

                    {/* Eliminar Servidor */}
                    <button
                      type="button"
                      onClick={() => handleDeleteServer(server)}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Eliminar permanentemente este servidor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <GroupedCampaignsView
          servers={servers}
          campaigns={campaigns}
          userRole="super_admin"
          canCreate={true}
          canEdit={true}
          canDelete={true}
          creatorsList={creatorsList}
          onOpenCreateCampaign={handleOpenCreateCampaignWithServer}
          onOpenEditCampaign={handleOpenEditCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          onToggleStatusCampaign={handleToggleCampaignStatus}
          onAssignCreator={handleAssignCreatorToCampaign}
          onRemoveCreator={handleRemoveCreatorFromCampaign}
        />
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white font-heading">Historial Cronológico de Auditoría</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Usuario</th>
                    <th className="p-4">Acción</th>
                    <th className="p-4">Entidad</th>
                    <th className="p-4">Detalles</th>
                    <th className="p-4">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-4 text-slate-400 whitespace-nowrap">{log.created_at}</td>
                      <td className="p-4 text-white font-semibold font-sans">{log.user_name || 'Sistema'}</td>
                      <td className="p-4 text-amber-400 font-bold">{log.action}</td>
                      <td className="p-4 text-slate-300">{log.entity}</td>
                      <td className="p-4 text-slate-400 max-w-xs truncate font-sans text-xs">{log.details}</td>
                      <td className="p-4 text-slate-500">{log.ip_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reports & Analytics Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Header & Executive Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <div>
              <h3 className="text-xl font-extrabold text-white font-heading flex items-center gap-2.5">
                <BarChart3 className="w-6 h-6 text-amber-400" />
                <span>Centro Ejecutivo de Informes & Analytics</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Monitoreo consolidado de métricas de audiencia, ranking de top streamers, salud de ecosistemas y balance de campañas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Time Range Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-2">Periodo:</span>
                <button
                  type="button"
                  onClick={() => setReportsTimeRange('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    reportsTimeRange === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Histórico
                </button>
                <button
                  type="button"
                  onClick={() => setReportsTimeRange('30d')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    reportsTimeRange === '30d'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Últimos 30d
                </button>
                <button
                  type="button"
                  onClick={() => setReportsTimeRange('7d')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    reportsTimeRange === '7d'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Últimos 7d
                </button>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-700"
                title="Descargar informe como archivo CSV"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrintReport}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-700"
                title="Imprimir reporte ejecutivo o guardar en PDF"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Imprimir / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => fetchReports(reportsTimeRange)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${reportsLoading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Top KPI Summary Cards */}
          {reportsData && reportsData.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Audiencia Total Verificada</div>
                <div className="text-3xl font-extrabold text-emerald-400 font-heading mt-1.5">
                  {(reportsData.summary.total_views || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Vistas reales en transmisiones aprobadas</span>
                </div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Horas Auditadas Totales</div>
                <div className="text-3xl font-extrabold text-orange-400 font-heading mt-1.5">
                  {reportsData.summary.total_stream_hours || '0.0'}h
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  <span>{reportsData.summary.total_approved_streams || 0} directos validados</span>
                </div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Pico Máximo de Viewers</div>
                <div className="text-3xl font-extrabold text-amber-400 font-heading mt-1.5">
                  {(reportsData.summary.peak_viewers || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Récord de espectadores simultáneos</span>
                </div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Presupuesto en Campañas</div>
                <div className="text-3xl font-extrabold text-white font-heading mt-1.5">
                  ${(reportsData.summary.total_campaign_budget || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  <span>{reportsData.summary.total_servers_active || 0} servidores en ejecución</span>
                </div>
              </div>
            </div>
          )}

          {/* Subtab Navigation */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setReportsSubTab('streamers')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                reportsSubTab === 'streamers'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Top Streamers (Vistas)</span>
            </button>

            <button
              type="button"
              onClick={() => setReportsSubTab('platform')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                reportsSubTab === 'platform'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Ecosistemas & Plataformas</span>
            </button>

            <button
              type="button"
              onClick={() => setReportsSubTab('servers')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                reportsSubTab === 'servers'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Rendimiento por Servidor</span>
            </button>

            <button
              type="button"
              onClick={() => setReportsSubTab('pms')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                reportsSubTab === 'pms'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Desempeño de PMs</span>
            </button>

            <button
              type="button"
              onClick={() => { setReportsSubTab('server_pnl'); fetchServerFinancials(); }}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                reportsSubTab === 'server_pnl'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Finanzas & P&L Servidores</span>
            </button>

            <button
              type="button"
              onClick={() => setReportsSubTab('expense_cutoffs')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                reportsSubTab === 'expense_cutoffs'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Informe de Cortes & Gastos</span>
              <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-slate-950/40 text-slate-950">
                Cortes
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReportsSubTab('financials')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                reportsSubTab === 'financials'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Campañas & Presupuesto</span>
            </button>
          </div>

          {/* Subtab: Expense Cutoff Report (Informe de Gastos por Cortes o Fechas) */}
          {reportsSubTab === 'expense_cutoffs' && (
            <ExpenseCutoffReport
              token={token}
              servers={servers}
              userRole="super_admin"
            />
          )}

          {/* Subtab: Server P&L y Presupuestos */}
          {reportsSubTab === 'server_pnl' && (
            <ServerFinancialsAndContracts
              servers={servers}
              creators={safeCreatorsList}
              pms={pmsList}
              token={token}
              userRole="super_admin"
            />
          )}

          {/* Subtab 1: Top Streamers by Views */}
          {reportsSubTab === 'streamers' && reportsData && (
            <div className="space-y-6">
              {/* Podium Visual: Top 3 Streamers */}
              {Array.isArray(reportsData.top_streamers) && reportsData.top_streamers.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Rank 2 (Silver) */}
                  {reportsData.top_streamers[1] && (
                    <div className="order-2 md:order-1 p-5 bg-gradient-to-b from-slate-800/70 to-slate-900 border border-slate-700/80 rounded-2xl text-center space-y-3 relative">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700/60 text-slate-200 rounded-full text-xs font-extrabold">
                        <span>🥈 #2 Lugar Plata</span>
                      </div>
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border-2 border-slate-600 flex items-center justify-center font-bold text-2xl text-slate-200 shadow-lg">
                        {(reportsData.top_streamers[1].alias || reportsData.top_streamers[1].full_name || 'U').substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-white">{reportsData.top_streamers[1].alias || reportsData.top_streamers[1].full_name}</h4>
                        <span className="text-xs text-amber-400 font-mono">@{reportsData.top_streamers[1].username}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/70 rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Vistas Totales</span>
                          <span className="text-base font-extrabold text-emerald-400">{reportsData.top_streamers[1].total_views.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Horas Stream</span>
                          <span className="text-base font-extrabold text-orange-400">{reportsData.top_streamers[1].total_hours}h</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Pico Máx: <strong className="text-amber-400">{reportsData.top_streamers[1].peak_viewers}</strong> • Media: <strong className="text-white">{reportsData.top_streamers[1].avg_viewers}</strong> viewers
                      </div>
                    </div>
                  )}

                  {/* Rank 1 (Gold) */}
                  {reportsData.top_streamers[0] && (
                    <div className="order-1 md:order-2 p-6 bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-2xl text-center space-y-3 relative shadow-2xl scale-[1.02]">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-xs font-black shadow-md">
                        <Flame className="w-3.5 h-3.5" />
                        <span>🥇 #1 LÍDER DE AUDIENCIA</span>
                      </div>
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center font-bold text-3xl text-amber-300 shadow-xl">
                        {(reportsData.top_streamers[0].alias || reportsData.top_streamers[0].full_name || 'U').substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">{reportsData.top_streamers[0].alias || reportsData.top_streamers[0].full_name}</h4>
                        <span className="text-xs text-amber-400 font-mono font-bold">@{reportsData.top_streamers[0].username}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{reportsData.top_streamers[0].full_name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-xl text-xs border border-amber-500/30">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Vistas Totales</span>
                          <span className="text-lg font-black text-emerald-400">{reportsData.top_streamers[0].total_views.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Horas Auditadas</span>
                          <span className="text-lg font-black text-orange-400">{reportsData.top_streamers[0].total_hours}h</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Pico Máx: <strong className="text-amber-300">{reportsData.top_streamers[0].peak_viewers}</strong> viewers • Cuota: <strong className="text-emerald-400">{reportsData.top_streamers[0].views_share_percentage}% del total</strong>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 (Bronze) */}
                  {reportsData.top_streamers[2] && (
                    <div className="order-3 p-5 bg-gradient-to-b from-orange-950/40 to-slate-900 border border-orange-800/60 rounded-2xl text-center space-y-3 relative">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-900/60 text-orange-300 rounded-full text-xs font-extrabold">
                        <span>🥉 #3 Lugar Bronce</span>
                      </div>
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-950 border-2 border-orange-700 flex items-center justify-center font-bold text-2xl text-orange-300 shadow-lg">
                        {(reportsData.top_streamers[2].alias || reportsData.top_streamers[2].full_name || 'U').substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-white">{reportsData.top_streamers[2].alias || reportsData.top_streamers[2].full_name}</h4>
                        <span className="text-xs text-amber-400 font-mono">@{reportsData.top_streamers[2].username}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/70 rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Vistas Totales</span>
                          <span className="text-base font-extrabold text-emerald-400">{reportsData.top_streamers[2].total_views.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Horas Stream</span>
                          <span className="text-base font-extrabold text-orange-400">{reportsData.top_streamers[2].total_hours}h</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Pico Máx: <strong className="text-amber-400">{reportsData.top_streamers[2].peak_viewers}</strong> • Media: <strong className="text-white">{reportsData.top_streamers[2].avg_viewers}</strong> viewers
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Streamers Ranking Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white font-heading">Ranking Completo de Creadores de Contenido</h4>
                    <p className="text-xs text-slate-400">Ordenado por visualizaciones netas acumuladas y horas verificadas.</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Total: {reportsData.top_streamers?.length || 0} streamers
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-4 text-center w-12">#</th>
                        <th className="p-4">Streamer / Creador</th>
                        <th className="p-4 text-right">Vistas Acumuladas</th>
                        <th className="p-4 text-center w-36">Cuota de Audiencia</th>
                        <th className="p-4 text-right">Horas Stream</th>
                        <th className="p-4 text-right">Pico Viewers</th>
                        <th className="p-4 text-right">Media Viewers</th>
                        <th className="p-4 text-center">Directos</th>
                        <th className="p-4">Juegos Principales</th>
                        <th className="p-4 text-right">Tarifa ($)</th>
                        <th className="p-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(reportsData.top_streamers || []).map((s) => (
                        <tr key={s.user_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 text-center font-bold">
                            {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{s.alias || s.full_name}</span>
                              <span className="text-[10px] text-amber-400 font-mono">@{s.username}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 block">{s.full_name}</span>
                          </td>
                          <td className="p-4 text-right font-bold text-emerald-400 font-mono text-sm">
                            {s.total_views.toLocaleString()}
                          </td>
                          <td className="p-4">
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                              <div
                                className="bg-emerald-400 h-2 rounded-full"
                                style={{ width: `${Math.min(s.views_share_percentage || 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block text-right mt-0.5">
                              {s.views_share_percentage}%
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-orange-400 font-mono">
                            {s.total_hours}h
                          </td>
                          <td className="p-4 text-right font-bold text-amber-300 font-mono">
                            {s.peak_viewers.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-200">
                            {s.avg_viewers}
                          </td>
                          <td className="p-4 text-center font-mono">
                            <span className="px-2 py-0.5 bg-slate-800 rounded text-[11px]">
                              {s.approved_streams_count}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(s.games || []).map((g, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono text-slate-300">
                            ${s.hourly_rate_internal || 0}/h
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                const talentObj = safeUsers.find(u => u.id === s.user_id);
                                if (talentObj) handleOpenDetailTalent(talentObj);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3 h-3 text-slate-400" />
                              <span>Ficha</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 2: Platform & Ecosystems Distribution */}
          {reportsSubTab === 'platform' && reportsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Games / Ecosystems Distribution */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-base font-bold text-white font-heading flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-amber-400" />
                      <span>Distribución por Juego / Ecosistema</span>
                    </h4>
                    <span className="text-xs text-slate-400">{reportsData.ecosystems?.length || 0} juegos</span>
                  </div>

                  <div className="space-y-4">
                    {(reportsData.ecosystems || []).map((eco, idx) => (
                      <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-white text-sm">{eco.game}</span>
                          <span className="text-emerald-400 font-mono">{eco.total_views.toLocaleString()} vistas ({eco.views_share_percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-2.5 rounded-full"
                            style={{ width: `${Math.min(eco.views_share_percentage || 0, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>{eco.servers_count} servidores vinculados</span>
                          <span>{eco.campaigns_count} campañas activas</span>
                          <span>{eco.total_hours}h transmitidas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Streaming Platforms Distribution */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-base font-bold text-white font-heading flex items-center gap-2">
                      <Tv className="w-5 h-5 text-emerald-400" />
                      <span>Plataformas de Streaming</span>
                    </h4>
                    <span className="text-xs text-slate-400">Canales de difusión</span>
                  </div>

                  <div className="space-y-3">
                    {(reportsData.platforms || []).map((plat, idx) => (
                      <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-white block">{plat.platform}</span>
                          <span className="text-[11px] text-slate-400">{plat.streams_count} directos verificados • {plat.total_hours}h</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-emerald-400 font-mono block">
                            {plat.total_views.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Pico: <strong className="text-amber-400">{plat.peak_viewers}</strong> • Media: {plat.avg_viewers}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quality Funnel */}
                  {reportsData.summary?.evidence_funnel && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 mt-4">
                      <div className="text-xs font-bold text-slate-300 uppercase mb-2 flex items-center justify-between">
                        <span>Control de Calidad de Evidencias (QA)</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          {reportsData.summary.evidence_funnel.approval_rate}% aprobadas
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <div className="text-base font-bold text-emerald-400">{reportsData.summary.evidence_funnel.approved_count}</div>
                          <div className="text-[10px] text-slate-400">Aprobadas</div>
                        </div>
                        <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <div className="text-base font-bold text-amber-400">{reportsData.summary.evidence_funnel.review_count}</div>
                          <div className="text-[10px] text-slate-400">En Revisión</div>
                        </div>
                        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="text-base font-bold text-red-400">{reportsData.summary.evidence_funnel.rejected_count}</div>
                          <div className="text-[10px] text-slate-400">Rechazadas</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subtab 3: Server Performance Ranking */}
          {reportsSubTab === 'servers' && reportsData && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-heading">Rendimiento y Cobertura de Servidores</h4>
                  <p className="text-xs text-slate-400">Evaluación de alcance publicitario y horas auditadas por cliente.</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{reportsData.servers?.length || 0} servidores</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-4">Servidor</th>
                      <th className="p-4">Juego</th>
                      <th className="p-4">Promoter Manager</th>
                      <th className="p-4">Dueño Registrado</th>
                      <th className="p-4 text-center">Creadores</th>
                      <th className="p-4 text-center">Campañas</th>
                      <th className="p-4 text-right">Vistas Totales</th>
                      <th className="p-4 text-right">Horas Stream</th>
                      <th className="p-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(reportsData.servers || []).map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-bold text-white">
                          {srv.name}
                        </td>
                        <td className="p-4 text-amber-400 font-semibold">{srv.game}</td>
                        <td className="p-4 text-slate-300">{srv.pm_name || <span className="text-slate-500 italic">Sin PM</span>}</td>
                        <td className="p-4 text-slate-400">{srv.owner_name || <span className="text-slate-500 italic">No vinculado</span>}</td>
                        <td className="p-4 text-center font-mono">
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded">{srv.creators_count}</span>
                        </td>
                        <td className="p-4 text-center font-mono">
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded">{srv.active_campaigns_count}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-400 font-mono text-sm">
                          {srv.total_views.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-bold text-orange-400 font-mono">
                          {srv.total_hours}h
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            srv.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {srv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 4: Promoter Managers Performance */}
          {reportsSubTab === 'pms' && reportsData && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-heading">Desempeño Operativo de Promoter Managers (PMs)</h4>
                  <p className="text-xs text-slate-400">Volumen de servidores asignados, campañas coordinadas y evidencias auditadas.</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{reportsData.pms?.length || 0} PMs</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-4">Promoter Manager</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4 text-center">Servidores a Cargo</th>
                      <th className="p-4 text-center">Campañas Activas</th>
                      <th className="p-4 text-center">Evidencias Auditadas</th>
                      <th className="p-4 text-right">Vistas Gestionadas</th>
                      <th className="p-4 text-right">Horas Supervisadas</th>
                      <th className="p-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(reportsData.pms || []).map((pm) => (
                      <tr key={pm.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{pm.full_name}</div>
                          <span className="text-[10px] text-amber-400 font-mono">@{pm.username}</span>
                        </td>
                        <td className="p-4 text-slate-400">
                          <div>{pm.email}</div>
                          {pm.phone && <div className="text-[11px] text-slate-500">{pm.phone}</div>}
                        </td>
                        <td className="p-4 text-center font-bold font-mono text-amber-400 text-sm">
                          {pm.servers_count}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-white text-sm">
                          {pm.active_campaigns_count}
                        </td>
                        <td className="p-4 text-center font-mono">
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold">
                            {pm.approved_evidences_count}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-400 font-mono text-sm">
                          {pm.total_views_managed.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-bold text-orange-400 font-mono">
                          {pm.total_hours_managed}h
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            pm.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {pm.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 5: Financials & Campaign Budgets */}
          {reportsSubTab === 'financials' && reportsData && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white font-heading">Balance Presupuestario y Eficiencia de Campañas</h4>
                    <p className="text-xs text-slate-400">Análisis del costo por hora de transmisión y costo por mil impresiones (CPM).</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{reportsData.campaigns?.length || 0} campañas</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-4">Campaña</th>
                        <th className="p-4">Servidor</th>
                        <th className="p-4">PM a Cargo</th>
                        <th className="p-4 text-right">Presupuesto ($)</th>
                        <th className="p-4 text-center">Creadores</th>
                        <th className="p-4 text-right">Horas Stream</th>
                        <th className="p-4 text-right">Vistas Totales</th>
                        <th className="p-4 text-right">Costo x Hora</th>
                        <th className="p-4 text-right">CPM Estimado</th>
                        <th className="p-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(reportsData.campaigns || []).map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-bold text-white">
                            {c.name}
                          </td>
                          <td className="p-4 text-slate-300 font-medium">{c.server_name} <span className="text-[10px] text-amber-400">({c.server_game})</span></td>
                          <td className="p-4 text-slate-400">{c.pm_name || 'N/A'}</td>
                          <td className="p-4 text-right font-extrabold text-emerald-400 font-mono text-sm">
                            ${(c.budget_internal || 0).toLocaleString()}
                          </td>
                          <td className="p-4 text-center font-mono font-semibold">
                            {c.creators_count}
                          </td>
                          <td className="p-4 text-right font-mono text-orange-400">
                            {c.total_hours}h
                          </td>
                          <td className="p-4 text-right font-bold text-white font-mono">
                            {c.total_views.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-300">
                            {c.cost_per_hour > 0 ? `${c.cost_per_hour}/h` : '-'}
                          </td>
                          <td className="p-4 text-right font-mono text-amber-300 font-bold">
                            {c.cpm > 0 ? `${c.cpm}` : '-'}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cortes & Gastos Tab (Informe Consolidado por Cortes o Fechas) */}
      {activeTab === 'cutoffs' && (
        <ExpenseCutoffReport
          token={token}
          servers={servers}
          userRole="super_admin"
        />
      )}

      {/* Pagos a PMs Tab (Gestión de Honorarios, Servidores y Campañas de PMs) */}
      {activeTab === 'pm_payouts' && (
        <PmPayoutsManagement token={token} />
      )}

      {/* PMs & Streamers (Talent Management) Tab */}
      {activeTab === 'talent' && (
        <div className="space-y-6">
          {/* Header & Metric Counters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>Directorio y Gestión de PMs & Streamers</span>
              </h3>
              <p className="text-xs text-slate-400">Búsqueda rápida, fichas completas, asignaciones operativas y edición directa de perfiles.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-400">PMs:</span>
                <span className="font-bold text-white">{pmsList.length}</span>
              </div>
              <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Streamers:</span>
                <span className="font-bold text-white">{safeCreatorsList.length}</span>
              </div>
            </div>
          </div>

          {/* Search Bar & Filters */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={talentSearch}
                  onChange={(e) => setTalentSearch(e.target.value)}
                  placeholder="Buscar por nombre, alias, correo, teléfono, juego o plataforma..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {talentSearch && (
                  <button
                    onClick={() => setTalentSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Role filter buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setTalentRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    talentRoleFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({talentUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTalentRoleFilter('pm')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    talentRoleFilter === 'pm'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>PMs ({pmsList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTalentRoleFilter('creator')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    talentRoleFilter === 'creator'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Streamers ({safeCreatorsList.length})</span>
                </button>
              </div>

              {/* Status filter buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setTalentStatusFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    talentStatusFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTalentStatusFilter('active')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    talentStatusFilter === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Activos
                </button>
                <button
                  type="button"
                  onClick={() => setTalentStatusFilter('suspended')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    talentStatusFilter === 'suspended'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Suspendidos
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          {filteredTalent.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Search className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No se encontraron resultados</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No hay ningún PM o Streamer que coincida con los criterios de búsqueda o filtros seleccionados.
              </p>
              <button
                onClick={() => { setTalentSearch(''); setTalentRoleFilter('all'); setTalentStatusFilter('all'); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTalent.map(talent => {
                const isCreator = talent.role === 'creator';
                const isPm = talent.role === 'pm';

                return (
                  <div
                    key={talent.id}
                    className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-4 flex flex-col justify-between transition-all"
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                          isPm
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isPm ? <UserCheck className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                          <span>{isPm ? 'Promoter Manager' : 'Streamer / Creador'}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                          talent.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${talent.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span>{talent.status === 'active' ? 'Activo' : 'Suspendido'}</span>
                        </span>
                      </div>

                      {/* Profile Details */}
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base uppercase shrink-0 border ${
                          isPm
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}>
                          {(talent.creator_alias || talent.full_name || 'U').substring(0, 2)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-mono text-amber-400 font-bold">@{talent.username}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate">
                            {isCreator && talent.creator_alias ? (
                              <span>
                                {talent.creator_alias}
                                <span className="block text-xs font-normal text-slate-400 truncate">{talent.full_name}</span>
                              </span>
                            ) : (
                              talent.full_name
                            )}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                            <Mail className="w-3 h-3 shrink-0 text-slate-500" />
                            <span className="truncate">{talent.email}</span>
                          </div>
                          {talent.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                              <Phone className="w-3 h-3 shrink-0 text-slate-500" />
                              <span>{talent.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Operational Metrics Subgrid */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs">
                        {isPm ? (
                          <>
                            <div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold">Servidores</div>
                              <div className="text-sm font-extrabold text-amber-400">{talent.pm_servers_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold">Campañas</div>
                              <div className="text-sm font-extrabold text-white">{talent.pm_campaigns_count || 0}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold">Horas Auditadas</div>
                              <div className="text-sm font-extrabold text-orange-400">{talent.total_hours_streamed || '0.0'}h</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold">Audiencia Acum.</div>
                              <div className="text-sm font-extrabold text-emerald-400">{talent.total_views_accumulated || 0}</div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Streamer Specific: Games, Platforms & Rates */}
                      {isCreator && (
                        <div className="space-y-2 text-xs">
                          {Array.isArray(talent.creator_games) && talent.creator_games.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {talent.creator_games.map((game, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                                  {game}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                            <span>Tarifa: <strong className="text-white">${talent.hourly_rate_internal || 0}/h</strong></span>
                            {talent.commission_percentage > 0 && (
                              <span>Comisión: <strong className="text-amber-400">{talent.commission_percentage}%</strong></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Internal Notes snippet */}
                      {talent.notes && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/50 line-clamp-2">
                          "{talent.notes}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => handleOpenDetailTalent(talent)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-300" />
                        <span>Ver Ficha</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditTalent(talent)}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Modificar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Ficha Completa de Talento (Dossier) */}
      {detailTalentModalOpen && selectedTalent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl uppercase border ${
                  selectedTalent.role === 'pm'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  {(selectedTalent.creator_alias || selectedTalent.full_name || 'U').substring(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-heading">
                      {selectedTalent.creator_alias || selectedTalent.full_name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedTalent.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {selectedTalent.status}
                    </span>
                  </div>
                  {selectedTalent.creator_alias && (
                    <p className="text-xs text-slate-400">Nombre Real: {selectedTalent.full_name}</p>
                  )}
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                    {selectedTalent.role === 'pm' ? 'Promoter Manager Oficial' : 'Streamer / Creador de Contenido'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEditTalent(selectedTalent);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => { setDetailTalentModalOpen(false); setSelectedTalent(null); }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {/* General Contact Info */}
              <div>
                <h5 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-3">Información de Contacto & Cuenta</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Usuario de Acceso</span>
                    <span className="text-amber-400 font-mono font-bold">@{selectedTalent.username}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Correo Electrónico</span>
                    <span className="text-white font-medium">{selectedTalent.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Teléfono / WhatsApp</span>
                    <span className="text-white font-medium">{selectedTalent.phone || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">ID de Usuario</span>
                    <span className="text-slate-300 font-mono">#{selectedTalent.id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Fecha de Registro</span>
                    <span className="text-slate-300 font-mono">{selectedTalent.created_at || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Specific for Streamer */}
              {selectedTalent.role === 'creator' && (
                <>
                  {/* Financial & Rates */}
                  <div>
                    <h5 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-3">Tarifas Comerciales & Disponibilidad</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Tarifa x Hora</span>
                        <span className="text-sm font-extrabold text-emerald-400">${selectedTalent.hourly_rate_internal || 0}/h</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Tarifa Fija Campaña</span>
                        <span className="text-sm font-extrabold text-white">${selectedTalent.fixed_rate_internal || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Comisión Agencia</span>
                        <span className="text-sm font-extrabold text-amber-400">{selectedTalent.commission_percentage || 0}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Disponibilidad</span>
                        <span className={`text-xs font-bold ${selectedTalent.creator_availability ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {selectedTalent.creator_availability ? '✓ Disponible' : '✕ No disponible'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content & Platforms */}
                  <div>
                    <h5 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-3">Juegos & Plataformas</h5>
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1">Juegos que Transmite</span>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(selectedTalent.creator_games) && selectedTalent.creator_games.length > 0 ? (
                            selectedTalent.creator_games.map((g, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-amber-400 rounded-lg text-xs font-medium">
                                {g}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">No especificados</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1">Plataformas de Stream</span>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(selectedTalent.creator_platforms) && selectedTalent.creator_platforms.length > 0 ? (
                            selectedTalent.creator_platforms.map((p, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-emerald-400 rounded-lg text-xs font-medium">
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">No especificadas</span>
                          )}
                        </div>
                      </div>

                      {/* Social Links */}
                      {selectedTalent.creator_social_links && Object.keys(selectedTalent.creator_social_links).length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1">Redes Sociales & Enlaces</span>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {Object.entries(selectedTalent.creator_social_links).map(([k, v]) => v ? (
                              <div key={k} className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 text-slate-300">
                                <strong className="text-amber-400 uppercase text-[10px] mr-1">{k}:</strong>
                                <span>{v}</span>
                              </div>
                            ) : null)}
                          </div>
                        </div>
                      )}

                      {/* Bio */}
                      {selectedTalent.creator_bio && (
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1">Biografía / Perfil</span>
                          <p className="text-slate-300 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                            {selectedTalent.creator_bio}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Servidores Asignados */}
              <div>
                <h5 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-3">
                  Servidores Vinculados
                </h5>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  {selectedTalent.role === 'pm' ? (
                    // PM Servers
                    (() => {
                      const pmServs = safeServers.filter(s => s.pm_user_id === selectedTalent.id);
                      if (pmServs.length === 0) {
                        return <span className="text-slate-500 italic">Este Promoter Manager no tiene servidores asignados actualmente.</span>;
                      }
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {pmServs.map(s => (
                            <div key={s.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-white block">{s.name}</span>
                                <span className="text-[10px] text-amber-400">{s.game || 'Metin2'}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">{s.status}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    // Creator Servers
                    (() => {
                      const crServs = safeServers.filter(s => Array.isArray(s.creators) && s.creators.some(c => c && c.creator_user_id === selectedTalent.id));
                      if (crServs.length === 0) {
                        return <span className="text-slate-500 italic">Este streamer no está vinculado a ningún servidor actualmente.</span>;
                      }
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {crServs.map(s => (
                            <div key={s.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-white block">{s.name}</span>
                                <span className="text-[10px] text-emerald-400">{s.game || 'Metin2'}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">{s.status}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Campañas Vinculadas */}
              <div>
                <h5 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-3">
                  Campañas Comerciales Asignadas
                </h5>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  {selectedTalent.role === 'pm' ? (
                    // PM Campaigns
                    (() => {
                      const pmCamps = safeCampaigns.filter(c => {
                        const s = safeServers.find(srv => srv.id === c.server_id);
                        return s && s.pm_user_id === selectedTalent.id;
                      });
                      if (pmCamps.length === 0) {
                        return <span className="text-slate-500 italic">No hay campañas gestionadas directamente por este PM.</span>;
                      }
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {pmCamps.map(c => (
                            <div key={c.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-white block">{c.name}</span>
                                <span className="text-[10px] text-slate-400">{c.server_name}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400">{c.status}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    // Creator Campaigns
                    (() => {
                      const crCamps = safeCampaigns.filter(c => Array.isArray(c.creators) && c.creators.some(cr => cr.user_id === selectedTalent.id));
                      if (crCamps.length === 0) {
                        return <span className="text-slate-500 italic">Este streamer no está accionado en ninguna campaña activa actualmente.</span>;
                      }
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {crCamps.map(c => (
                            <div key={c.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-white block">{c.name}</span>
                                <span className="text-[10px] text-slate-400">{c.server_name}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400">{c.status}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <h5 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-3">Notas Administrativas Internas</h5>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  {selectedTalent.notes ? (
                    <p className="text-slate-300 leading-relaxed text-xs">{selectedTalent.notes}</p>
                  ) : (
                    <span className="text-slate-500 italic">Sin observaciones registradas por el administrador.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setDetailTalentModalOpen(false); setSelectedTalent(null); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Información de Talento */}
      {editTalentModalOpen && editingTalent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-heading">
                  Modificar Información de {editingTalent.role === 'pm' ? 'Promoter Manager' : 'Streamer'}
                </h3>
                <p className="text-xs text-slate-400">Actualiza los datos de perfil, tarifas internas y notas operativas.</p>
              </div>
              <button
                onClick={() => { setEditTalentModalOpen(false); setEditingTalent(null); }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTalentSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* General User Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={editingTalent.full_name}
                      onChange={e => setEditingTalent({ ...editingTalent, full_name: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Nombre de Usuario (Username) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">@</span>
                      <input
                        type="text"
                        required
                        value={editingTalent.username}
                        onChange={e => setEditingTalent({ ...editingTalent, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                        className="w-full pl-7 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      value={editingTalent.email}
                      onChange={e => setEditingTalent({ ...editingTalent, email: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="tel"
                      value={editingTalent.phone}
                      onChange={e => setEditingTalent({ ...editingTalent, phone: e.target.value })}
                      placeholder="+34 600 000 000"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Estado de Cuenta</label>
                  <select
                    value={editingTalent.status}
                    onChange={e => setEditingTalent({ ...editingTalent, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                  >
                    <option value="active">Activo (Acceso habilitado)</option>
                    <option value="suspended">Suspendido (Acceso revocado)</option>
                  </select>
                </div>

                {/* Creator Specific Fields */}
                {editingTalent.role === 'creator' && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                    <h5 className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider">
                      Datos de Creador / Streamer
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Alias de Transmisión *</label>
                        <input
                          type="text"
                          required
                          value={editingTalent.alias}
                          onChange={e => setEditingTalent({ ...editingTalent, alias: e.target.value })}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingTalent.is_available}
                            onChange={e => setEditingTalent({ ...editingTalent, is_available: e.target.checked })}
                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-slate-300 font-bold text-xs">Disponible para Nuevas Campañas</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Tarifa por Hora ($)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editingTalent.hourly_rate_internal}
                          onChange={e => setEditingTalent({ ...editingTalent, hourly_rate_internal: e.target.value })}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Tarifa Fija Campaña ($)</label>
                        <input
                          type="number"
                          step="1"
                          value={editingTalent.fixed_rate_internal}
                          onChange={e => setEditingTalent({ ...editingTalent, fixed_rate_internal: e.target.value })}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Comisión Agencia (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editingTalent.commission_percentage}
                          onChange={e => setEditingTalent({ ...editingTalent, commission_percentage: e.target.value })}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Juegos (separados por coma)</label>
                        <input
                          type="text"
                          value={editingTalent.games}
                          onChange={e => setEditingTalent({ ...editingTalent, games: e.target.value })}
                          placeholder="Metin2, WoW, Lineage 2"
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Plataformas (separadas por coma)</label>
                        <input
                          type="text"
                          value={editingTalent.platforms}
                          onChange={e => setEditingTalent({ ...editingTalent, platforms: e.target.value })}
                          placeholder="Twitch, Kick, YouTube"
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Biografía / Perfil de Creador</label>
                      <textarea
                        rows="2"
                        value={editingTalent.bio}
                        onChange={e => setEditingTalent({ ...editingTalent, bio: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-emerald-500"
                      />
                    </div>

                    {/* Social links */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Redes Sociales & Canales</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Twitch (usuario)"
                          value={editingTalent.twitch}
                          onChange={e => setEditingTalent({ ...editingTalent, twitch: e.target.value })}
                          className="p-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Kick (canal)"
                          value={editingTalent.kick}
                          onChange={e => setEditingTalent({ ...editingTalent, kick: e.target.value })}
                          className="p-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="YouTube (canal/link)"
                          value={editingTalent.youtube}
                          onChange={e => setEditingTalent({ ...editingTalent, youtube: e.target.value })}
                          className="p-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Discord (tag/servidor)"
                          value={editingTalent.discord}
                          onChange={e => setEditingTalent({ ...editingTalent, discord: e.target.value })}
                          className="p-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="TikTok (@handle)"
                          value={editingTalent.tiktok}
                          onChange={e => setEditingTalent({ ...editingTalent, tiktok: e.target.value })}
                          className="p-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Internal Notes */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Notas Administrativas Internas</label>
                  <textarea
                    rows="3"
                    value={editingTalent.notes}
                    onChange={e => setEditingTalent({ ...editingTalent, notes: e.target.value })}
                    placeholder="Comentarios confidenciales, rendimiento o acuerdos particulares..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setEditTalentModalOpen(false); setEditingTalent(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={talentSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {talentSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-heading">Registrar Nuevo Usuario</h4>
            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Mendoza"
                    value={newUser.full_name}
                    onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nombre de Usuario (Username) *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">@</span>
                    <input
                      type="text"
                      required
                      placeholder="carlos.pm"
                      value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                      className="w-full pl-7 pr-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="carlos@pmforgex.com"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Contraseña *</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Rol</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="director_ops">Director Operacional</option>
                  <option value="director_pms">Director de PMs</option>
                  <option value="director_creators">Director de Creadores</option>
                  <option value="pm">Promoter Manager (PM)</option>
                  <option value="creator">Creador / Streamer</option>
                  <option value="server_owner">Dueño de Servidor</option>
                </select>
              </div>

              {newUser.role === 'creator' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Alias de Creador</label>
                    <input
                      type="text"
                      value={newUser.alias}
                      onChange={e => setNewUser({ ...newUser, alias: e.target.value })}
                      placeholder="Ej. DragonSlayer"
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Tarifa/Hora ($)</label>
                    <input
                      type="number"
                      value={newUser.hourly_rate_internal}
                      onChange={e => setNewUser({ ...newUser, hourly_rate_internal: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Server */}
      {serverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-lg font-bold text-white font-heading">Registrar Nuevo Servidor</h4>
                <p className="text-xs text-slate-400">Configura la información básica, presupuesto y asignaciones operativas.</p>
              </div>
              <button
                type="button"
                onClick={() => setServerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateServerSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar pb-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Nombre del Servidor *</label>
                    <input
                      type="text"
                      required
                      value={newServer.name}
                      onChange={e => setNewServer({ ...newServer, name: e.target.value })}
                      placeholder="Ej. Origin Metin2"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Juego *</label>
                    <input
                      type="text"
                      value={newServer.game}
                      onChange={e => setNewServer({ ...newServer, game: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Website URL</label>
                    <input
                      type="url"
                      value={newServer.website_url}
                      onChange={e => setNewServer({ ...newServer, website_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Información de Contacto / Discord</label>
                    <input
                      type="text"
                      value={newServer.contact_info}
                      onChange={e => setNewServer({ ...newServer, contact_info: e.target.value })}
                      placeholder="Discord tag o email"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Presupuesto del Servidor ($ USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newServer.budget}
                      onChange={e => setNewServer({ ...newServer, budget: e.target.value })}
                      placeholder="0.00 USD"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Dueño de Servidor</label>
                    <select
                      value={newServer.owner_user_id}
                      onChange={e => setNewServer({ ...newServer, owner_user_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    >
                      <option value="">-- Sin Dueño Vinculado --</option>
                      {ownersList.map(o => (
                        <option key={o.id} value={o.id}>{o.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <MultiSelectDropdown
                    label="Asignar Promoter Managers (PMs) al Servidor:"
                    placeholder="Seleccionar PMs asignados..."
                    searchPlaceholder="Buscar por nombre, usuario o email..."
                    items={pmsList.map(pm => ({
                      id: pm.id,
                      label: pm.full_name,
                      sublabel: `(@${pm.username || pm.email})`
                    }))}
                    selectedIds={newServer.pm_ids || []}
                    onChange={(ids) => setNewServer({ ...newServer, pm_ids: ids, pm_user_id: ids[0] || '' })}
                    icon={Shield}
                    accentColor="blue"
                    helperText="Puedes asignar 1 o más PMs para supervisar el servidor."
                  />

                  <MultiSelectDropdown
                    label="Asignar Streamers / Creadores al Servidor (Opcional):"
                    placeholder="Seleccionar streamers vinculados..."
                    searchPlaceholder="Buscar streamer por alias o nombre..."
                    items={safeCreatorsList.filter(Boolean).map(cr => ({
                      id: cr.user_id,
                      label: cr.alias || cr.full_name,
                      sublabel: `(${cr.full_name} • ${Array.isArray(cr.games) ? cr.games.join(', ') : (cr.games || 'Metin2')})`
                    }))}
                    selectedIds={newServer.creator_ids || []}
                    onChange={(ids) => setNewServer({ ...newServer, creator_ids: ids })}
                    icon={Users}
                    accentColor="amber"
                    helperText="Los streamers seleccionados quedarán habilitados para las campañas de este servidor."
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setServerModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  Crear Servidor y Guardar Asignaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Campaign (Admin) */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-lg font-bold text-white font-heading">Crear Nueva Campaña</h4>
                <p className="text-xs text-slate-400 mt-0.5">Define parámetros, objetivos, asignación de PMs y streamers de la campaña</p>
              </div>
              <button
                type="button"
                onClick={() => setCampaignModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar pb-16">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nombre de la Campaña *</label>
                  <input
                    type="text"
                    required
                    value={newCampaign.name}
                    onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="Ej. Apertura Servidor Nuevo 2026"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Servidor *</label>
                    <select
                      required
                      value={newCampaign.server_id}
                      onChange={e => setNewCampaign({ ...newCampaign, server_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Seleccionar Servidor --</option>
                      {safeServers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.game || 'Metin2'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Presupuesto Asignado ($)</label>
                    <input
                      type="number"
                      value={newCampaign.budget_internal}
                      onChange={e => setNewCampaign({ ...newCampaign, budget_internal: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Honorario / Comisión PM ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newCampaign.pm_fee || 0}
                      onChange={e => setNewCampaign({ ...newCampaign, pm_fee: e.target.value })}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Se descontará automáticamente del presupuesto final de la campaña al concluirla.
                    </span>
                  </div>
                  <div>
                    {(() => {
                      const selServer = safeServers.find(s => s.id === parseInt(newCampaign.server_id, 10));
                      if (!selServer || !selServer.budget || selServer.budget <= 0) return null;
                      const serverAllocated = campaigns
                        .filter(c => c.server_id === selServer.id && !c.deleted_at)
                        .reduce((acc, c) => acc + (parseFloat(c.budget_internal) || 0), 0);
                      const serverRemaining = Math.max(0, selServer.budget - serverAllocated);
                      return (
                        <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex flex-col gap-1 justify-center">
                          <div className="flex justify-between items-center">
                            <span>Límite del Servidor:</span>
                            <strong className="text-white">${parseFloat(selServer.budget).toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Disponible para Campañas:</span>
                            <strong className="text-emerald-400">${serverRemaining.toLocaleString()}</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Nº Directos Objetivo por Streamer</label>
                    <input
                      type="number"
                      min="0"
                      value={newCampaign.target_evidences || 0}
                      onChange={e => setNewCampaign({ ...newCampaign, target_evidences: e.target.value })}
                      placeholder="0 = Sin límite"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Meta que debe entregar CADA streamer (0 = sin límite)</span>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Horas Directo Objetivo / Límite</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newCampaign.target_hours || 0}
                      onChange={e => setNewCampaign({ ...newCampaign, target_hours: e.target.value })}
                      placeholder="0 = Sin límite"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Tope máx de horas (0 = sin límite)</span>
                  </div>
                </div>

                {/* Multiplicador y cálculo de Directos Totales */}
                {parseInt(newCampaign.target_evidences, 10) > 0 && (
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
                    <span>🎯 Total de Directos de la Campaña:</span>
                    <span className="font-semibold text-white">
                      {parseInt(newCampaign.target_evidences, 10)} directos/streamer × {Math.max(1, (newCampaign.creator_ids || []).length)} streamer(s) ={' '}
                      <span className="text-amber-400 font-bold text-sm">
                        {parseInt(newCampaign.target_evidences, 10) * Math.max(1, (newCampaign.creator_ids || []).length)} directos totales
                      </span>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Objetivo de la Campaña</label>
                    <textarea
                      rows="2"
                      value={newCampaign.objective}
                      onChange={e => setNewCampaign({ ...newCampaign, objective: e.target.value })}
                      placeholder="Metas de audiencia o eventos de apertura..."
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Requisitos para Streamers</label>
                    <textarea
                      rows="2"
                      value={newCampaign.requirements}
                      onChange={e => setNewCampaign({ ...newCampaign, requirements: e.target.value })}
                      placeholder="Horas de stream mínimas, banners en pantalla, enlaces en chat..."
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Dropdowns en 2 columnas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    {(() => {
                      const selServer = safeServers.find(s => s.id === parseInt(newCampaign.server_id, 10));
                      const serverPmIds = new Set((selServer?.assigned_pms || []).map(p => p.pm_id));
                      if (selServer?.pm_user_id) serverPmIds.add(selServer.pm_user_id);

                      const allPms = (users || []).filter(u => u && u.role === 'pm' && u.status === 'active');
                      const pmItems = allPms.map(pm => ({
                        id: pm.id,
                        label: pm.full_name,
                        sublabel: `(@${pm.username || pm.email})`,
                        badge: serverPmIds.has(pm.id) ? 'Del Servidor' : null,
                        badgeColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }));

                      return (
                        <MultiSelectDropdown
                          label="PM(s) a Cargo de esta Campaña:"
                          placeholder="Seleccionar PMs de la campaña..."
                          searchPlaceholder="Buscar PM por nombre o usuario..."
                          items={pmItems}
                          selectedIds={newCampaign.pm_ids || []}
                          onChange={(ids) => setNewCampaign({ ...newCampaign, pm_ids: ids })}
                          icon={Shield}
                          accentColor="blue"
                          helperText="Solo los PMs seleccionados podrán gestionar esta campaña y auditar sus actividades."
                        />
                      );
                    })()}
                  </div>

                  <div>
                    <MultiSelectDropdown
                      label="Accionar Streamers para esta Campaña (Opcional):"
                      placeholder="Seleccionar streamers participantes..."
                      searchPlaceholder="Buscar streamer por alias o nombre..."
                      items={safeCreatorsList.filter(Boolean).map(cr => ({
                        id: cr.user_id,
                        label: cr.alias || cr.full_name,
                        sublabel: `(${cr.full_name})`
                      }))}
                      selectedIds={newCampaign.creator_ids || []}
                      onChange={(ids) => setNewCampaign({ ...newCampaign, creator_ids: ids })}
                      icon={Users}
                      accentColor="amber"
                      helperText="Los streamers seleccionados podrán ver y registrar directos para esta campaña."
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setCampaignModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  Crear y Activar Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Campaign (Admin) */}
      {editCampaignModalOpen && editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-lg font-bold text-white font-heading">Editar Campaña (Control Administrador)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Modifica parámetros, límites de directos y PMs asignados</p>
              </div>
              <button
                type="button"
                onClick={() => { setEditCampaignModalOpen(false); setEditingCampaign(null); }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCampaignSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar pb-16">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nombre de la Campaña</label>
                  <input
                    type="text"
                    required
                    value={editingCampaign.name}
                    onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Estado</label>
                    <select
                      value={editingCampaign.status}
                      onChange={e => setEditingCampaign({ ...editingCampaign, status: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="active">Activa</option>
                      <option value="paused">Pausada</option>
                      <option value="completed">Completada</option>
                      <option value="draft">Borrador (Draft)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Presupuesto ($)</label>
                    <input
                      type="number"
                      value={editingCampaign.budget_internal}
                      onChange={e => setEditingCampaign({ ...editingCampaign, budget_internal: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Honorario / Comisión PM ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingCampaign.pm_fee || 0}
                      onChange={e => setEditingCampaign({ ...editingCampaign, pm_fee: e.target.value })}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Se liquidará automáticamente al marcar la campaña como completada y se descontará de su presupuesto final.
                    </span>
                  </div>
                  <div>
                    {(() => {
                      const sBudget = parseFloat(editingCampaign.server_budget) || 0;
                      if (sBudget <= 0) return null;
                      const otherAllocated = campaigns
                        .filter(c => c.server_id === editingCampaign.server_id && c.id !== editingCampaign.id && !c.deleted_at)
                        .reduce((acc, c) => acc + (parseFloat(c.budget_internal) || 0), 0);
                      const sRemaining = Math.max(0, sBudget - otherAllocated);
                      return (
                        <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex flex-col gap-1 justify-center">
                          <div className="flex justify-between items-center">
                            <span>Límite del Servidor:</span>
                            <strong className="text-white">${sBudget.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Disponible máx para esta Campaña:</span>
                            <strong className="text-emerald-400">${sRemaining.toLocaleString()}</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Nº Directos Objetivo por Streamer</label>
                    <input
                      type="number"
                      min="0"
                      value={editingCampaign.target_evidences || 0}
                      onChange={e => setEditingCampaign({ ...editingCampaign, target_evidences: e.target.value })}
                      placeholder="0 = Sin límite"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Meta que debe entregar CADA streamer (0 = sin límite)</span>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Horas Directo Objetivo / Límite</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editingCampaign.target_hours || 0}
                      onChange={e => setEditingCampaign({ ...editingCampaign, target_hours: e.target.value })}
                      placeholder="0 = Sin límite"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Tope máx de horas (0 = sin límite)</span>
                  </div>
                </div>

                {/* Multiplicador y cálculo de Directos Totales */}
                {parseInt(editingCampaign.target_evidences, 10) > 0 && (
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
                    <span>🎯 Total de Directos de la Campaña:</span>
                    <span className="font-semibold text-white">
                      {parseInt(editingCampaign.target_evidences, 10)} directos/streamer × {Math.max(1, editingCampaign.creators_count || 1)} streamer(s) ={' '}
                      <span className="text-amber-400 font-bold text-sm">
                        {parseInt(editingCampaign.target_evidences, 10) * Math.max(1, editingCampaign.creators_count || 1)} directos totales
                      </span>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Objetivo</label>
                    <textarea
                      rows="2"
                      value={editingCampaign.objective}
                      onChange={e => setEditingCampaign({ ...editingCampaign, objective: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Requisitos</label>
                    <textarea
                      rows="2"
                      value={editingCampaign.requirements}
                      onChange={e => setEditingCampaign({ ...editingCampaign, requirements: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* PM(s) a Cargo de la Campaña via Dropdown */}
                {(() => {
                  const selServer = safeServers.find(s => s.id === parseInt(editingCampaign.server_id, 10));
                  const serverPmIds = new Set((selServer?.assigned_pms || []).map(p => p.pm_id));
                  if (selServer?.pm_user_id) serverPmIds.add(selServer.pm_user_id);

                  const allPms = (users || []).filter(u => u && u.role === 'pm' && u.status === 'active');
                  const pmItems = allPms.map(pm => ({
                    id: pm.id,
                    label: pm.full_name,
                    sublabel: `(@${pm.username || pm.email})`,
                    badge: serverPmIds.has(pm.id) ? 'Del Servidor' : null,
                    badgeColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }));

                  return (
                    <MultiSelectDropdown
                      label="PM(s) a Cargo de esta Campaña:"
                      placeholder="Seleccionar PMs de la campaña..."
                      searchPlaceholder="Buscar PM por nombre o usuario..."
                      items={pmItems}
                      selectedIds={editingCampaign.pm_ids || []}
                      onChange={(ids) => setEditingCampaign({ ...editingCampaign, pm_ids: ids })}
                      icon={Shield}
                      accentColor="blue"
                      helperText="Solo los PMs seleccionados podrán gestionar esta campaña y auditar sus actividades."
                    />
                  );
                })()}
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => { setEditCampaignModalOpen(false); setEditingCampaign(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Revisar y Pagar Entrega */}
      {payModalOpen && selectedEvidenceForPay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setPayModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">
                    {isEditingPayment ? 'Editar Pago de Entrega' : 'Revisar y Liquidar Entrega'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isEditingPayment 
                      ? 'Modifica el importe liquidado o comprobante para actualizar las finanzas del servidor.'
                      : 'Valida los importes y registra el pago oficial al creador.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Snapshot */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Streamer:</span>
                <span className="font-bold text-white">{selectedEvidenceForPay.creator_alias || selectedEvidenceForPay.creator_full_name} (@{selectedEvidenceForPay.creator_username})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Servidor / Campaña:</span>
                <span className="text-amber-400 font-semibold">{selectedEvidenceForPay.server_name} • {selectedEvidenceForPay.campaign_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Horas Auditadas:</span>
                <span className="text-white font-semibold">{((selectedEvidenceForPay.duration_minutes || 0) / 60).toFixed(1)} horas ({selectedEvidenceForPay.platform})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Audiencia Total:</span>
                <span className="text-emerald-400 font-semibold">{selectedEvidenceForPay.total_views} views</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Liquidación Sugerida:</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">${parseFloat(selectedEvidenceForPay.suggested_payout || 0).toFixed(2)} USD</span>
              </div>
            </div>

            <form onSubmit={handleProcessPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Monto a Pagar ($ USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={payoutForm.payout_amount}
                    onChange={e => setPayoutForm({ ...payoutForm, payout_amount: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Puedes ajustar el monto final si se aplican bonificaciones o deducciones.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Referencia / Código de Transacción *
                </label>
                <input
                  type="text"
                  required
                  value={payoutForm.payment_reference}
                  onChange={e => setPayoutForm({ ...payoutForm, payment_reference: e.target.value })}
                  placeholder="Ej. TRX-849204, Binance Pay ID, PayPal, Transferencia..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Notas de Liquidación (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={payoutForm.payment_notes}
                  onChange={e => setPayoutForm({ ...payoutForm, payment_notes: e.target.value })}
                  placeholder="Detalles de la transferencia, red cripto o quincena..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isEditingPayment 
                    ? 'Al guardar, se actualizarán automáticamente los balances y gastos contables del servidor.'
                    : 'Al confirmar, el estado pasará a Pagada y el creador recibirá de inmediato la notificación en su panel.'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setPayModalOpen(false); setIsEditingPayment(false); }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>
                    {paySubmitting 
                      ? 'Guardando...' 
                      : (isEditingPayment ? 'Guardar Cambios de Pago' : 'Confirmar y Liquidar Pago')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Comprobante de Liquidación */}
      {receiptModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setReceiptModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-center text-purple-400 mx-auto mb-2">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-heading">Comprobante de Liquidación</h3>
              <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">PMForgeX Official Payment Receipt</p>
            </div>

            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Estado:</span>
                <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-full font-bold uppercase text-[10px]">
                  ✓ Liquidado y Pagado
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Importe Pagado:</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">${parseFloat(selectedReceipt.payout_amount || 0).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Referencia TXID:</span>
                <span className="font-mono text-purple-300 font-bold">{selectedReceipt.payment_reference || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Streamer Beneficiario:</span>
                <span className="font-bold text-white">{selectedReceipt.creator_alias || selectedReceipt.creator_full_name} (@{selectedReceipt.creator_username})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Campaña & Servidor:</span>
                <span className="text-slate-300">{selectedReceipt.campaign_name} ({selectedReceipt.server_name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha de Liquidación:</span>
                <span className="text-slate-300">{selectedReceipt.paid_at ? new Date(selectedReceipt.paid_at).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Autorizado Por:</span>
                <span className="text-amber-400 font-semibold">{selectedReceipt.payer_name || 'Super Administrador'}</span>
              </div>
              {selectedReceipt.payment_notes && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Notas: </span>{selectedReceipt.payment_notes}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Cerrar Comprobante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vista Previa de Imagen de Evidencia */}
      {imageModalUrl && (
        <div 
          onClick={() => setImageModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-4xl max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setImageModalUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-400"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={imageModalUrl} 
              alt="Captura de evidencia" 
              className="max-w-full max-h-[80vh] rounded-2xl border border-slate-800 shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
