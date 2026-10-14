import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Server, Target, Shield, BarChart3, AlertCircle, 
  CheckCircle2, Clock, ExternalLink, Sparkles 
} from 'lucide-react';

export default function DirectorDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [servers, setServers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [creators, setCreators] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [mRes, sRes, cRes, crRes, aRes] = await Promise.all([
          fetch('/api/metrics/dashboard', { headers }),
          fetch('/api/servers', { headers }),
          fetch('/api/campaigns', { headers }),
          fetch('/api/creators', { headers }),
          fetch('/api/audit?limit=20', { headers })
        ]);

        if (mRes.ok) setMetrics(await mRes.json());
        if (sRes.ok) setServers(await sRes.json());
        if (cRes.ok) setCampaigns(await cRes.json());
        if (crRes.ok) setCreators(await crRes.json());
        if (aRes.ok) setAuditLogs(await aRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {/* Role Title Header */}
      <div className="mb-8">
        <h3 className="text-xl font-extrabold text-white font-heading">
          {user.role === 'director_ops' && 'Panel del Director Operacional'}
          {user.role === 'director_pms' && 'Supervisión del Equipo de Promoter Managers'}
          {user.role === 'director_creators' && 'Gestión y Supervisión de Creadores de Contenido'}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {user.role === 'director_ops' && 'Supervisión general de servidores, incidencias y campañas activas.'}
          {user.role === 'director_pms' && 'Control de carga de trabajo, cumplimiento y servidores por cada PM.'}
          {user.role === 'director_creators' && 'Monitoreo de horas transmitidas, rendimiento y disponibilidad de streamers.'}
        </p>
      </div>

      {/* Case 1: Director Operacional */}
      {user.role === 'director_ops' && (
        <div className="space-y-6">
          {metrics && metrics.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Servidores Activos</div>
                <div className="text-3xl font-extrabold text-white font-heading mt-2">{metrics.summary.total_servers}</div>
              </div>
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Campañas en Curso</div>
                <div className="text-3xl font-extrabold text-amber-400 font-heading mt-2">{metrics.summary.active_campaigns}</div>
              </div>
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Por Revisar</div>
                <div className="text-3xl font-extrabold text-orange-400 font-heading mt-2">{metrics.summary.pending_reviews}</div>
              </div>
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold uppercase">Horas Totales</div>
                <div className="text-3xl font-extrabold text-emerald-400 font-heading mt-2">{metrics.summary.total_hours}h</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h4 className="text-base font-bold text-white font-heading">Servidores en Monitoreo</h4>
              <div className="divide-y divide-slate-800/60">
                {servers.map(s => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-amber-400">PM: {s.pm_name || 'Sin asignar'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h4 className="text-base font-bold text-white font-heading">Últimas Acciones Registradas</h4>
              <div className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.slice(0, 6).map(log => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-amber-400 font-bold">{log.action}</span>
                      <span className="text-slate-400 ml-2 font-sans">{log.entity}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{log.created_at?.split(' ')[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Director de PMs */}
      {user.role === 'director_pms' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white font-heading">Carga y Desempeño por Promoter Manager</span>
            </div>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Promoter Manager</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Servidores Asignados</th>
                  <th className="p-4">Campañas Activas</th>
                  <th className="p-4">Evidencias Pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {metrics?.pms_workload?.map(pm => (
                  <tr key={pm.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-white">{pm.full_name}</td>
                    <td className="p-4 text-slate-400">{pm.email}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-lg font-bold">
                        {pm.servers_count} servidores
                      </span>
                    </td>
                    <td className="p-4 font-bold text-white">{pm.active_campaigns_count}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg font-bold ${
                        pm.pending_reviews_count > 0 
                          ? 'bg-orange-500/20 text-orange-400' 
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {pm.pending_reviews_count} pendientes
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Case 3: Director de Creadores */}
      {user.role === 'director_creators' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white font-heading">Directorio de Creadores y Rendimiento</span>
            </div>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Alias</th>
                  <th className="p-4">Nombre Real</th>
                  <th className="p-4">Disponibilidad</th>
                  <th className="p-4">Servidores Vinculados</th>
                  <th className="p-4">Horas Transmitidas</th>
                  <th className="p-4">Vistas Generadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {metrics?.creators?.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-white">{c.alias}</td>
                    <td className="p-4 text-slate-400">{c.full_name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.is_available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {c.is_available ? 'Disponible' : 'En Campaña'}
                      </span>
                    </td>
                    <td className="p-4">{c.servers_count}</td>
                    <td className="p-4 font-bold text-amber-400">{c.hours}h</td>
                    <td className="p-4 text-emerald-400 font-semibold">{c.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
