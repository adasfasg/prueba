import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, ExternalLink, CheckCircle, Clock, Sparkles, 
  Tv, Video, Send, ShieldAlert 
} from 'lucide-react';

export default function PublicCreatorCatalog({ onSelectCreatorForContact }) {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState('Todos');
  const [selectedPlatform, setSelectedPlatform] = useState('Todas');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const gamesList = ['Todos', 'Metin2', 'MU Online', 'Lineage II'];
  const platformsList = ['Todas', 'Twitch', 'YouTube', 'TikTok'];

  useEffect(() => {
    async function loadCreators() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedGame !== 'Todos') queryParams.append('game', selectedGame);
        if (selectedPlatform !== 'Todas') queryParams.append('platform', selectedPlatform);
        if (onlyAvailable) queryParams.append('available', 'true');

        const res = await fetch(`/api/public/creators?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setCreators(data);
        }
      } catch (err) {
        console.error('Error fetching public creators:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCreators();
  }, [selectedGame, selectedPlatform, onlyAvailable]);

  // Client-side search filtering
  const filtered = creators.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return c.alias.toLowerCase().includes(term) || (c.bio && c.bio.toLowerCase().includes(term));
  });

  return (
    <section id="creadores" className="py-24 relative overflow-hidden bg-slate-950">
      {/* Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Talento Exclusivo & Verificado</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-heading tracking-wide">
            Catálogo Oficial de <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Creadores</span>
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
            Explora nuestros streamers y creadores de contenido especializados en Metin2 y gaming. Conectamos a los mejores talentos con tu servidor privado.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl mb-10 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por alias o especialidad..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Game Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {gamesList.map(game => (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    selectedGame === game 
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {game}
                </button>
              ))}
            </div>

            {/* Platform Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {platformsList.map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    selectedPlatform === p 
                      ? 'bg-orange-500 text-white shadow-md font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Availability Toggle */}
            <button
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                onlyAvailable
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${onlyAvailable ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              <span>Solo Disponibles</span>
            </button>
          </div>

        </div>

        {/* Creators Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800/50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <ShieldAlert className="w-10 h-10 text-amber-500/60 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white">No se encontraron creadores</h4>
            <p className="text-xs text-slate-400 mt-1">Prueba a modificar los filtros seleccionados o el término de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(creator => (
              <div 
                key={creator.id}
                className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/5 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Header: Avatar + Status */}
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <img
                        src={creator.avatar_url || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200'}
                        alt={creator.alias}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 group-hover:border-amber-400/80 transition-colors shadow-md"
                      />
                      <span 
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                          creator.is_available ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        title={creator.is_available ? 'Disponible para campañas' : 'Ocupado en campaña activa'}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                          {creator.alias}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          creator.is_available 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {creator.is_available ? 'Disponible' : 'Campaña en curso'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="mt-4 text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    {creator.bio}
                  </p>

                  {/* Games Tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {creator.games.map(g => (
                      <span key={g} className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-300 rounded-md border border-amber-500/20">
                        {g}
                      </span>
                    ))}
                    {creator.platforms.map(p => (
                      <span key={p} className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300 rounded-md">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Footer: Social Links + Action */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  {/* Social icons */}
                  <div className="flex items-center gap-2">
                    {creator.social_links.twitch && (
                      <a 
                        href={creator.social_links.twitch} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-purple-950/40 text-purple-400 hover:text-purple-300 border border-slate-800 transition-all"
                        title="Ver Canal de Twitch"
                      >
                        <Tv className="w-4 h-4" />
                      </a>
                    )}
                    {creator.social_links.youtube && (
                      <a 
                        href={creator.social_links.youtube} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-slate-800 transition-all"
                        title="Ver Canal de YouTube"
                      >
                        <Video className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Request creator button */}
                  <button
                    onClick={() => onSelectCreatorForContact(creator)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 hover:border-amber-400 text-xs font-bold rounded-xl transition-all"
                  >
                    <span>Contratar</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
