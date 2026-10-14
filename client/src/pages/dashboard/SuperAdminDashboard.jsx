import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Server, Target, Shield, AlertTriangle, CheckCircle2, 
  Plus, Edit, Trash2, UserPlus, RefreshCw, Eye, Lock, Ban, Check
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [servers, setServers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '', password: '', full_name: '', role: 'pm', phone: '', notes: '',
    alias: '', hourly_rate_internal: 0, fixed_rate_internal: 0
  });
  const [newServer, setNewServer] = useState({
    name: '', game: 'Metin2', contact_info: '', pm_user_id: '', owner_user_id: '', website_url: '', notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [mRes, uRes, sRes, cRes, aRes] = await Promise.all([
        fetch('/api/metrics/dashboard', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/servers', { headers }),
        fetch('/api/campaigns', { headers }),
        fetch('/api/audit?limit=25', { headers })
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (sRes.ok) setServers(await sRes.json());
      if (cRes.ok) setCampaigns(await cRes.json());
      if (aRes.ok) setAuditLogs(await aRes.json());
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
      await fetch(`/api/servers/${serverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pm_user_id: pmId ? parseInt(pmId, 10) : null })
      });
      fetchData();
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
        setNewUser({ email: '', password: '', full_name: '', role: 'pm', phone: '', notes: '', alias: '', hourly_rate_internal: 0, fixed_rate_internal: 0 });
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
        setNewServer({ name: '', game: 'Metin2', contact_info: '', pm_user_id: '', owner_user_id: '', website_url: '', notes: '' });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pmsList = users.filter(u => u.role === 'pm');
  const ownersList = users.filter(u => u.role === 'server_owner');

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Top KPI Cards */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Total Usuarios</div>
                <div className="text-3xl font-extrabold text-white font-heading mt-2">{metrics.summary.total_users}</div>
                <div className="text-[11px] text-slate-500 mt-1">{metrics.summary.total_pms} PMs • {metrics.summary.total_creators} Creadores</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Servidores Activos</div>
                <div className="text-3xl font-extrabold text-amber-400 font-heading mt-2">{metrics.summary.total_servers}</div>
                <div className="text-[11px] text-slate-500 mt-1">{metrics.summary.active_campaigns} Campañas en curso</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Horas Auditadas</div>
                <div className="text-3xl font-extrabold text-orange-400 font-heading mt-2">{metrics.summary.total_stream_hours}h</div>
                <div className="text-[11px] text-slate-500 mt-1">Directos verificados</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Audiencia Acumulada</div>
                <div className="text-3xl font-extrabold text-emerald-400 font-heading mt-2">{metrics.summary.total_views}</div>
                <div className="text-[11px] text-slate-500 mt-1">Pico máx: {metrics.summary.peak_viewers} viewers</div>
              </div>
            </div>
          )}

          {/* Critical Operational Alerts */}
          {metrics && (
            <div className="space-y-3">
              {metrics.alerts.servers_without_pm.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-amber-300">
                        {metrics.alerts.servers_without_pm.length} Servidor(es) sin Promoter Manager asignado
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {metrics.alerts.servers_without_pm.map(s => s.name).join(', ')}
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

              {metrics.alerts.unassigned_creators.length > 0 && (
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
          </div>

        </div>
      )}

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
                        {u.creator_alias && (
                          <span className="block text-[10px] text-amber-400 font-normal">Alias: {u.creator_alias}</span>
                        )}
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
            {servers.map(server => (
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
                      <span className="text-[11px] text-amber-400 font-semibold">{server.game}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    server.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {server.status}
                  </span>
                </div>

                {/* Assignment Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Promoter Manager Asignado:
                    </label>
                    <select
                      value={server.pm_user_id || ''}
                      onChange={(e) => handleAssignPm(server.id, e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-amber-500"
                    >
                      <option value="">-- Sin PM Asignado --</option>
                      {pmsList.map(pm => (
                        <option key={pm.id} value={pm.id}>{pm.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Dueño Registrado:
                    </label>
                    <div className="px-3 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs text-slate-300 truncate">
                      {server.owner_name || 'Sin dueño vinculado'}
                    </div>
                  </div>
                </div>

                {/* Assigned Creators Roster */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Creadores Activos ({server.creators?.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {server.creators?.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">No hay creadores asignados aún.</span>
                    ) : (
                      server.creators?.map(c => (
                        <span key={c.creator_user_id} className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{c.alias}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white font-heading">Campañas Globales de la Agencia</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map(camp => (
              <div key={camp.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">{camp.server_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {camp.status}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">{camp.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{camp.objective}</p>
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span>PM: {camp.pm_name || 'No asignado'}</span>
                  <span>Presupuesto: \${camp.budget_internal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
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

      {/* Modal: Create User */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-heading">Registrar Nuevo Usuario</h4>
            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
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
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-heading">Registrar Nuevo Servidor</h4>
            <form onSubmit={handleCreateServerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre del Servidor</label>
                <input
                  type="text"
                  required
                  value={newServer.name}
                  onChange={e => setNewServer({ ...newServer, name: e.target.value })}
                  placeholder="Ej. Origin Metin2"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Juego</label>
                  <input
                    type="text"
                    value={newServer.game}
                    onChange={e => setNewServer({ ...newServer, game: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Website URL</label>
                  <input
                    type="url"
                    value={newServer.website_url}
                    onChange={e => setNewServer({ ...newServer, website_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Asignar PM Inicial</label>
                  <select
                    value={newServer.pm_user_id}
                    onChange={e => setNewServer({ ...newServer, pm_user_id: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">-- Sin PM --</option>
                    {pmsList.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Dueño de Servidor</label>
                  <select
                    value={newServer.owner_user_id}
                    onChange={e => setNewServer({ ...newServer, owner_user_id: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">-- Sin Dueño Vinculado --</option>
                    {ownersList.map(o => (
                      <option key={o.id} value={o.id}>{o.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Información de Contacto / Discord</label>
                <input
                  type="text"
                  value={newServer.contact_info}
                  onChange={e => setNewServer({ ...newServer, contact_info: e.target.value })}
                  placeholder="Discord tag o email"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setServerModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg"
                >
                  Crear Servidor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
