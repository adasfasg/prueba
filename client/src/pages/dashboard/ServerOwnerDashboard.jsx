import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { 
  Server, Users, CheckCircle2, Tv, ExternalLink, Mail, Phone, 
  Sparkles, Flame, BarChart2, ShieldCheck, PlayCircle
} from 'lucide-react';

export default function ServerOwnerDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [evidences, setEvidences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [mRes, eRes] = await Promise.all([
          fetch('/api/metrics/dashboard', { headers }),
          fetch('/api/evidences', { headers })
        ]);

        if (mRes.ok) setMetrics(await mRes.json());
        if (eRes.ok) setEvidences(await eRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  if (!metrics || !metrics.has_server) {
    return (
      <DashboardLayout activeTab="overview" onTabChange={() => {}}>
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Servidor en proceso de activación</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            La administración de PMForgeX está vinculando tu servidor. En breve verás aquí a tus creadores asignados y métricas.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const { server, summary, creators } = metrics;

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {/* Top Banner: Server Identity & PM Contact */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Server Info */}
          <div className="flex items-center gap-4">
            <img 
              src={server.logo_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150'} 
              alt={server.name} 
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold text-white font-heading">{server.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {server.status}
                </span>
              </div>
              <div className="text-xs text-amber-400 font-semibold mt-0.5">
                Juego: {server.game} • Cuenta de Cliente Verificada
              </div>
              {server.website_url && (
                <a href={server.website_url} target="_blank" rel="noreferrer" className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 mt-1 font-mono">
                  <span>{server.website_url}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Assigned PM Chip */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              PM
            </div>
            <div className="text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Tu Promoter Manager:</span>
              <div className="font-bold text-white mt-0.5">{server.pm.name}</div>
              <div className="text-[11px] text-amber-400/80">{server.pm.email || 'pm@pmforgex.com'}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Verified Impact KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase">Horas Transmitidas</div>
          <div className="text-3xl font-extrabold text-white font-heading mt-2">{summary.total_hours}h</div>
          <div className="text-[11px] text-slate-500 mt-1">Directos de tu servidor</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase">Visualizaciones Totales</div>
          <div className="text-3xl font-extrabold text-amber-400 font-heading mt-2">{summary.total_views}</div>
          <div className="text-[11px] text-slate-500 mt-1">Impacto acumulado</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase">Pico Concurrente</div>
          <div className="text-3xl font-extrabold text-orange-400 font-heading mt-2">{summary.peak_viewers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Máximo de viewers simultáneos</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase">Creadores Asignados</div>
          <div className="text-3xl font-extrabold text-emerald-400 font-heading mt-2">{summary.active_creators}</div>
          <div className="text-[11px] text-slate-500 mt-1">Streamers activos</div>
        </div>
      </div>

      {/* Tab: Overview & Results */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Active Creators Roster */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-heading">Creadores Asignados a tu Servidor</h3>
                <p className="text-xs text-slate-400">Streamers seleccionados que promocionan tu comunidad.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {creators.map(c => (
                <div key={c.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={c.avatar_url} alt={c.alias} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.alias}</h4>
                      <span className="text-[10px] text-slate-400">Desde: {c.assigned_at?.split(' ')[0] || 'Activo'}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Activo
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Approved Evidences List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-heading">Contenido & Directos Auditados</h3>
                <p className="text-xs text-slate-400">Transmisiones y videos verificados y aprobados por tu Promoter Manager.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {evidences.length} Entregas Aprobadas
              </span>
            </div>

            {evidences.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">Aún no hay directos finalizados</h4>
                <p className="text-xs text-slate-400 mt-1">Tan pronto como los creadores transmitan y el PM audite la evidencia, aparecerán aquí.</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Creador</th>
                      <th className="p-4">Plataforma</th>
                      <th className="p-4">Duración</th>
                      <th className="p-4">Espectadores</th>
                      <th className="p-4">Vistas</th>
                      <th className="p-4 text-right">Verificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {evidences.map(ev => (
                      <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 text-slate-400 whitespace-nowrap">{ev.activity_date}</td>
                        <td className="p-4 font-bold text-white">{ev.creator_alias}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {ev.platform}
                          </span>
                        </td>
                        <td className="p-4 font-mono">{(ev.duration_minutes / 60).toFixed(1)} horas</td>
                        <td className="p-4">
                          <span className="text-white font-bold">{ev.avg_viewers}</span> 
                          <span className="text-slate-500 text-[10px] ml-1">(Pico: {ev.peak_viewers})</span>
                        </td>
                        <td className="p-4 font-bold text-emerald-400">{ev.total_views}</td>
                        <td className="p-4 text-right">
                          <a 
                            href={ev.content_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded-lg font-bold text-xs transition-colors"
                          >
                            <span>Ver VOD</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
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

      {/* Tab: Creadores */}
      {activeTab === 'creators' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white font-heading">Directorio de Creadores en tu Servidor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {creators.map(c => (
              <div key={c.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <img src={c.avatar_url} alt={c.alias} className="w-14 h-14 rounded-2xl object-cover border border-slate-700" />
                  <div>
                    <h4 className="text-base font-bold text-white">{c.alias}</h4>
                    <span className="text-xs text-amber-400 font-semibold">Creador Oficial PMForgeX</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Resultados Verificados */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white font-heading">Todas las Evidencias Aprobadas</h3>
          <div className="grid grid-cols-1 gap-4">
            {evidences.map(ev => (
              <div key={ev.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-400">{ev.creator_alias} • {ev.platform}</span>
                  <div className="text-sm font-semibold text-white mt-0.5">{ev.activity_date} - {ev.duration_minutes} minutos</div>
                </div>
                <a 
                  href={ev.content_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <span>Abrir Transmisión</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
