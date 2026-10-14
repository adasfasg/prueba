import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { 
  Server, Target, FileCheck, Users, CheckCircle2, XCircle, 
  Clock, ExternalLink, Plus, MessageSquare, AlertCircle, Eye, Sparkles, Image as ImageIcon 
} from 'lucide-react';

export default function PMDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('review');
  const [metrics, setMetrics] = useState(null);
  const [servers, setServers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [evidences, setEvidences] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [reviewAction, setReviewAction] = useState('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Modal para ver imagen en grande (Preview)
  const [imageModalUrl, setImageModalUrl] = useState(null);

  // Create Campaign Modal
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '', server_id: '', objective: '', requirements: '', budget_internal: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [mRes, sRes, cRes, eRes, crRes] = await Promise.all([
        fetch('/api/metrics/dashboard', { headers }),
        fetch('/api/servers', { headers }),
        fetch('/api/campaigns', { headers }),
        fetch('/api/evidences', { headers }),
        fetch('/api/creators', { headers })
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (sRes.ok) setServers(await sRes.json());
      if (cRes.ok) setCampaigns(await cRes.json());
      if (eRes.ok) setEvidences(await eRes.json());
      if (crRes.ok) setCreators(await crRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleOpenReview = (evidence, action) => {
    setSelectedEvidence(evidence);
    setReviewAction(action);
    setRejectionReason('');
    setInternalNotes('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (reviewAction === 'rejected' && !rejectionReason.trim()) {
      alert('Debes indicar el motivo del rechazo.');
      return;
    }

    try {
      const res = await fetch(`/api/evidences/${selectedEvidence.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: reviewAction,
          rejection_reason: rejectionReason,
          internal_notes: internalNotes
        })
      });

      if (res.ok) {
        setReviewModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
        setNewCampaign({ name: '', server_id: '', objective: '', requirements: '', budget_internal: 0 });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingReviewEvidences = evidences.filter(e => e.status === 'review');
  const approvedEvidences = evidences.filter(e => e.status === 'approved');

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {/* Top PM KPIs */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Mis Servidores</div>
            <div className="text-3xl font-extrabold text-white font-heading mt-2">{metrics.summary.my_servers}</div>
            <div className="text-[11px] text-slate-500 mt-1">Bajo tu coordinación</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Campañas Activas</div>
            <div className="text-3xl font-extrabold text-amber-400 font-heading mt-2">{metrics.summary.my_active_campaigns}</div>
            <div className="text-[11px] text-slate-500 mt-1">En curso</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Por Revisar</div>
            <div className="text-3xl font-extrabold text-orange-400 font-heading mt-2">{pendingReviewEvidences.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Evidencias en bandeja</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Horas Auditadas</div>
            <div className="text-3xl font-extrabold text-emerald-400 font-heading mt-2">{metrics.summary.managed_hours}h</div>
            <div className="text-[11px] text-slate-500 mt-1">{metrics.summary.managed_views} views</div>
          </div>
        </div>
      )}

      {/* Tab: Bandeja de Revisión (Workflow Principal) */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-heading">Bandeja de Revisión de Evidencias</h3>
              <p className="text-xs text-slate-400">Verifica los directos, horas y enlaces antes de publicarlos en el panel del servidor.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {pendingReviewEvidences.length} Pendientes
            </span>

          </div>

          {pendingReviewEvidences.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">¡Todo al día!</h4>
              <p className="text-xs text-slate-400 mt-1">No hay evidencias pendientes de revisión en tus servidores.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingReviewEvidences.map(ev => {
                // Parsear las capturas si vienen en formato JSON array string
                let screenshots = [];
                try {
                  screenshots = JSON.parse(ev.evidence_screenshots || '[]');
                } catch (e) {
                  if (ev.evidence_screenshots) screenshots = [ev.evidence_screenshots];
                }

                return (
                  <div key={ev.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img 
                          src={ev.creator_avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100'} 
                          alt={ev.creator_alias} 
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <div className="text-sm font-bold text-white">{ev.creator_alias}</div>
                          <div className="text-[11px] text-amber-400">{ev.campaign_name} ({ev.server_name})</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300">
                          {ev.platform}
                        </span>
                        <span className="text-xs text-slate-400">{ev.activity_date}</span>
                      </div>
                    </div>

                    {/* Metrics snapshot */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Duración</span>
                        <div className="font-bold text-white mt-0.5">{ev.duration_minutes} minutos ({(ev.duration_minutes / 60).toFixed(1)}h)</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Espectadores Media</span>
                        <div className="font-bold text-white mt-0.5">{ev.avg_viewers} viewers</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Pico Máximo</span>
                        <div className="font-bold text-orange-400 mt-0.5">{ev.peak_viewers} viewers</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Vistas Totales</span>
                        <div className="font-bold text-emerald-400 mt-0.5">{ev.total_views}</div>
                      </div>
                    </div>

                    {/* Content URL & comments */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-semibold">Enlace de VOD / Video:</span>
                        <a 
                          href={ev.content_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          <span className="truncate max-w-md">{ev.content_url}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      </div>

                      {/* SECCIÓN NUEVA: Previsualización de la imagen de evidencia subida por el creador */}
                      {screenshots.length > 0 && (
                        <div className="pt-1">
                          <span className="text-slate-400 font-semibold block mb-1.5 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                            Evidencia Visual (Captura):
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            {screenshots.map((imgUrl, idx) => (
                              <div key={idx} className="relative group w-24 h-16 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 cursor-pointer" onClick={() => setImageModalUrl(imgUrl)}>
                                <img src={imgUrl} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {ev.creator_notes && (
                        <div className="text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                          <span className="text-slate-500 font-semibold">Nota del creador: </span>
                          {ev.creator_notes}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleOpenReview(ev, 'rejected')}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Rechazar</span>
                      </button>
                      <button
                        onClick={() => handleOpenReview(ev, 'approved')}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aprobar y Notificar Servidor</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Already Approved List */}
          {approvedEvidences.length > 0 && (
            <div className="pt-8">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                Historial de Evidencias Aprobadas Recientemente ({approvedEvidences.length})
              </h4>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Creador</th>
                      <th className="p-3">Servidor</th>
                      <th className="p-3">Plataforma</th>
                      <th className="p-3">Duración</th>
                      <th className="p-3">Espectadores</th>
                      <th className="p-3">Enlace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {approvedEvidences.map(ev => (
                      <tr key={ev.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400">{ev.activity_date}</td>
                        <td className="p-3 font-bold text-white">{ev.creator_alias}</td>
                        <td className="p-3 text-amber-400">{ev.server_name}</td>
                        <td className="p-3">{ev.platform}</td>
                        <td className="p-3 font-mono">{(ev.duration_minutes / 60).toFixed(1)}h</td>
                        <td className="p-3">{ev.avg_viewers} (Pico: {ev.peak_viewers})</td>
                        <td className="p-3">
                          <a href={ev.content_url} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-1">
                            <span>Ver VOD</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Tab: Mis Servidores */}
      {activeTab === 'servers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-heading">Servidores a mi Cargo</h3>
              <p className="text-xs text-slate-400">Servidores donde eres el Promoter Manager asignado.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>

                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Contacto Dueño:</div>
                  <div className="mt-0.5">{server.owner_name} ({server.contact_info || 'Sin contacto'})</div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{server.creators?.length || 0} Creadores Vinculados</span>
                  <button
                    onClick={() => {
                      setNewCampaign({ ...newCampaign, server_id: server.id });
                      setCampaignModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Campaña</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Mis Campañas */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-heading">Mis Campañas</h3>
              <p className="text-xs text-slate-400">Objetivos y seguimiento de entregas.</p>
            </div>
            <button
              onClick={() => setCampaignModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Campaña</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map(camp => (
              <div key={camp.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">{camp.server_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    {camp.status}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">{camp.name}</h4>
                <p className="text-xs text-slate-400">{camp.objective}</p>
                
                <div className="pt-3 border-t border-slate-800 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Creadores Participantes:</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {camp.creators?.map(cr => (
                      <span key={cr.user_id} className="px-2 py-0.5 bg-slate-950 rounded-md text-[11px] text-slate-300">
                        {cr.alias}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Mis Creadores */}
      {activeTab === 'creators' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white font-heading">Creadores Asignados a tus Servidores</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {creators.map(c => (
              <div key={c.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <img src={c.avatar_url} alt={c.alias} className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{c.alias}</h4>
                    <span className="text-[10px] text-amber-400">{c.total_hours_streamed}h transmitidas</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{c.bio}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para ampliar la imagen de evidencia */}
      {imageModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md" onClick={() => setImageModalUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={imageModalUrl} alt="Evidencia Ampliada" className="max-w-full max-h-[85vh] rounded-2xl border border-slate-800 object-contain shadow-2xl" />
            <button className="absolute top-3 right-3 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700">
              Cerrar ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal: Review Evidence (Approve / Reject) */}
      {reviewModalOpen && selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-heading">
              {reviewAction === 'approved' ? 'Aprobar Evidencia de Contenido' : 'Rechazar Evidencia de Contenido'}
            </h4>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <div><span className="text-slate-500">Creador:</span> {selectedEvidence.creator_alias}</div>
              <div><span className="text-slate-500">Servidor:</span> {selectedEvidence.server_name}</div>
              <div><span className="text-slate-500">Duración:</span> {selectedEvidence.duration_minutes} min</div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              {reviewAction === 'rejected' && (
                <div>
                  <label className="block text-red-400 font-bold mb-1">
                    Motivo del Rechazo (Obligatorio para el creador):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Ej. Falta el banner del servidor o no se alcanzó el tiempo acordado..."
                    className="w-full p-2.5 bg-slate-950 border border-red-500/40 rounded-xl text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Notas Internas de la Agencia (Solo visible para PMs y Super Admin):
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Observaciones de calidad, VOD revisado, etc."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 font-bold text-xs uppercase rounded-xl ${
                    reviewAction === 'approved'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-red-500 hover:bg-red-400 text-white'
                  }`}
                >
                  {reviewAction === 'approved' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Campaign */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-heading">Crear Nueva Campaña</h4>
            <form onSubmit={handleCreateCampaignSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre de la Campaña</label>
                <input
                  type="text"
                  required
                  value={newCampaign.name}
                  onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="Ej. Promoción Lanzamiento Metin2"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Servidor</label>
                <select
                  required
                  value={newCampaign.server_id}
                  onChange={e => setNewCampaign({ ...newCampaign, server_id: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="">-- Selecciona Servidor --</option>
                  {servers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Objetivo</label>
                <textarea
                  rows={2}
                  value={newCampaign.objective}
                  onChange={e => setNewCampaign({ ...newCampaign, objective: e.target.value })}
                  placeholder="Meta de espectadores, registros, etc."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCampaignModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg"
                >
                  Guardar Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}