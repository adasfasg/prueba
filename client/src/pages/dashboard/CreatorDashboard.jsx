import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { 
  Target, FileCheck, BarChart3, Users, CheckCircle2, Clock, 
  XCircle, Send, ExternalLink, AlertCircle, Save, Sparkles, Image as ImageIcon 
} from 'lucide-react';

export default function CreatorDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('submit');
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

  // Estado separado para almacenar el archivo físico de la captura
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Profile Form State
  const [editProfile, setEditProfile] = useState({
    alias: '',
    bio: '',
    is_available: true,
    twitch: '',
    youtube: '',
    tiktok: '',
    discord: ''
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
        if (uData.user.creator_profile) {
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
            discord: soc.discord || ''
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
      // Usamos FormData para enviar campos de texto y archivos adjuntos juntos
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
        headers: { 
          Authorization: `Bearer ${token}` 
        },
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
          social_links: {
            twitch: editProfile.twitch,
            youtube: editProfile.youtube,
            tiktok: editProfile.tiktok,
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
      
      {/* Top Stats */}
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
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={newEvidence.activity_date}
                    onChange={e => setNewEvidence({ ...newEvidence, activity_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Minutos
                  </label>
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
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Media Viewers
                  </label>
                  <input
                    type="number"
                    value={newEvidence.avg_viewers}
                    onChange={e => setNewEvidence({ ...newEvidence, avg_viewers: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Pico Viewers
                  </label>
                  <input
                    type="number"
                    value={newEvidence.peak_viewers}
                    onChange={e => setNewEvidence({ ...newEvidence, peak_viewers: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              {/* CAMPO DE SELECCIÓN DE ARCHIVO / IMAGEN (REEMPLAZANDO EL INPUT URL) */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Adjuntar Captura / Imagen de Métricas</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEvidenceFile(e.target.files[0])}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 text-xs cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Sube una captura de pantalla directamente desde tu dispositivo para que tu PM la audite.
                </span>
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
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      ev.status === 'approved' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : ev.status === 'rejected'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {ev.status === 'approved' ? 'Aprobada' : ev.status === 'rejected' ? 'Rechazada' : 'En Revisión'}
                    </span>
                  </div>
                </div>

                {/* Rejection Banner */}
                {ev.status === 'rejected' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Motivo del rechazo: </span>
                      {ev.rejection_reason}
                    </div>
                  </div>
                )}

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

      {/* Tab: Mi Perfil */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white font-heading">Editar Perfil Público</h3>
            <p className="text-xs text-slate-400">Esta información se muestra en el catálogo público de PMForgeX.</p>
          </div>

          {profileSaved && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Perfil actualizado correctamente en la plataforma.</span>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Alias / Nombre Artístico</label>
                <input
                  type="text"
                  required
                  value={editProfile.alias}
                  onChange={e => setEditProfile({ ...editProfile, alias: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Biografía / Presentación</label>
                <textarea
                  rows={3}
                  value={editProfile.bio}
                  onChange={e => setEditProfile({ ...editProfile, bio: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Twitch URL</label>
                  <input
                    type="url"
                    value={editProfile.twitch}
                    onChange={e => setEditProfile({ ...editProfile, twitch: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">YouTube URL</label>
                  <input
                    type="url"
                    value={editProfile.youtube}
                    onChange={e => setEditProfile({ ...editProfile, youtube: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios de Perfil</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}