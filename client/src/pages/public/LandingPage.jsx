import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import LoginModal from '../../components/LoginModal';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Flame, Gamepad2, ShieldCheck, Target, Users, BarChart3, 
  Send, Sparkles, CheckCircle2, ChevronRight, MessageSquare, 
  Trophy, ArrowUpRight, Zap, PlayCircle, Star, Palette, Monitor, 
  Layers, ExternalLink, Image as ImageIcon, Eye, Smartphone, Check
} from 'lucide-react';

export default function LandingPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { lang, t } = useLanguage();
  const [selectedDesignModal, setSelectedDesignModal] = useState(null);

  const [stats, setStats] = useState({
    total_creators: 12,
    total_servers: 8,
    total_stream_hours: 142,
    total_views: 48920
  });

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    server_name: '',
    game: 'Metin2',
    message: ''
  });
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    fetch('/api/public/stats')
      .then(res => res.json())
      .then(data => { if (data.total_creators) setStats(data); })
      .catch(() => {});
  }, []);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });
      if (res.ok) {
        setContactSuccess(true);
        setContactForm({ name: '', email: '', server_name: '', game: 'Metin2', message: '' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContactLoading(false);
    }
  };

  // Web Designs Gallery for Servers (from assets/diseño1 to diseño6)
  const serverDesigns = [
    {
      id: 1,
      title: lang === 'es' ? 'Portal Oficial & Sistema de Ranking' : 'Official Portal & Leaderboard System',
      category: 'Portal Web',
      image: '/assets/diseño1.png',
      desc: lang === 'es' 
        ? 'Sitio web integral con tablas de clasificación PvP/PvE en vivo, panel de jugador y tienda web de monedas.' 
        : 'Full web portal featuring live PvP/PvE leaderboards, player control panel, and virtual currency shop.'
    },
    {
      id: 2,
      title: lang === 'es' ? 'Landing Page Épica de Apertura' : 'Cinematic Launch Landing Page',
      category: 'Landing Page',
      image: '/assets/diseño2.jpg',
      desc: lang === 'es'
        ? 'Página de presentación con cuenta atrás, descarga directa de instalador y pre-registro para lanzamientos.'
        : 'High-converting launch page with countdown timer, direct client downloads, and pre-registration.'
    },
    {
      id: 3,
      title: lang === 'es' ? 'Panel de Usuario & Descargas Ultra Rápidas' : 'User Dashboard & High-Speed Downloads',
      category: 'UI / UX',
      image: '/assets/diseño3.jpg',
      desc: lang === 'es'
        ? 'Diseño moderno y oscuro pensado para jugadores, con integración de parches automáticos y guías del juego.'
        : 'Sleek dark theme optimized for gaming communities, featuring automatic patch delivery and game guides.'
    },
    {
      id: 4,
      title: lang === 'es' ? 'Diseño Temático OldSchool & MidSchool' : 'Themed OldSchool & MidSchool Theme',
      category: 'Custom Brand',
      image: '/assets/diseño4.jpg',
      desc: lang === 'es'
        ? 'Identidad visual personalizada con estética clásica medieval, banners oficiales y adaptación responsive total.'
        : 'Custom visual identity with classic medieval fantasy art, official banners, and responsive layouts.'
    },
    {
      id: 5,
      title: lang === 'es' ? 'Portal Comunitario & Torneos de Gremios' : 'Community Hub & Guild Tournaments',
      category: 'E-Sports Portal',
      image: '/assets/diseño5.jpg',
      desc: lang === 'es'
        ? 'Especial para eventos competitivos, premios en vivo, vinculación con Discord y transmisiones destacadas.'
        : 'Built for competitive guild wars, live prize tracking, Discord sync, and featured stream highlights.'
    },
    {
      id: 6,
      title: lang === 'es' ? 'Tienda Automatizada & Soporte VIP' : 'Automated Webshop & VIP Support',
      category: 'E-Commerce',
      image: '/assets/diseño6.jpg',
      desc: lang === 'es'
        ? 'Módulo de donaciones seguras, entrega inmediata de ítems dentro del juego y sección de preguntas frecuentes.'
        : 'Secure donation gateway, instant in-game item delivery, and automated player FAQ center.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      
      {/* Navbar */}
      <Navbar onOpenLogin={() => setLoginModalOpen(true)} />

      {/* ========================================================
          1. HERO SECTION (Página 1: Textos exactos requeridos)
      ======================================================== */}
      <section id="inicio" className="relative pt-32 pb-24 overflow-hidden border-b border-slate-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            
            {/* Official Badge (Requerimiento Página 1) */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 shadow-lg shadow-amber-500/10 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                {t.hero.badge}
              </span>
            </div>

            {/* Main Headline (Requerimiento Página 1) */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-heading tracking-tight leading-[1.08] text-white">
              {lang === 'es' ? (
                <>
                  Conectamos creadores. <br />
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                    Impulsamos servidores.
                  </span> <br />
                  Medimos resultados.
                </>
              ) : (
                <>
                  Connecting creators. <br />
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                    Empowering servers.
                  </span> <br />
                  Measuring results.
                </>
              )}
            </h1>

            {/* Subheading (Requerimiento Página 1) */}
            <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              {t.hero.description}
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#contacto"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <span>{t.hero.ctaContact}</span>
                <ChevronRight className="w-4 h-4" />
              </a>

              <a
                href="#servicios"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <span>{t.hero.ctaServices}</span>
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">+{stats.total_creators}</div>
                <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">{t.hero.stats.streamers}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-heading">+{stats.total_servers}</div>
                <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">{t.hero.stats.servers}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-orange-400 font-heading">+{stats.total_stream_hours}h</div>
                <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">{t.hero.stats.hours}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-heading">+{stats.total_views.toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">{t.hero.stats.views}</div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ========================================================
          2. ¿QUIÉNES SOMOS? (Página 3: Texto exacto provisto)
      ======================================================== */}
      <section id="quienes-somos" className="py-24 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950 border-b border-slate-900 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.about.badge}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight mb-6">
              {t.about.title}
            </h2>

            <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              <p className="font-semibold text-white text-base sm:text-lg">
                {t.about.p1}
              </p>
              <p className="text-slate-400">
                {t.about.p2}
              </p>
              <div className="p-5 bg-slate-950/70 border-l-4 border-amber-500 rounded-r-2xl my-4">
                <p className="text-slate-200 font-medium">
                  {t.about.p3}
                </p>
              </div>
              <p className="text-slate-400">
                {t.about.p4}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <span className="text-base sm:text-lg font-extrabold tracking-wide bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                {t.about.highlight}
              </span>
              <a
                href="#contacto"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>{lang === 'es' ? 'Trabaja con Nosotros' : 'Work with Us'}</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

          </div>

        </div>
      </section>


      {/* ========================================================
          3. SERVICIOS INTEGRALES (Página 1: Con Publicidad en Redes)
      ======================================================== */}
      <section id="servicios" className="py-24 border-b border-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t.services.badge}</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white mt-2">
              {t.services.title}
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              {t.services.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1 */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{t.services.items[0].title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t.services.items[0].desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-amber-400 font-bold">
                <span>{lang === 'es' ? 'Talento Filtrado' : 'Vetted Talent'}</span>
              </div>
            </div>

            {/* Card 2 (NUEVA: Publicidad en Redes Sociales requerida en Página 1) */}
            <div className="p-6 bg-gradient-to-b from-amber-500/10 to-slate-900 border border-amber-500/40 rounded-2xl relative group flex flex-col justify-between shadow-lg shadow-amber-500/5">
              <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500 text-slate-950">
                {lang === 'es' ? 'Gran Alcance' : 'High Reach'}
              </span>
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{t.services.items[1].title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{t.services.items[1].desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-amber-500/20 flex items-center text-xs text-amber-300 font-bold">
                <span>TikTok • Shorts • Reels • Discord</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{t.services.items[2].title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t.services.items[2].desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-amber-400 font-bold">
                <span>{lang === 'es' ? 'Gestión Directa' : 'Direct Management'}</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{t.services.items[3].title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t.services.items[3].desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-amber-400 font-bold">
                <span>{lang === 'es' ? 'Evidencias con Capturas' : 'Photo Proof & VODs'}</span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ========================================================
          4. DISEÑO WEB PARA SERVIDORES (Página 2: Reemplaza catálogo público)
      ======================================================== */}
      <section id="diseno-web" className="py-24 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950 border-b border-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t.webDesign.badge}</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white mt-2">
                {t.webDesign.title}
              </h2>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                {t.webDesign.subtitle}
              </p>
            </div>
            <a
              href="#contacto"
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-400 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all self-start md:self-auto flex items-center gap-2"
            >
              <span>{lang === 'es' ? 'Solicitar Presupuesto Web' : 'Request Web Quote'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>

          {/* Web Design Features Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {t.webDesign.features.map((feat, idx) => (
              <div key={idx} className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{feat.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Showcase Grid with Real Assets (diseño1 to diseño6) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serverDesigns.map((des) => (
              <div 
                key={des.id} 
                className="group bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden shadow-xl transition-all flex flex-col justify-between"
              >
                <div className="relative overflow-hidden aspect-[16/10] bg-slate-950 cursor-pointer" onClick={() => setSelectedDesignModal(des)}>
                  <img 
                    src={des.image} 
                    alt={des.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600';
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg">
                      <Eye className="w-4 h-4" />
                      <span>{lang === 'es' ? 'Ver Diseño Completo' : 'View Full Design'}</span>
                    </span>
                  </div>
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 text-amber-400 border border-amber-500/30">
                    {des.category}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                      {des.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {des.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedDesignModal(des)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{lang === 'es' ? 'Ampliar captura' : 'Enlarge view'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <a
                      href="#contacto"
                      className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded-lg text-xs font-bold transition-all"
                    >
                      {lang === 'es' ? 'Cotizar' : 'Inquire'}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>


      {/* ========================================================
          5. SHOWCASE DEL HUB DEL PROMOTOR (Página 4)
      ======================================================== */}
      <section id="hub-promotor" className="py-24 border-b border-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t.hub.badge}</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white mt-2">
              {t.hub.title}
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              {t.hub.subtitle}
            </p>
          </div>

          {/* Interactive Mockup Container */}
          <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-8 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Window Topbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs text-slate-400 font-mono">pmforgex.internal / hub / operator-dashboard</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {t.hub.tag}
              </span>
            </div>

            {/* Dashboard Mockup Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">{t.hub.card1}</span>
                <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>8 Streams En Vivo</span>
                </div>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">{t.hub.card2}</span>
                <div className="text-xl font-bold text-amber-400 mt-1">24 Validadas Hoy</div>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">{t.hub.card3}</span>
                <div className="text-xl font-bold text-orange-400 mt-1">3,420 Viewers Pico</div>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">{t.hub.card4}</span>
                <div className="text-xl font-bold text-white mt-1">100% Cumplidas</div>
              </div>
            </div>

            {/* Simulated Live Audit Row */}
            <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">DragonSlayer MT2 • Twitch Directo</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Aprobado</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Campaña: Apertura Servidor Astra2 Classic • Duración: 3.2 horas • 540 viewers</p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end lg:self-auto">
                <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Captura Verificada por PM Carlos</span>
                </span>
                <button 
                  onClick={() => setLoginModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'es' ? 'Acceder al Panel' : 'Access Portal'}
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ========================================================
          6. CÓMO FUNCIONA (Página 2: Con Publicidad en Redes Sociales)
      ======================================================== */}
      <section id="como-funciona" className="py-24 border-b border-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t.steps.badge}</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white mt-2">
              {t.steps.title}
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              {t.steps.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.steps.items.map((step, idx) => (
              <div key={idx} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl relative group hover:border-amber-500/40 transition-all">
                <span className="text-4xl font-extrabold text-amber-500/20 group-hover:text-amber-500/40 transition-colors font-mono block mb-3">
                  {step.num}
                </span>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>


      {/* ========================================================
          7. FORMULARIO DE CONTACTO COMERCIAL
      ======================================================== */}
      <section id="contacto" className="py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="p-8 sm:p-12 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t.contact.badge}</span>
              <h2 className="text-3xl font-extrabold font-heading text-white mt-2">
                {t.contact.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                {t.contact.desc}
              </p>
            </div>

            {contactSuccess ? (
              <div className="p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">{lang === 'es' ? '¡Solicitud Enviada!' : 'Request Sent!'}</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">{t.contact.success}</p>
                <button
                  type="button"
                  onClick={() => setContactSuccess(false)}
                  className="mt-4 px-6 py-2 bg-emerald-500 text-slate-950 font-bold text-xs uppercase rounded-xl"
                >
                  {lang === 'es' ? 'Enviar otro mensaje' : 'Send another inquiry'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1">{t.contact.name}</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Ej. Roberto Díaz"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1">{t.contact.serverName}</label>
                    <input
                      type="text"
                      required
                      value={contactForm.server_name}
                      onChange={e => setContactForm({ ...contactForm, server_name: e.target.value })}
                      placeholder="Ej. Astra2 International"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="contacto@servidor.com"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1">{t.contact.game}</label>
                    <select
                      value={contactForm.game}
                      onChange={e => setContactForm({ ...contactForm, game: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-500"
                    >
                      <option value="Metin2">Metin2</option>
                      <option value="MU Online">MU Online</option>
                      <option value="Minecraft">Minecraft</option>
                      <option value="GTA RP">GTA RP</option>
                      <option value="Lineage II">Lineage II</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">{t.contact.message}</label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder={lang === 'es' ? 'Explícanos sobre tu servidor, fechas estimadas de apertura y qué servicios requieres (streamers, redes sociales, diseño web)...' : 'Tell us about your server, timeline, and requested services (creators, social media advertising, web design)...'}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactLoading}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{contactLoading ? (lang === 'es' ? 'Enviando...' : 'Sending...') : t.contact.sendBtn}</span>
                </button>
              </form>
            )}

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-white text-base">PMFORGEX</span>
            <span>—</span>
            <span>{lang === 'es' ? 'Agencia de Creadores & Servidores Privados' : 'Creator & Private Server Agency'}</span>
          </div>
          <div>
            © 2026 PMForgeX. {lang === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
          </div>
        </div>
      </footer>

      {/* Modal para ampliar captura de diseño web */}
      {selectedDesignModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          onClick={() => setSelectedDesignModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">{selectedDesignModal.title}</h4>
                <span className="text-xs text-amber-400">{selectedDesignModal.category}</span>
              </div>
              <button 
                onClick={() => setSelectedDesignModal(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-2 bg-slate-950 flex items-center justify-center">
              <img 
                src={selectedDesignModal.image} 
                alt={selectedDesignModal.title} 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Login & 2FA Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

    </div>
  );
}
