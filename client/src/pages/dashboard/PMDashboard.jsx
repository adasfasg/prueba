import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { 
  Server, Target, FileCheck, Users, CheckCircle2, XCircle, 
  Clock, ExternalLink, Plus, MessageSquare, AlertCircle, Eye, Sparkles, Image as ImageIcon, Edit,
  Search, Filter, Shield, Award, Play, Video, BarChart2, Check, Lock, Phone, Globe
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
    name: '', server_id: '', objective: '', requirements: '', budget_internal: 0, creator_ids: []
  });

  // Edit Campaign Modal (PM)
  const [editCampaignModalOpen, setEditCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  // Creator Search, Filters & Details for PM
  const [creatorSearch, setCreatorSearch] = useState('');
  const [creatorScopeFilter, setCreatorScopeFilter] = useState('all'); // 'all' | 'my_creators' | 'available'
  const [creatorDetailModalOpen, setCreatorDetailModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [creatorEvidences, setCreatorEvidences] = useState([]);
  const [loadingCreatorEvidences, setLoadingCreatorEvidences] = useState(false);
  const [creatorDetailTab, setCreatorDetailTab] = useState('dossier'); // 'dossier' | 'evidences'

  // Edit Creator Modal (for creators under PM's charge)
  const [editCreatorModalOpen, setEditCreatorModalOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState(null);
  const [editCreatorForm, setEditCreatorForm] = useState({
    alias: '',
    bio: '',
    phone: '',
    notes: '',
    is_available: true,
    games: [],
    platforms: [],
    twitch: '',
    youtube: '',
    kick: '',
    tiktok: '',
    discord: ''
  });
  const [savingCreator, setSavingCreator] = useState(false);

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
        setNewCampaign({ name: '', server_id: '', objective: '', requirements: '', budget_internal: 0, creator_ids: [] });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditCampaign = (camp) => {
    setEditingCampaign({
      id: camp.id,
      name: camp.name,
      status: camp.status,
      objective: camp.objective || '',
      requirements: camp.requirements || '',
      budget_internal: camp.budget_internal || 0
    });
    setEditCampaignModalOpen(true);
  };

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

  // Action / Assign creator to campaign (PM)
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

  // Remove creator from campaign (PM)
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

  const handleOpenCreatorDetail = async (creator) => {
    setSelectedCreator(creator);
    setCreatorDetailTab('dossier');
    setCreatorDetailModalOpen(true);
    setLoadingCreatorEvidences(true);
    try {
      const res = await fetch(`/api/creators/${creator.id}/evidences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCreatorEvidences(data.evidences || []);
      } else {
        setCreatorEvidences([]);
      }
    } catch (err) {
      console.error(err);
      setCreatorEvidences([]);
    } finally {
      setLoadingCreatorEvidences(false);
    }
  };

  const handleOpenEditCreator = (creator) => {
    if (!creator.is_under_charge) {
      alert('Solo puedes modificar información de creadores asignados a tus servidores o campañas.');
      return;
    }
    setEditingCreator(creator);
    const social = creator.social_links || {};
    setEditCreatorForm({
      alias: creator.alias || '',
      bio: creator.bio || '',
      phone: creator.phone || '',
      notes: creator.user_notes || '',
      is_available: creator.is_available === 1 || creator.is_available === true,
      games: Array.isArray(creator.games) ? creator.games : ['Metin2'],
      platforms: Array.isArray(creator.platforms) ? creator.platforms : ['Twitch'],
      twitch: social.twitch || '',
      youtube: social.youtube || '',
      kick: social.kick || '',
      tiktok: social.tiktok || '',
      discord: social.discord || ''
    });
    setEditCreatorModalOpen(true);
  };

  const handleSaveCreatorSubmit = async (e) => {
    e.preventDefault();
    if (!editingCreator) return;
    setSavingCreator(true);
    try {
      const payload = {
        alias: editCreatorForm.alias.trim(),
        bio: editCreatorForm.bio,
        phone: editCreatorForm.phone,
        notes: editCreatorForm.notes,
        is_available: editCreatorForm.is_available,
        games: editCreatorForm.games,
        platforms: editCreatorForm.platforms,
        social_links: {
          twitch: editCreatorForm.twitch.trim(),
          youtube: editCreatorForm.youtube.trim(),
          kick: editCreatorForm.kick.trim(),
          tiktok: editCreatorForm.tiktok.trim(),
          discord: editCreatorForm.discord.trim()
        }
      };

      const res = await fetch(`/api/creators/${editingCreator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEditCreatorModalOpen(false);
        setEditingCreator(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar creador');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al actualizar');
    } finally {
      setSavingCreator(false);
    }
  };

  const safeEvidences = Array.isArray(evidences) ? evidences : [];
  const safeServers = Array.isArray(servers) ? servers : [];
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const safeCreators = Array.isArray(creators) ? creators : [];

  const pendingReviewEvidences = safeEvidences.filter(e => e && e.status === 'review');
  const approvedEvidences = safeEvidences.filter(e => e && (e.status === 'approved' || e.status === 'paid'));

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {/* Top PM KPIs */}
      {metrics && metrics.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Mis Servidores</div>
            <div className="text-3xl font-extrabold text-white font-heading mt-2">{metrics.summary.my_servers || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Bajo tu coordinación</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Campañas Activas</div>
            <div className="text-3xl font-extrabold text-amber-400 font-heading mt-2">{metrics.summary.my_active_campaigns || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">En curso</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Por Revisar</div>
            <div className="text-3xl font-extrabold text-orange-400 font-heading mt-2">{pendingReviewEvidences.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Evidencias en bandeja</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Horas Auditadas</div>
            <div className="text-3xl font-extrabold text-emerald-400 font-heading mt-2">{metrics.summary.managed_hours || '0.0'}h</div>
            <div className="text-[11px] text-slate-500 mt-1">{metrics.summary.managed_views || 0} views</div>
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
                      <th className="p-3">Estado</th>
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ev.status === 'paid'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {ev.status === 'paid' ? '💰 Pagada' : 'Aprobada'}
                          </span>
                        </td>
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
                </div>

                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Contacto Dueño:</div>
                  <div className="mt-0.5">{server.owner_name || 'Sin dueño vinculado'} ({server.contact_info || 'Sin contacto'})</div>
                </div>

                {/* Assigned Streamers by Admin (Read-Only for PM) */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Streamers Asignados al Servidor ({Array.isArray(server.creators) ? server.creators.length : 0}):</span>
                    <span className="text-[9px] text-slate-500">Asignados por Admin</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(!server.creators || server.creators.length === 0) ? (
                      <span className="text-[11px] text-slate-500 italic">El Administrador no ha vinculado streamers aún.</span>
                    ) : (
                      server.creators.map(c => c && (
                        <span key={c.creator_user_id || Math.random()} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[11px] text-slate-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{c.alias || c.full_name || 'Streamer'}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Listos para accionar en campañas</span>
                  <button
                    onClick={() => {
                      setNewCampaign({ ...newCampaign, server_id: server.id, creator_ids: [] });
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
              <p className="text-xs text-slate-400">Objetivos, gestión y accionamiento de streamers asignados al servidor.</p>
            </div>
            <button
              onClick={() => {
                setNewCampaign({ name: '', server_id: servers[0]?.id || '', objective: '', requirements: '', budget_internal: 0, creator_ids: [] });
                setCampaignModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Campaña</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {safeCampaigns.map(camp => {
              const campServer = safeServers.find(s => s && s.id === camp.server_id);
              const serverCreators = Array.isArray(campServer?.creators) ? campServer.creators : [];
              const campCreators = Array.isArray(camp.creators) ? camp.creators : [];
              const availableToAssign = serverCreators.filter(
                sc => sc && !campCreators.some(cc => cc && cc.user_id === sc.creator_user_id)
              );

              return (
                <div key={camp.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">{camp.server_name || campServer?.name || 'Servidor'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        camp.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {camp.status}
                      </span>
                      <button
                        onClick={() => handleOpenEditCampaign(camp)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                        title="Editar Campaña"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-white">{camp.name}</h4>
                  <p className="text-xs text-slate-400">{camp.objective || 'Sin objetivo registrado.'}</p>
                  
                  {camp.requirements && (
                    <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="font-semibold text-amber-400">Requisitos: </span>
                      {camp.requirements}
                    </div>
                  )}

                  {/* Action streamers in campaign */}
                  <div className="pt-3 border-t border-slate-800 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Streamers Accionados ({campCreators.length}):
                      </span>
                      {availableToAssign.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignCreatorToCampaign(camp.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-amber-400 focus:outline-none"
                        >
                          <option value="">+ Accionar Streamer</option>
                          {availableToAssign.map(sc => (
                            <option key={sc.creator_user_id} value={sc.creator_user_id}>
                              {sc.alias || 'Streamer #' + sc.creator_user_id}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {campCreators.length === 0 ? (
                        <span className="text-[11px] text-slate-500 italic">No hay streamers accionados aún en esta campaña.</span>
                      ) : (
                        campCreators.map(cr => cr && (
                          <span key={cr.user_id} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{cr.alias || cr.full_name || 'Streamer'}</span>
                            <button
                              onClick={() => handleRemoveCreatorFromCampaign(camp.id, cr.user_id)}
                              className="text-slate-500 hover:text-red-400 text-xs ml-0.5 cursor-pointer"
                              title="Desvincular de campaña"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Directorio & Estadísticas de Streamers para PM */}
      {activeTab === 'creators' && (() => {
        const filteredCreators = safeCreators.filter(c => {
          if (creatorSearch.trim()) {
            const q = creatorSearch.toLowerCase();
            const matchAlias = (c.alias || '').toLowerCase().includes(q);
            const matchUser = (c.username || '').toLowerCase().includes(q);
            const matchName = (c.full_name || '').toLowerCase().includes(q);
            const matchGames = Array.isArray(c.games) && c.games.some(g => (g || '').toLowerCase().includes(q));
            const matchPlatforms = Array.isArray(c.platforms) && c.platforms.some(p => (p || '').toLowerCase().includes(q));
            if (!matchAlias && !matchUser && !matchName && !matchGames && !matchPlatforms) return false;
          }

          if (creatorScopeFilter === 'my_creators') {
            return c.is_under_charge;
          }
          if (creatorScopeFilter === 'available') {
            return c.is_available === 1 || c.is_available === true;
          }
          return true;
        });

        const myCreatorsCount = safeCreators.filter(c => c.is_under_charge).length;
        const totalAuditedHours = safeCreators
          .filter(c => c.is_under_charge)
          .reduce((acc, c) => acc + (parseFloat(c.total_hours_streamed) || 0), 0)
          .toFixed(1);
        const totalAuditedViews = safeCreators
          .filter(c => c.is_under_charge)
          .reduce((acc, c) => acc + (c.total_views_accumulated || 0), 0);
        const myCreatorsWithEvidences = safeCreators.filter(c => c.is_under_charge && (c.total_evidences || 0) > 0);
        const avgSuccessRate = myCreatorsWithEvidences.length > 0
          ? Math.round(myCreatorsWithEvidences.reduce((acc, c) => acc + (c.delivery_success_rate || 100), 0) / myCreatorsWithEvidences.length)
          : 100;

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-white font-heading flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Directorio & Estadísticas de Streamers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulta estadísticas de entregas, rendimiento de transmisiones y gestiona la ficha de los creadores a tu cargo.
                </p>
              </div>

              {/* Scope filter badges */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setCreatorScopeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    creatorScopeFilter === 'all' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({safeCreators.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCreatorScopeFilter('my_creators')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    creatorScopeFilter === 'my_creators' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  A mi Cargo ({myCreatorsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCreatorScopeFilter('available')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    creatorScopeFilter === 'available' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Disponibles
                </button>
              </div>
            </div>

            {/* PM Streamer Metrics Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Creadores a Cargo</div>
                <div className="text-2xl font-black text-amber-400 font-heading mt-1">{myCreatorsCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">En tus servidores y campañas</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Horas Auditadas</div>
                <div className="text-2xl font-black text-emerald-400 font-heading mt-1">{totalAuditedHours}h</div>
                <div className="text-[10px] text-slate-500 mt-0.5">En directos completados</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Vistas Acumuladas</div>
                <div className="text-2xl font-black text-purple-400 font-heading mt-1">{totalAuditedViews.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Impacto total de audiencia</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Tasa Cumplimiento</div>
                <div className="text-2xl font-black text-blue-400 font-heading mt-1">{avgSuccessRate}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Entregas aprobadas / pagadas</div>
              </div>
            </div>

            {/* Live Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por alias, @username, nombre, juego (Metin2, MU Online...) o plataforma (Twitch, Kick, YouTube)..."
                value={creatorSearch}
                onChange={(e) => setCreatorSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              {creatorSearch && (
                <button
                  onClick={() => setCreatorSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Streamers Grid */}
            {filteredCreators.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-white">No se encontraron creadores</h4>
                <p className="text-xs text-slate-400 mt-1">Intenta con otro término de búsqueda o cambia el filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredCreators.map(c => {
                  const games = Array.isArray(c.games) ? c.games : [];
                  const platforms = Array.isArray(c.platforms) ? c.platforms : [];
                  const assignedServers = Array.isArray(c.assigned_servers) ? c.assigned_servers : [];

                  return (
                    <div 
                      key={c.id} 
                      className={`p-5 bg-slate-900 border rounded-2xl space-y-4 transition-all hover:border-slate-700 flex flex-col justify-between ${
                        c.is_under_charge ? 'border-amber-500/30 shadow-lg shadow-amber-500/5' : 'border-slate-800'
                      }`}
                    >
                      <div>
                        {/* Header card */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img 
                                src={c.avatar_url || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100'} 
                                alt={c.alias} 
                                className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                              />
                              <span className={`w-3 h-3 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-slate-900 ${
                                c.is_available ? 'bg-emerald-500' : 'bg-slate-600'
                              }`} title={c.is_available ? 'Disponible' : 'No disponible'} />
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-sm font-bold text-white leading-tight">{c.alias}</h4>
                                {c.username && (
                                  <span className="text-[11px] font-mono text-amber-400/90 font-semibold">@{c.username}</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{c.full_name}</div>
                            </div>
                          </div>

                          {/* Charge Badge */}
                          {c.is_under_charge ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              A tu cargo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 whitespace-nowrap">
                              Directorio
                            </span>
                          )}
                        </div>

                        {/* Bio snippet */}
                        <p className="text-xs text-slate-300 line-clamp-2 mt-3 leading-relaxed">
                          {c.bio || 'Sin biografía registrada.'}
                        </p>

                        {/* Delivery Statistics Snapshot */}
                        <div className="grid grid-cols-4 gap-2 mt-4 p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">Entregas</div>
                            <div className="text-xs font-bold text-white mt-0.5">
                              {(c.approved_evidences || 0) + (c.paid_evidences || 0)}/{c.total_evidences || 0}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">Horas</div>
                            <div className="text-xs font-bold text-emerald-400 mt-0.5">
                              {c.total_hours_streamed || 0}h
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">Pico Viewers</div>
                            <div className="text-xs font-bold text-orange-400 mt-0.5">
                              {c.peak_viewers || 0}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">Vistas</div>
                            <div className="text-xs font-bold text-purple-400 mt-0.5">
                              {(c.total_views_accumulated || 0) > 1000 
                                ? `${((c.total_views_accumulated || 0) / 1000).toFixed(1)}k` 
                                : (c.total_views_accumulated || 0)}
                            </div>
                          </div>
                        </div>

                        {/* Games & Platforms */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {games.map((g, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {g}
                            </span>
                          ))}
                          {platforms.map((p, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300">
                              {p}
                            </span>
                          ))}
                        </div>

                        {/* Associated servers if any */}
                        {assignedServers.length > 0 && (
                          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                            <Server className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">
                              {assignedServers.map(s => s.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenCreatorDetail(c)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ficha & Estadísticas</span>
                        </button>

                        {c.is_under_charge ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEditCreator(c)}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Modificar información del creador"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-2 bg-slate-800/50 text-slate-600 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-not-allowed"
                            title="Solo puedes modificar creadores a tu cargo"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Solo Lectura</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

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

      {/* Modal: Create Campaign (PM) */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-heading">Crear Nueva Campaña</h4>
            <form onSubmit={handleCreateCampaignSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre de la Campaña *</label>
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
                <label className="block text-slate-300 font-bold mb-1">Servidor Asignado *</label>
                <select
                  required
                  value={newCampaign.server_id}
                  onChange={e => setNewCampaign({ ...newCampaign, server_id: e.target.value, creator_ids: [] })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="">-- Selecciona Servidor --</option>
                  {safeServers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.game || 'Metin2'})</option>
                  ))}
                </select>
              </div>

              {/* Action Streamers Assigned to this Server */}
              {newCampaign.server_id && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Accionar Streamers del Servidor para esta Campaña:
                  </label>
                  {(() => {
                    const selServer = safeServers.find(s => s && s.id === parseInt(newCampaign.server_id, 10));
                    const serverCreators = Array.isArray(selServer?.creators) ? selServer.creators : [];
                    if (serverCreators.length === 0) {
                      return (
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-amber-400 text-xs">
                          ⚠️ Este servidor no tiene streamers vinculados por el Administrador. Solo el Administrador puede vincular streamers a los servidores.
                        </div>
                      );
                    }
                    return (
                      <div className="max-h-32 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                        {serverCreators.map(cr => cr && (
                          <label key={cr.creator_user_id} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(newCampaign.creator_ids || []).includes(cr.creator_user_id)}
                              onChange={(e) => {
                                const current = newCampaign.creator_ids || [];
                                if (e.target.checked) {
                                  setNewCampaign({ ...newCampaign, creator_ids: [...current, cr.creator_user_id] });
                                } else {
                                  setNewCampaign({ ...newCampaign, creator_ids: current.filter(id => id !== cr.creator_user_id) });
                                }
                              }}
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="font-semibold text-amber-400">{cr.alias || 'Streamer #' + cr.creator_user_id}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">Objetivo de la Campaña</label>
                <textarea
                  rows={2}
                  value={newCampaign.objective}
                  onChange={e => setNewCampaign({ ...newCampaign, objective: e.target.value })}
                  placeholder="Meta de espectadores, registros, etc."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Requisitos para Streamers</label>
                <textarea
                  rows={2}
                  value={newCampaign.requirements}
                  onChange={e => setNewCampaign({ ...newCampaign, requirements: e.target.value })}
                  placeholder="Horas de directo, banners o menciones requeridas..."
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
                  Crear Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Campaign (PM) */}
      {editCampaignModalOpen && editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-heading">Editar Campaña</h4>
            <form onSubmit={handleUpdateCampaignSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre de la Campaña</label>
                <input
                  type="text"
                  required
                  value={editingCampaign.name}
                  onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Estado</label>
                <select
                  value={editingCampaign.status}
                  onChange={e => setEditingCampaign({ ...editingCampaign, status: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="active">Activa</option>
                  <option value="paused">Pausada</option>
                  <option value="completed">Completada</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Objetivo</label>
                <textarea
                  rows={2}
                  value={editingCampaign.objective}
                  onChange={e => setEditingCampaign({ ...editingCampaign, objective: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Requisitos</label>
                <textarea
                  rows={2}
                  value={editingCampaign.requirements}
                  onChange={e => setEditingCampaign({ ...editingCampaign, requirements: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditCampaignModalOpen(false); setEditingCampaign(null); }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ficha Completa y Estadísticas de Entregas del Streamer */}
      {creatorDetailModalOpen && selectedCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            {/* Header */}
            <div className="p-6 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedCreator.avatar_url || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100'} 
                  alt={selectedCreator.alias}
                  className="w-14 h-14 rounded-2xl object-cover border border-amber-500/30"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-heading">{selectedCreator.alias}</h3>
                    {selectedCreator.username && (
                      <span className="text-xs font-mono text-amber-400">@{selectedCreator.username}</span>
                    )}
                    {selectedCreator.is_under_charge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        A tu cargo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedCreator.full_name} • {selectedCreator.email || 'Email confidencial'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setCreatorDetailModalOpen(false); setSelectedCreator(null); }}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="px-6 border-b border-slate-800 bg-slate-950/30 flex items-center gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCreatorDetailTab('dossier')}
                className={`py-3 border-b-2 transition-colors ${
                  creatorDetailTab === 'dossier'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Dossier & Ficha Técnica
              </button>
              <button
                type="button"
                onClick={() => setCreatorDetailTab('evidences')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  creatorDetailTab === 'evidences'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>Historial de Entregas & VODs</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {creatorEvidences.length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              {creatorDetailTab === 'dossier' ? (
                <div className="space-y-5 text-xs">
                  {/* Bio */}
                  <div>
                    <label className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block mb-1">Biografía / Presentación</label>
                    <p className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 leading-relaxed">
                      {selectedCreator.bio || 'Sin biografía registrada.'}
                    </p>
                  </div>

                  {/* Delivery statistics summary grid */}
                  <div>
                    <label className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block mb-1.5">Métricas Acumuladas</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                        <div className="text-[10px] text-slate-400">Total Horas Stream</div>
                        <div className="text-base font-bold text-emerald-400 mt-1">{selectedCreator.total_hours_streamed || 0}h</div>
                      </div>
                      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                        <div className="text-[10px] text-slate-400">Visualizaciones</div>
                        <div className="text-base font-bold text-purple-400 mt-1">{(selectedCreator.total_views_accumulated || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                        <div className="text-[10px] text-slate-400">Media de Viewers</div>
                        <div className="text-base font-bold text-white mt-1">{selectedCreator.avg_viewers || 0}</div>
                      </div>
                      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                        <div className="text-[10px] text-slate-400">Pico Máximo</div>
                        <div className="text-base font-bold text-orange-400 mt-1">{selectedCreator.peak_viewers || 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown of evidences by status */}
                  <div>
                    <label className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block mb-1.5">Desglose de Entregas</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div className="text-[10px] text-emerald-400 font-bold">Aprobadas</div>
                        <div className="text-sm font-extrabold text-white mt-0.5">{selectedCreator.approved_evidences || 0}</div>
                      </div>
                      <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <div className="text-[10px] text-purple-400 font-bold">Pagadas</div>
                        <div className="text-sm font-extrabold text-white mt-0.5">{selectedCreator.paid_evidences || 0}</div>
                      </div>
                      <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <div className="text-[10px] text-orange-400 font-bold">En Revisión</div>
                        <div className="text-sm font-extrabold text-white mt-0.5">{selectedCreator.review_evidences || 0}</div>
                      </div>
                      <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="text-[10px] text-red-400 font-bold">Rechazadas</div>
                        <div className="text-sm font-extrabold text-white mt-0.5">{selectedCreator.rejected_evidences || 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Technical Profile Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <div className="text-slate-400 font-bold uppercase text-[10px]">Juegos & Plataformas</div>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(selectedCreator.games) ? selectedCreator.games : []).map((g, i) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded font-semibold text-[10px]">
                            {g}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {(Array.isArray(selectedCreator.platforms) ? selectedCreator.platforms : []).map((p, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <div className="text-slate-400 font-bold uppercase text-[10px]">Contacto & Disponibilidad</div>
                      <div>Teléfono: <span className="text-white font-mono">{selectedCreator.phone || 'No registrado'}</span></div>
                      <div>Disponibilidad: <span className={selectedCreator.is_available ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{selectedCreator.is_available ? 'Activo / Disponible' : 'En pausa'}</span></div>
                      {selectedCreator.user_notes && (
                        <div>Notas: <span className="text-slate-300 italic">{selectedCreator.user_notes}</span></div>
                      )}
                    </div>
                  </div>

                  {/* Social links */}
                  {selectedCreator.social_links && Object.keys(selectedCreator.social_links).length > 0 && (
                    <div>
                      <label className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block mb-1.5">Canales & Enlaces Sociales</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedCreator.social_links).map(([net, url]) => url && (
                          <a
                            key={net}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-xl text-amber-400 hover:underline flex items-center gap-1.5 transition-colors font-mono"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="capitalize">{net}:</span>
                            <span className="text-slate-300 truncate max-w-xs">{url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Evidences History Tab */
                <div className="space-y-4">
                  {loadingCreatorEvidences ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Cargando historial de entregas...
                    </div>
                  ) : creatorEvidences.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl">
                      <FileCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <div className="text-sm font-bold text-white">Sin entregas registradas</div>
                      <div className="text-xs text-slate-400 mt-0.5">Este creador no ha subido transmisiones o evidencias aún.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creatorEvidences.map(ev => (
                        <div key={ev.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{ev.campaign_name}</span>
                              <span className="text-[11px] text-amber-400 font-semibold">({ev.server_name})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">{ev.activity_date}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                ev.status === 'paid'
                                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                  : ev.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : ev.status === 'review'
                                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {ev.status === 'paid' ? '💰 Pagada' : ev.status === 'approved' ? 'Aprobada' : ev.status === 'review' ? 'En Revisión' : 'Rechazada'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-slate-900 rounded-lg text-slate-300">
                            <div>Plataforma: <span className="font-bold text-white">{ev.platform}</span></div>
                            <div>Duración: <span className="font-bold text-white">{(ev.duration_minutes / 60).toFixed(1)}h</span></div>
                            <div>Espectadores: <span className="font-bold text-white">{ev.avg_viewers} (Pico: {ev.peak_viewers})</span></div>
                            <div>Vistas: <span className="font-bold text-white">{ev.total_views}</span></div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <a
                              href={ev.content_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              <span>Ver Transmisión / VOD</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            {ev.payment_reference && (
                              <span className="text-slate-400 text-[10px]">
                                Ref. Pago: <span className="text-white font-mono">{ev.payment_reference}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                {selectedCreator.is_under_charge ? '✓ Creador a tu cargo: Tienes permisos para modificar su información.' : 'ℹ️ Modo lectura: Creador fuera de tu asignación operativa.'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setCreatorDetailModalOpen(false); setSelectedCreator(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cerrar
                </button>
                {selectedCreator.is_under_charge && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = selectedCreator;
                      setCreatorDetailModalOpen(false);
                      handleOpenEditCreator(c);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Modificar Ficha</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Creador a Cargo (PM) */}
      {editCreatorModalOpen && editingCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">Modificar Ficha de Creador</h3>
                  <p className="text-xs text-slate-400">Actualiza datos públicos, contacto y notas de {editingCreator.alias}.</p>
                </div>
              </div>
              <button
                onClick={() => { setEditCreatorModalOpen(false); setEditingCreator(null); }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCreatorSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Alias Artístico</label>
                <input
                  type="text"
                  required
                  value={editCreatorForm.alias}
                  onChange={e => setEditCreatorForm({ ...editCreatorForm, alias: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Biografía / Perfil</label>
                <textarea
                  rows={3}
                  value={editCreatorForm.bio}
                  onChange={e => setEditCreatorForm({ ...editCreatorForm, bio: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="Enfoque de contenido, estilo y descripción del canal..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={editCreatorForm.phone}
                    onChange={e => setEditCreatorForm({ ...editCreatorForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_available_pm"
                    checked={editCreatorForm.is_available}
                    onChange={e => setEditCreatorForm({ ...editCreatorForm, is_available: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-amber-400"
                  />
                  <label htmlFor="is_available_pm" className="text-slate-300 font-bold cursor-pointer">
                    Disponible para Campañas
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Videojuegos Principales (separados por coma)</label>
                <input
                  type="text"
                  value={Array.isArray(editCreatorForm.games) ? editCreatorForm.games.join(', ') : editCreatorForm.games}
                  onChange={e => setEditCreatorForm({ 
                    ...editCreatorForm, 
                    games: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="Metin2, MU Online, Lineage 2"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Plataformas de Emisión (separadas por coma)</label>
                <input
                  type="text"
                  value={Array.isArray(editCreatorForm.platforms) ? editCreatorForm.platforms.join(', ') : editCreatorForm.platforms}
                  onChange={e => setEditCreatorForm({ 
                    ...editCreatorForm, 
                    platforms: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="Twitch, YouTube, Kick, TikTok"
                />
              </div>

              {/* Social Channels */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-slate-400 font-bold uppercase text-[10px]">Enlaces a Canales</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="url"
                    placeholder="Canal Twitch URL"
                    value={editCreatorForm.twitch}
                    onChange={e => setEditCreatorForm({ ...editCreatorForm, twitch: e.target.value })}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                  <input
                    type="url"
                    placeholder="Canal YouTube URL"
                    value={editCreatorForm.youtube}
                    onChange={e => setEditCreatorForm({ ...editCreatorForm, youtube: e.target.value })}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                  <input
                    type="url"
                    placeholder="Canal Kick URL"
                    value={editCreatorForm.kick}
                    onChange={e => setEditCreatorForm({ ...editCreatorForm, kick: e.target.value })}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                  <input
                    type="url"
                    placeholder="Perfil TikTok URL"
                    value={editCreatorForm.tiktok}
                    onChange={e => setEditCreatorForm({ ...editCreatorForm, tiktok: e.target.value })}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Notas Internas de Supervisión</label>
                <textarea
                  rows={2}
                  value={editCreatorForm.notes}
                  onChange={e => setEditCreatorForm({ ...editCreatorForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="Observaciones de puntualidad, engagement o feedback del PM..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setEditCreatorModalOpen(false); setEditingCreator(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCreator}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingCreator ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}