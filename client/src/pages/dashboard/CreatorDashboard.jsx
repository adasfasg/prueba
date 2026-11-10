import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { 
  Target, FileCheck, BarChart3, Users, CheckCircle2, Clock, 
  XCircle, Send, ExternalLink, AlertCircle, Save, Sparkles, Image as ImageIcon, Plus, Trash2, DollarSign 
} from 'lucide-react';

export default function CreatorDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // Enfocado en Profile
  const [metrics, setMetrics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [evidences, setEvidences] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Evidence Form State
  const [newEvidence, setNewEvidence] = useState({
    campaign_id: '',
    type: 'stream',
    platform: 'Twitch',
    content_url: '',
    activity_date: new Date().toISOString().split('T')[0],
    duration_minutes: 120,
    avg_viewers: 0,
    peak_viewers: 0,
    total_views: 0,
    creator_notes: ''
  });

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [imageModalUrl, setImageModalUrl] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Profile Form State Expandido (Diseño 3 Columnas)
  const [editProfile, setEditProfile] = useState({
    alias: '',
    bio: '',
    is_available: true,
    twitch: '',
    youtube: '',
    tiktok: '',
    instagram: '',
    kick: '',
    discord: '',
    banner_url: '',
    avatar_url: '',
    stream_days: 'Mon, Tue, Wed, Thu, Fri',
    stream_start_time: '18:00',
    stream_end_time: '23:00',
    games: 'Metin2, League of Legends',
    pricing_estimate: '$150 - $300 USD',
    stream_style: 'Técnico y Dinámico',
    campaign_preferences: 'Aperturas de servidores, Torneos PvP',
    total_followers: '45.2K',
    avg_viewers: '1,250',
    avg_duration: '4.5 hrs'
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [mRes, cRes, eRes, pRes] = await Promise.all([
        fetch('/api/metrics/dashboard', { headers }),
        fetch('/api/campaigns', { headers }),
        fetch('/api/evidences', { headers }),
        fetch('/api/auth/me', { headers })
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (cRes.ok) {
        const camps = await cRes.json();
        setCampaigns(camps);
        if (camps.length > 0 && !newEvidence.campaign_id) {
          setNewEvidence(prev => ({ ...prev, campaign_id: camps[0].id }));
        }
      }
      if (eRes.ok) setEvidences(await eRes.json());
      if (pRes.ok) {
        const uData = await pRes.json();
        if (uData.user && uData.user.creator_profile) {
          const cp = uData.user.creator_profile;
          setProfile(cp);
          let soc = {};
          try { soc = JSON.parse(cp.social_links || '{}'); } catch(e){}
          setEditProfile({
            alias: cp.alias || '',
            bio: cp.bio || '',
            is_available: Boolean(cp.is_available),
            twitch: soc.twitch || '',
            youtube: soc.youtube || '',
            tiktok: soc.tiktok || '',
            instagram: soc.instagram || '',
            kick: soc.kick || '',
            discord: soc.discord || '',
            banner_url: cp.banner_url || '',
            avatar_url: cp.avatar_url || '',
            stream_days: cp.stream_days || 'Mon, Tue, Wed, Thu, Fri',
            stream_start_time: cp.stream_start_time || '18:00',
            stream_end_time: cp.stream_end_time || '23:00',
            games: cp.games || 'Metin2',
            pricing_estimate: cp.pricing_estimate || '$150 - $300 USD',
            stream_style: cp.stream_style || 'Técnico y Dinámico',
            campaign_preferences: cp.campaign_preferences || 'Aperturas, Torneos PvP',
            total_followers: cp.total_followers || '45.2K',
            avg_viewers: cp.avg_viewers || '1,250',
            avg_duration: cp.avg_duration || '4.5 hrs'
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('campaign_id', newEvidence.campaign_id);
      formData.append('type', newEvidence.type);
      formData.append('platform', newEvidence.platform);
      formData.append('content_url', newEvidence.content_url);
      formData.append('activity_date', newEvidence.activity_date);
      formData.append('duration_minutes', newEvidence.duration_minutes);
      formData.append('avg_viewers', newEvidence.avg_viewers);
      formData.append('peak_viewers', newEvidence.peak_viewers);
      formData.append('total_views', newEvidence.total_views);
      formData.append('creator_notes', newEvidence.creator_notes);

      if (evidenceFile) {
        formData.append('evidence_image', evidenceFile);
      }

      const res = await fetch('/api/evidences', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setNewEvidence(prev => ({
          ...prev,
          content_url: '',
          duration_minutes: 120,
          avg_viewers: 0,
          peak_viewers: 0,
          total_views: 0,
          creator_notes: ''
        }));
        setEvidenceFile(null);
        fetchData();
        setTimeout(() => setSubmitSuccess(false), 4000);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const res = await fetch(`/api/creators/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          alias: editProfile.alias,
          bio: editProfile.bio,
          is_available: editProfile.is_available,
          banner_url: editProfile.banner_url,
          avatar_url: editProfile.avatar_url,
          stream_days: editProfile.stream_days,
          stream_start_time: editProfile.stream_start_time,
          stream_end_time: editProfile.stream_end_time,
          games: editProfile.games,
          pricing_estimate: editProfile.pricing_estimate,
          stream_style: editProfile.stream_style,
          campaign_preferences: editProfile.campaign_preferences,
          social_links: {
            twitch: editProfile.twitch,
            youtube: editProfile.youtube,
            tiktok: editProfile.tiktok,
            instagram: editProfile.instagram,
            kick: editProfile.kick,
            discord: editProfile.discord
          }
        })
      });
      if (res.ok) {
        setProfileSaved(true);
        fetchData();
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {/* Top Stats Banner */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Horas Aprobadas</div>
            <div className="text-3xl font-extrabold text-emerald-400 font-heading mt-2">{metrics.summary.total_hours}h</div>
            <div className="text-[11px] text-slate-500 mt-1">{metrics.summary.approved_activities} directos validados</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">En Revisión</div>
            <div className="text-3xl font-extrabold text-amber-400 font-heading mt-2">{metrics.summary.in_review}</div>
            <div className="text-[11px] text-slate-500 mt-1">Esperando aprobación del PM</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Campañas Asignadas</div>
            <div className="text-3xl font-extrabold text-white font-heading mt-2">{metrics.summary.active_campaigns}</div>
            <div className="text-[11px] text-slate-500 mt-1">Servidores activos</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Vistas Acumuladas</div>
            <div className="text-3xl font-extrabold text-orange-400 font-heading mt-2">{metrics.summary.total_views}</div>
            <div className="text-[11px] text-slate-500 mt-1">Impacto total</div>
          </div>
        </div>
      )}

      {/* Tab: Registrar Actividad */}
      {activeTab === 'submit' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-bold text-white font-heading">Registrar Nueva Actividad / Directo</h3>
            <p className="text-xs text-slate-400">Sube tus evidencias y métricas para que el Promoter Manager las audite.</p>
          </div>

          {submitSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>¡Actividad registrada con éxito! Tu PM ha recibido la notificación y revisará la evidencia.</span>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <form onSubmit={handleSubmitEvidence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Campaña y Servidor
                </label>
                <select
                  required
                  value={newEvidence.campaign_id}
                  onChange={e => setNewEvidence({ ...newEvidence, campaign_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                >
                  <option value="">-- Selecciona Campaña --</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.server_name})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Tipo de Contenido
                  </label>
                  <select
                    value={newEvidence.type}
                    onChange={e => setNewEvidence({ ...newEvidence, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                  >
                    <option value="stream">Transmisión en Vivo (Stream)</option>
                    <option value="video">Video Publicado</option>
                    <option value="post">Publicación / Reel</option>
                    <option value="event">Cobertura de Torneo / Evento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Plataforma
                  </label>
                  <select
                    value={newEvidence.platform}
                    onChange={e => setNewEvidence({ ...newEvidence, platform: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                  >
                    <option value="Twitch">Twitch</option>
                    <option value="YouTube">YouTube</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Kick">Kick</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Enlace del VOD / Video (URL pública)
                </label>
                <input
                  type="url"
                  required
                  value={newEvidence.content_url}
                  onChange={e => setNewEvidence({ ...newEvidence, content_url: e.target.value })}
                  placeholder="https://twitch.tv/videos/... o https://youtube.com/watch?v=..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Fecha</label>
                  <input
                    type="date"
                    required
                    value={newEvidence.activity_date}
                    onChange={e => setNewEvidence({ ...newEvidence, activity_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Minutos</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newEvidence.duration_minutes}
                    onChange={e => setNewEvidence({ ...newEvidence, duration_minutes: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Media Viewers</label>
                  <input
                    type="number"
                    value={newEvidence.avg_viewers}
                    onChange={e => setNewEvidence({ ...newEvidence, avg_viewers: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Pico Viewers</label>
                  <input
                    type="number"
                    value={newEvidence.peak_viewers}
                    onChange={e => setNewEvidence({ ...newEvidence, peak_viewers: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Adjuntar Foto / Captura del Directo (Evidencia)</span>
                  </span>
                  {evidenceFile && (
                    <span className="text-[10px] text-emerald-400 font-semibold">Foto seleccionada</span>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEvidenceFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 text-xs cursor-pointer"
                />
                {evidenceFile && (
                  <div className="mt-2 flex items-center gap-3 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                    <img
                      src={URL.createObjectURL(evidenceFile)}
                      alt="Vista previa"
                      className="w-16 h-12 object-cover rounded-lg border border-amber-500/30"
                    />
                    <div className="flex-1 text-xs text-slate-300 truncate">
                      <div className="font-semibold truncate">{evidenceFile.name}</div>
                      <div className="text-[10px] text-slate-500">{(evidenceFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEvidenceFile(null)}
                      className="text-red-400 hover:text-red-300 p-1 text-xs"
                      title="Quitar foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Comentarios o Resumen de la Transmisión
                </label>
                <textarea
                  rows={3}
                  value={newEvidence.creator_notes}
                  onChange={e => setNewEvidence({ ...newEvidence, creator_notes: e.target.value })}
                  placeholder="Ej. Apertura de servidor, leveo en desierto, participación en guerra de gremios..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Evidencia para Auditoría</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Mis Entregas */}
      {activeTab === 'evidences' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white font-heading">Historial de Mis Entregas</h3>
            <p className="text-xs text-slate-400">Consulta el estado de aprobación de tus directos y videos.</p>
          </div>

          <div className="space-y-4">
            {evidences.map(ev => (
              <div key={ev.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-amber-400">{ev.campaign_name} ({ev.server_name})</span>
                    <h4 className="text-sm font-semibold text-white mt-0.5">{ev.platform} — {(ev.duration_minutes / 60).toFixed(1)} horas</h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    ev.status === 'paid'
                      ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                      : ev.status === 'approved' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : ev.status === 'rejected'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {ev.status === 'paid' ? '💰 Pagada' : ev.status === 'approved' ? 'Aprobada (Pendiente Pago)' : ev.status === 'rejected' ? 'Rechazada' : 'En Revisión'}
                  </span>
                </div>

                {/* Liquidación por Administrador si la entrega está pagada */}
                {ev.status === 'paid' && (
                  <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-xs space-y-1.5">
                    <div className="text-[11px] font-bold text-purple-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        Liquidación Procesada por Administrador
                      </span>
                      <span className="text-emerald-400 font-extrabold text-sm font-mono">+${parseFloat(ev.payout_amount || 0).toFixed(2)} USD</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1 border-t border-purple-800/30">
                      <div><span className="text-slate-500">Referencia:</span> <span className="font-mono text-purple-200">{ev.payment_reference || 'N/A'}</span></div>
                      <div><span className="text-slate-500">Fecha de Pago:</span> {ev.paid_at ? new Date(ev.paid_at).toLocaleDateString() : 'Registrado'}</div>
                      <div><span className="text-slate-500">Autorizado:</span> {ev.payer_name || 'Administración'}</div>
                    </div>
                    {ev.payment_notes && (
                      <div className="text-[10px] text-slate-400 italic">Nota: {ev.payment_notes}</div>
                    )}
                  </div>
                )}

                {/* Foto anexa de evidencia si existe */}
                {(() => {
                  let screenshots = [];
                  try {
                    screenshots = Array.isArray(ev.evidence_screenshots)
                      ? ev.evidence_screenshots
                      : JSON.parse(ev.evidence_screenshots || '[]');
                  } catch (e) {
                    if (ev.evidence_screenshots) screenshots = [ev.evidence_screenshots];
                  }
                  if (!screenshots || screenshots.length === 0) return null;
                  return (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        Foto Anexa:
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        {screenshots.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => setImageModalUrl(imgUrl)}
                            className="relative group w-20 h-14 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 hover:border-amber-400 transition-all cursor-pointer"
                          >
                            <img src={imgUrl} alt="Captura de evidencia" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-[9px] font-bold text-white bg-slate-900/90 px-1.5 py-0.5 rounded">Ver</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <span>Fecha: {ev.activity_date} | Media: {ev.avg_viewers} viewers</span>
                  <a href={ev.content_url} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-1 font-mono">
                    <span>Ver VOD</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Mis Campañas */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white font-heading">Campañas en las que Participas</h3>
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
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Requisitos pactados:</span>
                  <div className="mt-1">{camp.requirements || 'Cumplir directos semanales con logo oficial.'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB: MI PERFIL (NUEVO DISEÑO DE 3 COLUMNAS COMPLETO) ================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white font-heading">Editar Perfil Público</h3>
              <p className="text-xs text-slate-400">Esta información detallada se muestra en el catálogo público de PMForgeX.</p>
            </div>
            {profileSaved && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Perfil actualizado correctamente en la plataforma.</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* GRID PRINCIPAL DE 3 COLUMNAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
              
              {/* ================= COLUMNA 1 ================= */}
              <div className="space-y-6">
                
                {/* 1.1 Header & Avatar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">1. Header & Avatar</h4>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">URL Imagen Avatar</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editProfile.avatar_url}
                      onChange={e => setEditProfile({ ...editProfile, avatar_url: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">URL Banner de Cabecera</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editProfile.banner_url}
                      onChange={e => setEditProfile({ ...editProfile, banner_url: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 1.2 Información Básica */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">2. Información Básica</h4>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Alias / Nombre Artístico</label>
                    <input
                      type="text"
                      required
                      value={editProfile.alias}
                      onChange={e => setEditProfile({ ...editProfile, alias: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Biografía / Presentación</label>
                    <textarea
                      rows={4}
                      value={editProfile.bio}
                      onChange={e => setEditProfile({ ...editProfile, bio: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <input
                      type="checkbox"
                      id="avail"
                      checked={editProfile.is_available}
                      onChange={e => setEditProfile({ ...editProfile, is_available: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="avail" className="text-xs text-slate-300 font-semibold cursor-pointer">
                      Marcar como disponible para nuevas campañas en el catálogo
                    </label>
                  </div>
                </div>

                {/* 1.3 Horarios de Stream */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">3. Horarios de Stream</h4>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Días de Stream habituales</label>
                    <input
                      type="text"
                      value={editProfile.stream_days}
                      onChange={e => setEditProfile({ ...editProfile, stream_days: e.target.value })}
                      placeholder="Ej. Mon, Tue, Wed, Thu, Fri"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Hora Inicio</label>
                      <input
                        type="time"
                        value={editProfile.stream_start_time}
                        onChange={e => setEditProfile({ ...editProfile, stream_start_time: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Hora Fin</label>
                      <input
                        type="time"
                        value={editProfile.stream_end_time}
                        onChange={e => setEditProfile({ ...editProfile, stream_end_time: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 1.4 Plataformas y Redes Sociales */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">4. Plataformas y Redes</h4>
                  <div className="space-y-2">
                    <input type="url" placeholder="Twitch URL" value={editProfile.twitch} onChange={e => setEditProfile({ ...editProfile, twitch: e.target.value })} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white" />
                    <input type="url" placeholder="YouTube URL" value={editProfile.youtube} onChange={e => setEditProfile({ ...editProfile, youtube: e.target.value })} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white" />
                    <input type="url" placeholder="Kick URL" value={editProfile.kick} onChange={e => setEditProfile({ ...editProfile, kick: e.target.value })} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white" />
                    <input type="url" placeholder="TikTok URL" value={editProfile.tiktok} onChange={e => setEditProfile({ ...editProfile, tiktok: e.target.value })} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white" />
                    <input type="url" placeholder="Instagram URL" value={editProfile.instagram} onChange={e => setEditProfile({ ...editProfile, instagram: e.target.value })} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white" />
                    <input type="url" placeholder="Discord Server URL" value={editProfile.discord} onChange={e => setEditProfile({ ...editProfile, discord: e.target.value })} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white" />
                  </div>
                </div>

              </div>

              {/* ================= COLUMNA 2 ================= */}
              <div className="space-y-6">
                
                {/* 2.1 Juegos y Categorías */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">5. Juegos y Categorías</h4>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Juegos Principales</label>
                    <input
                      type="text"
                      value={editProfile.games}
                      onChange={e => setEditProfile({ ...editProfile, games: e.target.value })}
                      placeholder="Ej. Metin2, League of Legends, Valorant"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editProfile.games.split(',').map((g, i) => (
                      <span key={i} className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg font-semibold text-[11px]">
                        🎮 {g.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 2.2 Metadatos de Campaña */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">6. Metadatos de Campaña</h4>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Tarifa / Estimación de Precios</label>
                    <input
                      type="text"
                      value={editProfile.pricing_estimate}
                      onChange={e => setEditProfile({ ...editProfile, pricing_estimate: e.target.value })}
                      placeholder="Ej. $150 - $300 USD por directo"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Estilo de Transmisión</label>
                    <input
                      type="text"
                      value={editProfile.stream_style}
                      onChange={e => setEditProfile({ ...editProfile, stream_style: e.target.value })}
                      placeholder="Ej. Técnico, Comedia, PvP Competitivo"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Tipos de Campaña Preferidos</label>
                    <textarea
                      rows={3}
                      value={editProfile.campaign_preferences}
                      onChange={e => setEditProfile({ ...editProfile, campaign_preferences: e.target.value })}
                      placeholder="Ej. Aperturas de servidor, Revisiones de ítems, Torneos"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Portafolio de Colaboraciones */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">Portafolio de Marcas / Servidores</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 font-bold text-[10px]">SERVIDORES METIN2</div>
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 font-bold text-[10px]">TORNEOS PVP</div>
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-amber-500 font-bold flex items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors">+ Añadir</div>
                  </div>
                </div>

              </div>

              {/* ================= COLUMNA 3 ================= */}
              <div className="space-y-6">
                
                {/* 3.1 Estadísticas y Audiencia */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">7. Métricas de Audiencia</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block font-semibold">Seguidores</span>
                      <span className="text-sm font-extrabold text-amber-400 mt-1 block">{editProfile.total_followers}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block font-semibold">Media Viewers</span>
                      <span className="text-sm font-extrabold text-emerald-400 mt-1 block">{editProfile.avg_viewers}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block font-semibold">Duración Prom.</span>
                      <span className="text-sm font-extrabold text-orange-400 mt-1 block">{editProfile.avg_duration}</span>
                    </div>
                  </div>
                </div>

                {/* Gráficos de Crecimiento */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">Rendimiento e Impacto</h4>
                  <div className="h-44 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-slate-400 text-center p-4 space-y-2">
                    <BarChart3 className="w-8 h-8 text-amber-500/50" />
                    <p className="text-[11px] leading-relaxed">
                      Gráfico de rendimiento sincronizado automáticamente con el historial de directos validados por tu Promoter Manager.
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* BOTÓN DE GUARDAR CAMBIOS DE PERFIL */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-5 h-5" />
                <span>Guardar Cambios de Perfil Completo</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Modal para ampliar la imagen de evidencia */}
      {imageModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md" onClick={() => setImageModalUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={imageModalUrl} alt="Evidencia Ampliada" className="max-w-full max-h-[85vh] rounded-2xl border border-slate-800 object-contain shadow-2xl" />
            <button 
              onClick={() => setImageModalUrl(null)}
              className="absolute top-3 right-3 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
            >
              Cerrar ✕
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}