import React, { useState, useMemo } from 'react';
import { 
  Target, Server, Plus, Edit, Trash2, CheckCircle2, Pause, Play, 
  Clock, Eye, Users, ChevronDown, ChevronUp, Search, Filter, 
  Calendar, FolderArchive, Sparkles, AlertCircle, ExternalLink,
  Flame, BarChart2, Shield, RefreshCw, X
} from 'lucide-react';

export default function GroupedCampaignsView({
  servers = [],
  campaigns = [],
  userRole = 'super_admin',
  onOpenCreateCampaign,
  onOpenEditCampaign,
  onDeleteCampaign,
  onToggleStatusCampaign,
  onAssignCreator,
  onRemoveCreator,
  creatorsList = [],
  canCreate = false,
  canEdit = false,
  canDelete = false,
  readOnly = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServerFilter, setSelectedServerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'history'
  const [expandedHistories, setExpandedHistories] = useState({});
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState(null);

  // Group servers and their campaigns
  const { groupedData, summaryStats } = useMemo(() => {
    const safeServers = Array.isArray(servers) ? servers : [];
    const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

    // Map servers by ID
    const serverMap = new Map();
    safeServers.forEach(s => {
      if (s && s.id) {
        serverMap.set(s.id, {
          ...s,
          activeCampaigns: [],
          historicalCampaigns: [],
          totalViews: 0,
          totalDurationMinutes: 0
        });
      }
    });

    // Also collect any server from campaigns if not already in serverMap (e.g. for creators)
    safeCampaigns.forEach(c => {
      if (!c) return;
      const sId = c.server_id;
      if (!serverMap.has(sId)) {
        serverMap.set(sId, {
          id: sId,
          name: c.server_name || `Servidor #${sId}`,
          game: c.server_game || 'Videojuego',
          logo_url: c.server_logo || null,
          pm_name: c.pm_name || null,
          status: 'active',
          activeCampaigns: [],
          historicalCampaigns: [],
          totalViews: 0,
          totalDurationMinutes: 0
        });
      }

      const sObj = serverMap.get(sId);
      const isHistory = c.status === 'completed' || c.status === 'cancelled' || c.status === 'finished' || c.deleted_at;

      if (isHistory) {
        sObj.historicalCampaigns.push(c);
      } else {
        sObj.activeCampaigns.push(c);
      }

      const views = parseInt(c.campaign_views, 10) || 0;
      const duration = parseInt(c.campaign_duration_minutes, 10) || 0;
      sObj.totalViews += views;
      sObj.totalDurationMinutes += duration;
    });

    // Convert map to array and apply search & filters
    const searchLower = searchTerm.toLowerCase().trim();
    let result = Array.from(serverMap.values());

    // Filter by specific server if selected
    if (selectedServerFilter !== 'all') {
      const targetId = parseInt(selectedServerFilter, 10);
      result = result.filter(s => s.id === targetId);
    }

    // Filter by search query
    if (searchLower) {
      result = result.filter(s => {
        const matchServer = 
          (s.name && s.name.toLowerCase().includes(searchLower)) ||
          (s.game && s.game.toLowerCase().includes(searchLower)) ||
          (s.pm_name && s.pm_name.toLowerCase().includes(searchLower));

        const matchActive = s.activeCampaigns.some(c => 
          (c.name && c.name.toLowerCase().includes(searchLower)) ||
          (c.objective && c.objective.toLowerCase().includes(searchLower)) ||
          (c.pm_names && c.pm_names.toLowerCase().includes(searchLower)) ||
          (c.pm_name && c.pm_name.toLowerCase().includes(searchLower)) ||
          (c.creators && c.creators.some(cr => (cr.alias && cr.alias.toLowerCase().includes(searchLower))))
        );

        const matchHistory = s.historicalCampaigns.some(c => 
          (c.name && c.name.toLowerCase().includes(searchLower)) ||
          (c.objective && c.objective.toLowerCase().includes(searchLower)) ||
          (c.pm_names && c.pm_names.toLowerCase().includes(searchLower)) ||
          (c.pm_name && c.pm_name.toLowerCase().includes(searchLower)) ||
          (c.creators && c.creators.some(cr => (cr.alias && cr.alias.toLowerCase().includes(searchLower))))
        );

        return matchServer || matchActive || matchHistory;
      });
    }

    // Filter by status tab (active vs history)
    if (statusFilter === 'active') {
      result = result.filter(s => s.activeCampaigns.length > 0 || (canCreate && !searchLower));
    } else if (statusFilter === 'history') {
      result = result.filter(s => s.historicalCampaigns.length > 0);
    }

    // Sort servers: servers with active campaigns first, then alphabetical
    result.sort((a, b) => {
      if (b.activeCampaigns.length !== a.activeCampaigns.length) {
        return b.activeCampaigns.length - a.activeCampaigns.length;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // Calculate global stats
    let totalActiveCount = 0;
    let totalHistoryCount = 0;
    let totalGlobalViews = 0;
    let totalGlobalMinutes = 0;

    serverMap.forEach(s => {
      totalActiveCount += s.activeCampaigns.length;
      totalHistoryCount += s.historicalCampaigns.length;
      totalGlobalViews += s.totalViews;
      totalGlobalMinutes += s.totalDurationMinutes;
    });

    return {
      groupedData: result,
      summaryStats: {
        totalServers: serverMap.size,
        activeCampaigns: totalActiveCount,
        historyCampaigns: totalHistoryCount,
        totalViews: totalGlobalViews,
        totalHours: Math.round(totalGlobalMinutes / 60)
      }
    };
  }, [servers, campaigns, searchTerm, selectedServerFilter, statusFilter, canCreate]);

  // Toggle single server history accordion
  const toggleHistory = (serverId) => {
    setExpandedHistories(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  // Expand / collapse all histories
  const toggleAllHistories = (expand) => {
    const newState = {};
    groupedData.forEach(s => {
      newState[s.id] = expand;
    });
    setExpandedHistories(newState);
  };

  const allHistoriesExpanded = useMemo(() => {
    if (groupedData.length === 0) return false;
    return groupedData.every(s => expandedHistories[s.id]);
  }, [groupedData, expandedHistories]);

  return (
    <div className="space-y-6">
      
      {/* ================= HEADER & RESUMEN GLOBAL ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <h3 className="text-xl font-bold text-white font-heading">
              Campañas Agrupadas por Servidor
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Estructura organizada por servidor con visualización inmediata de campañas vigentes y archivo histórico.
          </p>
        </div>

        {canCreate && onOpenCreateCampaign && (
          <button
            onClick={() => onOpenCreateCampaign(null)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Campaña</span>
          </button>
        )}
      </div>

      {/* ================= TARJETAS KPI DE RESUMEN ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Servidores</div>
            <div className="text-xl font-extrabold text-white font-heading mt-0.5">{summaryStats.totalServers}</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 uppercase font-semibold">Campañas Activas</div>
            <div className="text-xl font-extrabold text-white font-heading mt-0.5">{summaryStats.activeCampaigns}</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-purple-500/20 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-purple-400 uppercase font-semibold">En Historial</div>
            <div className="text-xl font-extrabold text-white font-heading mt-0.5">{summaryStats.historyCampaigns}</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Vistas Totales</div>
            <div className="text-xl font-extrabold text-amber-400 font-heading mt-0.5">
              {summaryStats.totalViews.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl col-span-2 lg:col-span-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Horas Auditadas</div>
            <div className="text-xl font-extrabold text-white font-heading mt-0.5">{summaryStats.totalHours}h</div>
          </div>
        </div>
      </div>

      {/* ================= CONTROLES DE BÚSQUEDA Y FILTRADO ================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por servidor, campaña, streamer, juego u objetivo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Server Selector Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedServerFilter}
            onChange={e => setSelectedServerFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-medium focus:outline-none focus:border-amber-500/60"
          >
            <option value="all">Todos los Servidores ({servers.length})</option>
            {servers.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.game || 'Metin2'})
              </option>
            ))}
          </select>

          {/* Status Quick Filter */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'all' 
                  ? 'bg-amber-500 text-slate-950 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'active' 
                  ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Activas
            </button>
            <button
              onClick={() => setStatusFilter('history')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'history' 
                  ? 'bg-purple-500 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Historial
            </button>
          </div>

          {/* Global Accordion Toggle */}
          <button
            onClick={() => toggleAllHistories(!allHistoriesExpanded)}
            className="hidden sm:flex px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 hover:text-white items-center gap-1.5 transition-colors cursor-pointer"
            title={allHistoriesExpanded ? "Colapsar historiales de todos los servidores" : "Expandir historiales de todos los servidores"}
          >
            <FolderArchive className="w-3.5 h-3.5 text-purple-400" />
            <span>{allHistoriesExpanded ? 'Colapsar Historiales' : 'Expandir Historiales'}</span>
          </button>
        </div>
      </div>

      {/* ================= CONTENEDORES AGRUPADOS POR SERVIDOR ================= */}
      {groupedData.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-500">
            <Target className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">No se encontraron campañas ni servidores</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchTerm || selectedServerFilter !== 'all' || statusFilter !== 'all'
              ? 'Prueba a ajustar tus criterios de búsqueda o limpia los filtros activos.'
              : 'Aún no se han configurado campañas en la plataforma.'}
          </p>
          {(searchTerm || selectedServerFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedServerFilter('all');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl font-bold text-xs inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedData.map(server => {
            const isSuspended = server.status === 'suspended';
            const isPaused = server.status === 'paused';
            const historyExpanded = !!expandedHistories[server.id];

            return (
              <div 
                key={server.id} 
                className={`border rounded-3xl overflow-hidden transition-all shadow-xl ${
                  isSuspended 
                    ? 'bg-slate-900/60 border-red-500/30' 
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700/80'
                }`}
              >
                {/* ---------------- CABECERA DEL SERVIDOR ---------------- */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Server Identity */}
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={server.logo_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120'} 
                      alt={server.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-amber-500/30 shadow-md shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-extrabold text-white font-heading">
                          {server.name}
                        </h4>
                        <span className="text-xs text-amber-400 font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                          {server.game || 'Metin2'}
                        </span>
                        
                        {/* Server Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isSuspended 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : isPaused
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {server.status || 'active'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        {server.assigned_pms && server.assigned_pms.length > 0 ? (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                            <span>PMs: <strong className="text-white">{server.assigned_pms.map(p => p.pm_name || ('@' + p.pm_username)).join(', ')}</strong></span>
                          </span>
                        ) : server.pm_name ? (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                            <span>PM: <strong className="text-white">{server.pm_name}</strong></span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Sin PM asignado</span>
                        )}
                        {server.budget > 0 && (() => {
                          const allocatedBudget = [...(server.activeCampaigns || []), ...(server.historicalCampaigns || [])]
                            .reduce((acc, c) => acc + (parseFloat(c.budget_internal) || 0), 0);
                          const remainingBudget = Math.max(0, (server.budget || 0) - allocatedBudget);
                          return (
                            <>
                              <span className="text-slate-700">•</span>
                              <span className="text-amber-400 font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                Presupuesto Servidor: ${server.budget.toLocaleString()} USD
                              </span>
                              <span className="text-slate-700">•</span>
                              <span className="text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md" title="Presupuesto disponible en el servidor para nuevas campañas">
                                Libre: ${remainingBudget.toLocaleString()} USD
                              </span>
                            </>
                          );
                        })()}
                        <span className="text-slate-700">•</span>
                        <span className="text-emerald-400 font-bold">
                          {server.activeCampaigns.length} {server.activeCampaigns.length === 1 ? 'activa' : 'activas'}
                        </span>
                        <span className="text-slate-700">•</span>
                        <span className="text-purple-400 font-bold">
                          {server.historicalCampaigns.length} en historial
                        </span>
                        {server.totalViews > 0 && (
                          <>
                            <span className="text-slate-700">•</span>
                            <span className="text-slate-300 flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>{server.totalViews.toLocaleString()} vistas</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions on Server */}
                  <div className="flex items-center gap-2">
                    {canCreate && onOpenCreateCampaign && (
                      <button
                        onClick={() => onOpenCreateCampaign(server.id)}
                        disabled={isSuspended}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSuspended
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                        title={isSuspended ? "No se pueden crear campañas en un servidor suspendido" : `Crear nueva campaña para ${server.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nueva Campaña en {server.name}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">

                  {/* ---------------- SECCIÓN 1: CAMPAÑAS ACTIVAS Y VIGENTES ---------------- */}
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Campañas Activas & Vigentes ({server.activeCampaigns.length})
                        </h5>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {server.activeCampaigns.length === 0 ? 'Sin campañas en curso' : 'Transmisiones y accionamiento en marcha'}
                      </span>
                    </div>

                    {server.activeCampaigns.length === 0 ? (
                      <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-center space-y-2">
                        <div className="text-xs text-slate-400">
                          {isSuspended 
                            ? 'El servidor se encuentra suspendido. No hay campañas activas.' 
                            : 'No hay campañas activas en este momento para este servidor.'}
                        </div>
                        {canCreate && !isSuspended && onOpenCreateCampaign && (
                          <button
                            onClick={() => onOpenCreateCampaign(server.id)}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer mt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Crear Primera Campaña</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {server.activeCampaigns.map(camp => (
                          <CampaignCard
                            key={camp.id}
                            campaign={camp}
                            server={server}
                            isHistory={false}
                            userRole={userRole}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            readOnly={readOnly}
                            creatorsList={creatorsList}
                            onOpenEditCampaign={onOpenEditCampaign}
                            onDeleteCampaign={onDeleteCampaign}
                            onToggleStatusCampaign={onToggleStatusCampaign}
                            onAssignCreator={onAssignCreator}
                            onRemoveCreator={onRemoveCreator}
                            onViewDetails={() => setSelectedCampaignDetails(camp)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ---------------- SECCIÓN 2: HISTORIAL DE CAMPAÑAS (ACCORDEÓN) ---------------- */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => toggleHistory(server.id)}
                      className="w-full py-3 px-4 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <FolderArchive className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200 group-hover:text-purple-400 transition-colors flex items-center gap-2">
                            <span>Historial de Campañas Finalizadas de {server.name}</span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                              {server.historicalCampaigns.length}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Campañas concluidas, eventos pasados y métricas acumuladas.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-white">
                        <span>{historyExpanded ? 'Ocultar Historial' : 'Ver Historial'}</span>
                        {historyExpanded ? (
                          <ChevronUp className="w-4 h-4 text-purple-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />
                        )}
                      </div>
                    </button>

                    {/* Contenido expandido del Historial */}
                    {historyExpanded && (
                      <div className="mt-4 space-y-3 pl-1 sm:pl-3">
                        {server.historicalCampaigns.length === 0 ? (
                          <div className="p-5 bg-slate-950/40 border border-slate-800/60 rounded-2xl text-center text-slate-500 text-xs italic">
                            Este servidor aún no cuenta con campañas en su historial histórico.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {server.historicalCampaigns.map(camp => (
                              <CampaignCard
                                key={camp.id}
                                campaign={camp}
                                server={server}
                                isHistory={true}
                                userRole={userRole}
                                canEdit={canEdit}
                                canDelete={canDelete}
                                readOnly={readOnly}
                                creatorsList={creatorsList}
                                onOpenEditCampaign={onOpenEditCampaign}
                                onDeleteCampaign={onDeleteCampaign}
                                onToggleStatusCampaign={onToggleStatusCampaign}
                                onAssignCreator={onAssignCreator}
                                onRemoveCreator={onRemoveCreator}
                                onViewDetails={() => setSelectedCampaignDetails(camp)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: DETALLES DE CAMPAÑA ================= */}
      {selectedCampaignDetails && (
        <CampaignDetailsModal
          campaign={selectedCampaignDetails}
          userRole={userRole}
          onClose={() => setSelectedCampaignDetails(null)}
        />
      )}

    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENTE: TARJETA DE CAMPAÑA (ACTIVA O HISTÓRICA)
// -------------------------------------------------------------
function CampaignCard({
  campaign,
  server,
  isHistory,
  userRole,
  canEdit,
  canDelete,
  readOnly,
  creatorsList,
  onOpenEditCampaign,
  onDeleteCampaign,
  onToggleStatusCampaign,
  onAssignCreator,
  onRemoveCreator,
  onViewDetails
}) {
  const isSuspended = server?.status === 'suspended';
  const isPaused = campaign.status === 'paused';
  const isCompleted = campaign.status === 'completed';
  const isCancelled = campaign.status === 'cancelled' || campaign.deleted_at;

  const creators = Array.isArray(campaign.creators) ? campaign.creators : [];
  const views = parseInt(campaign.campaign_views, 10) || 0;
  const durationMinutes = parseInt(campaign.campaign_duration_minutes, 10) || 0;
  const durationHours = Math.round((durationMinutes / 60) * 10) / 10;
  const evidencesCount = parseInt(campaign.approved_evidences_count || campaign.total_evidences_count, 10) || 0;
  const targetEvsPerCreator = campaign.target_evidences || 0;
  const creatorsCount = creators.length;
  const totalTargetEvs = campaign.total_target_evidences || (creatorsCount > 0 ? targetEvsPerCreator * creatorsCount : targetEvsPerCreator);
  const targetHrs = parseFloat(campaign.target_hours) || 0;
  const evsProgress = totalTargetEvs > 0 ? Math.min(100, Math.round((evidencesCount / totalTargetEvs) * 100)) : null;
  const hrsProgress = targetHrs > 0 ? Math.min(100, Math.round((durationHours / targetHrs) * 100)) : null;

  // Streamers available to assign to this campaign
  const availableToAssign = useMemo(() => {
    if (!creatorsList || creatorsList.length === 0) return [];
    return creatorsList.filter(cr => !creators.some(c => c && (c.user_id === cr.user_id || c.creator_id === cr.user_id)));
  }, [creatorsList, creators]);

  return (
    <div 
      className={`p-5 rounded-2xl border transition-all space-y-4 ${
        isHistory
          ? 'bg-slate-950/70 border-purple-500/20 hover:border-purple-500/40 text-slate-300'
          : isPaused
          ? 'bg-slate-950/90 border-amber-500/30'
          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top row: Status Badge & Action Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isHistory 
              ? isCancelled 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              : isPaused
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {isHistory ? (isCancelled ? 'Cancelada' : 'Finalizada') : isPaused ? 'Pausada' : 'Activa'}
          </span>

          {(campaign.start_date || campaign.end_date) && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3 text-slate-600" />
              <span>
                {campaign.start_date || 'Inicio'} → {campaign.end_date || 'En curso'}
              </span>
            </span>
          )}
        </div>

        {/* Buttons Bar */}
        <div className="flex items-center gap-1">
          {/* View Details */}
          <button
            type="button"
            onClick={onViewDetails}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Ver detalles completos de la campaña"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>

          {!readOnly && canEdit && onToggleStatusCampaign && !isHistory && (
            <>
              {/* Toggle Pause / Resume */}
              <button
                type="button"
                onClick={() => onToggleStatusCampaign(campaign, isPaused ? 'active' : 'paused')}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
                title={isPaused ? "Reanudar Campaña" : "Pausar Campaña temporalmente"}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>

              {/* Complete Campaign (Move to History) */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Deseas finalizar la campaña "${campaign.name}" y archivarla en el Historial del servidor?`)) {
                    onToggleStatusCampaign(campaign, 'completed');
                  }
                }}
                className="p-1.5 hover:bg-purple-500/10 text-slate-400 hover:text-purple-400 rounded-lg transition-colors cursor-pointer"
                title="Finalizar campaña y archivar en Historial"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>

              {/* Edit */}
              {onOpenEditCampaign && (
                <button
                  type="button"
                  onClick={() => onOpenEditCampaign(campaign)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Editar Campaña"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          {/* Reactivate if in History */}
          {!readOnly && canEdit && onToggleStatusCampaign && isHistory && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Reactivar la campaña "${campaign.name}" para ponerla en curso de nuevo?`)) {
                  onToggleStatusCampaign(campaign, 'active');
                }
              }}
              className="p-1.5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
              title="Reactivar campaña a estado Activa"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete */}
          {!readOnly && canDelete && onDeleteCampaign && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Seguro que deseas eliminar la campaña "${campaign.name}"?`)) {
                  onDeleteCampaign(campaign.id);
                }
              }}
              className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Eliminar Campaña"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Campaign Info */}
      <div>
        <h5 className="text-sm font-bold text-white leading-tight">
          {campaign.name}
        </h5>
        {campaign.objective && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {campaign.objective}
          </p>
        )}
        
        {campaign.requirements && (
          <div className="mt-2 text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
            <span className="font-semibold text-amber-400">Requisitos: </span>
            <span className="line-clamp-2">{campaign.requirements}</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
        <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800/60 text-center">
          <span className="text-[10px] text-slate-500 block uppercase font-bold">Vistas</span>
          <span className="font-extrabold text-amber-400 text-xs">
            {views.toLocaleString()}
          </span>
        </div>

        <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800/60 text-center flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Directos Totales</span>
            <span className="font-extrabold text-white text-xs">
              {totalTargetEvs > 0 ? `${evidencesCount}/${totalTargetEvs}` : evidencesCount}
            </span>
          </div>
          {totalTargetEvs > 0 && (
            <div>
              <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden" title={`Progreso: ${evsProgress}%`}>
                <div 
                  className={`h-1 rounded-full ${evsProgress >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`} 
                  style={{ width: `${evsProgress}%` }} 
                />
              </div>
              {creatorsCount > 1 && (
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  ({targetEvsPerCreator} c/u × {creatorsCount} stream.)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800/60 text-center flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Horas</span>
            <span className="font-extrabold text-emerald-400 text-xs">
              {targetHrs > 0 ? `${durationHours}h/${targetHrs}h` : `${durationHours}h`}
            </span>
          </div>
          {targetHrs > 0 && (
            <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden" title={`Progreso: ${hrsProgress}%`}>
              <div 
                className={`h-1 rounded-full ${hrsProgress >= 100 ? 'bg-emerald-400' : 'bg-blue-400'}`} 
                style={{ width: `${hrsProgress}%` }} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Budget & P&L Info (visible only to Admin & PM) */}
      {(userRole === 'super_admin' || userRole === 'pm' || userRole === 'director_ops') && (
        <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-1 text-slate-400">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                {campaign.assigned_pms && campaign.assigned_pms.length > 1 ? 'PMs a Cargo:' : 'PM a Cargo:'}
              </span>
              {campaign.assigned_pms && campaign.assigned_pms.length > 0 ? (
                <div className="flex items-center gap-1 flex-wrap">
                  {campaign.assigned_pms.map((p, pIdx) => (
                    <span key={p.pm_id || pIdx} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded text-[10px] font-semibold">
                      {p.pm_name}
                    </span>
                  ))}
                </div>
              ) : (
                <strong className="text-slate-300">{campaign.pm_name || 'No asignado'}</strong>
              )}
            </div>
            {campaign.budget_internal !== undefined && (
              <span className="text-[11px]">Presupuesto Campaña: <strong className="text-emerald-400 font-mono font-bold">${campaign.budget_internal}</strong></span>
            )}
          </div>

          {campaign.financials && (
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block uppercase font-bold">Streamers</span>
                  <span className="font-extrabold text-orange-400 font-mono text-[11px]">
                    -${campaign.financials.paid_streamers_expense !== undefined ? campaign.financials.paid_streamers_expense : campaign.financials.paid_expense || 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold">Honorario PM</span>
                  <span className="font-extrabold text-blue-400 font-mono text-[11px]">
                    {campaign.financials.paid_pm_expense > 0 
                      ? `-$${campaign.financials.paid_pm_expense}` 
                      : (campaign.financials.pm_fee > 0 ? `$${campaign.financials.pm_fee} (al cierre)` : '$0.00')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold">Consumido</span>
                  <span className="font-extrabold text-amber-400 font-mono text-[11px]">
                    ${campaign.financials.total_spent !== undefined ? campaign.financials.total_spent : campaign.financials.paid_expense || 0}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-400 block uppercase font-bold">No Usado / Ganancia</span>
                  <span className={`font-black font-mono text-[11px] ${
                    campaign.financials.is_profitable ? 'text-emerald-300' : 'text-red-400'
                  }`}>
                    {campaign.financials.net_profit >= 0 ? '+' : ''}${campaign.financials.net_profit}
                  </span>
                </div>
              </div>

              {/* Barra de Consumo de Presupuesto */}
              {campaign.financials.budget > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      Presupuesto Usado: <strong className="text-white">{campaign.financials.budget_execution_percentage || 0}%</strong>
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Margen Ganancia: {campaign.financials.profit_margin_percentage || 0}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        (campaign.financials.budget_execution_percentage || 0) > 100 
                          ? 'bg-red-500' 
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{ width: `${Math.min(100, campaign.financials.budget_execution_percentage || 0)}%` }}
                    />
                    <div 
                      className="h-full bg-emerald-500/60 transition-all duration-300"
                      style={{ width: `${Math.max(0, 100 - (campaign.financials.budget_execution_percentage || 0))}%` }}
                      title="Presupuesto no usado (Ganancia para el servidor)"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Streamers & Individual Delivery Progress */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Streamers ({creators.length}):
            </span>
            {targetEvsPerCreator > 0 && (
              <span className="text-[10px] text-amber-400 font-semibold">
                (Meta: {targetEvsPerCreator} {targetEvsPerCreator === 1 ? 'directo' : 'directos'} c/u)
              </span>
            )}
          </div>

          {/* Add creator selector (if not readOnly and active) */}
          {!readOnly && canEdit && !isHistory && onAssignCreator && availableToAssign.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onAssignCreator(campaign.id, e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-amber-400 focus:outline-none cursor-pointer"
            >
              <option value="">+ Accionar Streamer</option>
              {availableToAssign.map(cr => (
                <option key={cr.user_id} value={cr.user_id}>
                  {cr.alias || cr.full_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {creators.length === 0 ? (
          <span className="text-[11px] text-slate-500 italic block">No hay streamers accionados en esta campaña.</span>
        ) : (
          <div className="space-y-1.5">
            {creators.map(cr => {
              const targetIndividual = cr.target_evidences || targetEvsPerCreator || 0;
              const completedIndividual = cr.approved_evidences || 0;
              const pctIndividual = targetIndividual > 0 ? Math.min(100, Math.round((completedIndividual / targetIndividual) * 100)) : null;
              const isDone = targetIndividual > 0 && completedIndividual >= targetIndividual;

              return (
                <div 
                  key={cr.user_id || cr.creator_id || Math.random()}
                  className="p-2 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isDone ? 'bg-emerald-400' : completedIndividual > 0 ? 'bg-amber-400' : 'bg-slate-500'}`} />
                    <div className="truncate">
                      <span className="font-semibold text-white block truncate">{cr.alias || cr.full_name}</span>
                      <span className="text-[10px] text-slate-400">
                        {cr.hours_streamed ? `${cr.hours_streamed}h transmitidas` : '0h transmitidas'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-bold text-white font-mono text-[11px]">
                        {targetIndividual > 0 ? `${completedIndividual}/${targetIndividual}` : completedIndividual}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">directos</span>
                      {targetIndividual > 0 && (
                        <div className="w-16 bg-slate-800 rounded-full h-1 mt-0.5 overflow-hidden">
                          <div 
                            className={`h-1 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-amber-400'}`}
                            style={{ width: `${pctIndividual || 0}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      isDone 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : completedIndividual > 0 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isDone ? 'Completado' : completedIndividual > 0 ? `${pctIndividual}%` : 'Pendiente'}
                    </span>

                    {!readOnly && canEdit && !isHistory && onRemoveCreator && (
                      <button
                        type="button"
                        onClick={() => onRemoveCreator(campaign.id, cr.user_id || cr.creator_id)}
                        className="text-slate-500 hover:text-red-400 text-xs cursor-pointer font-bold leading-none p-1 hover:bg-slate-800 rounded"
                        title="Desvincular streamer de esta campaña"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENTE: MODAL DE DETALLES DE CAMPAÑA
// -------------------------------------------------------------
function CampaignDetailsModal({ campaign, userRole, onClose }) {
  if (!campaign) return null;

  const creators = Array.isArray(campaign.creators) ? campaign.creators : [];
  const views = parseInt(campaign.campaign_views, 10) || 0;
  const durationMinutes = parseInt(campaign.campaign_duration_minutes, 10) || 0;
  const durationHours = Math.round((durationMinutes / 60) * 10) / 10;
  const evidencesCount = parseInt(campaign.approved_evidences_count || campaign.total_evidences_count, 10) || 0;
  const targetEvsPerCreator = campaign.target_evidences || 0;
  const creatorsCount = creators.length;
  const totalTargetEvs = campaign.total_target_evidences || (creatorsCount > 0 ? targetEvsPerCreator * creatorsCount : targetEvsPerCreator);
  const targetHrs = parseFloat(campaign.target_hours) || 0;
  const evsProgress = totalTargetEvs > 0 ? Math.min(100, Math.round((evidencesCount / totalTargetEvs) * 100)) : null;
  const hrsProgress = targetHrs > 0 ? Math.min(100, Math.round((durationHours / targetHrs) * 100)) : null;
  const isHistory = campaign.status === 'completed' || campaign.status === 'cancelled' || campaign.deleted_at;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              isHistory ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {campaign.status}
            </span>
            <h4 className="text-lg font-bold text-white font-heading mt-1">
              {campaign.name}
            </h4>
            <div className="text-xs text-amber-400 font-semibold">
              Servidor: {campaign.server_name} ({campaign.server_game || 'Metin2'})
            </div>
          </div>
        </div>

        {/* Performance metrics grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Vistas Generadas</span>
            <div className="text-lg font-extrabold text-amber-400 mt-0.5">{views.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Horas en Directo</span>
            <div className="text-lg font-extrabold text-emerald-400 mt-0.5">
              {campaign.target_hours > 0 ? `${durationHours}h / ${campaign.target_hours}h` : `${durationHours}h`}
            </div>
            {campaign.target_hours > 0 && (
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                {Math.min(100, Math.round((durationHours / campaign.target_hours) * 100))}% del cupo
              </span>
            )}
          </div>
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Directos Auditados</span>
            <div className="text-lg font-extrabold text-white mt-0.5">
              {campaign.target_evidences > 0 ? `${evidencesCount} / ${campaign.target_evidences}` : evidencesCount}
            </div>
            {campaign.target_evidences > 0 && (
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                {Math.min(100, Math.round((evidencesCount / campaign.target_evidences) * 100))}% del cupo
              </span>
            )}
          </div>
        </div>

        {/* Objectives & Requirements */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase">Objetivo de la Campaña:</label>
            <p className="mt-1 p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
              {campaign.objective || 'Sin objetivo especificado.'}
            </p>
          </div>

          {campaign.requirements && (
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase">Requisitos de la Campaña:</label>
              <p className="mt-1 p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                {campaign.requirements}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-slate-400">
            <div>
              <span className="text-[10px] font-bold uppercase block text-slate-500">Fecha Inicio:</span>
              <span className="text-white font-medium">{campaign.start_date || 'No definida'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase block text-slate-500">Fecha Fin:</span>
              <span className="text-white font-medium">{campaign.end_date || 'No definida'}</span>
            </div>
          </div>

          {(userRole === 'super_admin' || userRole === 'pm') && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase block text-slate-500">
                  {campaign.assigned_pms && campaign.assigned_pms.length > 1 ? 'PMs a Cargo:' : 'PM a Cargo:'}
                </span>
                {campaign.assigned_pms && campaign.assigned_pms.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {campaign.assigned_pms.map((p, pIdx) => (
                      <span key={p.pm_id || pIdx} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded text-xs font-semibold">
                        {p.pm_name} {p.pm_email ? `(${p.pm_email})` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-white font-medium">{campaign.pm_name || 'No asignado'}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase block text-slate-500">Presupuesto Interno:</span>
                <span className="text-emerald-400 font-bold">${campaign.budget_internal}</span>
              </div>
            </div>
          )}
        </div>

        {/* Streamers & Detailed Delivery Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Avance de Entregas por Streamer ({creators.length}):
            </label>
            {targetEvsPerCreator > 0 && (
              <span className="text-[11px] text-amber-400 font-semibold">
                Meta: {targetEvsPerCreator} directos c/u ({totalTargetEvs} directos totales de campaña)
              </span>
            )}
          </div>

          {creators.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
              No hay streamers vinculados a esta campaña.
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Streamer</th>
                    <th className="p-2.5 text-center">Directos Cumplidos</th>
                    <th className="p-2.5 text-center">Horas</th>
                    <th className="p-2.5 text-center">Vistas</th>
                    <th className="p-2.5 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {creators.map(cr => {
                    const targetInd = cr.target_evidences || targetEvsPerCreator || 0;
                    const doneInd = cr.approved_evidences || 0;
                    const pctInd = targetInd > 0 ? Math.min(100, Math.round((doneInd / targetInd) * 100)) : null;
                    const isDone = targetInd > 0 && doneInd >= targetInd;

                    return (
                      <tr key={cr.user_id || cr.creator_id || Math.random()} className="hover:bg-slate-900/40">
                        <td className="p-2.5">
                          <div className="font-bold text-white">{cr.alias || cr.full_name}</div>
                          {cr.alias && cr.full_name && cr.alias !== cr.full_name && (
                            <div className="text-[10px] text-slate-500">{cr.full_name}</div>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="font-bold text-white font-mono text-xs">
                            {targetInd > 0 ? `${doneInd} / ${targetInd}` : doneInd}
                          </span>
                          {targetInd > 0 && (
                            <div className="w-16 bg-slate-800 rounded-full h-1 mt-1 mx-auto overflow-hidden">
                              <div 
                                className={`h-1 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                style={{ width: `${pctInd || 0}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-300">
                          {cr.hours_streamed ? `${cr.hours_streamed}h` : '0h'}
                        </td>
                        <td className="p-2.5 text-center font-mono text-amber-400">
                          {(cr.total_views || 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isDone 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : doneInd > 0 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isDone ? 'Completado' : doneInd > 0 ? `${pctInd}%` : 'Sin iniciar'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>

      </div>
    </div>
  );
}
