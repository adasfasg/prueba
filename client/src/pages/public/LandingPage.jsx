import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import PublicCreatorCatalog from '../../components/PublicCreatorCatalog';
import LoginModal from '../../components/LoginModal';
import { 
  Flame, Gamepad2, ShieldCheck, Target, Users, BarChart3, 
  Send, Sparkles, CheckCircle2, ChevronRight, MessageSquare, 
  Trophy, ArrowUpRight, Zap, PlayCircle, Star
} from 'lucide-react';

export default function LandingPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total_creators: 3,
    total_servers: 3,
    total_stream_hours: 15,
    total_views: 7480
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

  const handleSelectCreatorForContact = (creator) => {
    setContactForm(prev => ({
      ...prev,
      message: `Hola PMForgeX, nos interesa contratar al creador ${creator.alias} para nuestro servidor.`
    }));
    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      
      {/* Navbar */}
      <Navbar onOpenLogin={() => setLoginModalOpen(true)} />

      {/* Hero Section */}
      <section id="inicio" className="relative pt-32 pb-24 overflow-hidden">
        {/* Background glow & mesh */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            
            {/* Official Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 shadow-lg shadow-amber-500/10 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                Agencia Oficial de Creadores & Servidores Metin2
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-heading tracking-tight leading-[1.08] text-white">
              Conectamos los Mejores <br />
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                Streamers con Servidores Privados
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              La plataforma profesional que organiza campañas publicitarias, supervisa horas y directos con Promoter Managers dedicados, y entrega métricas y evidencias verificables.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#creadores"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Explorar Catálogo de Creadores</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#contacto"
                className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Contratar Campaña</span>
              </a>
            </div>

            {/* KPI Counter Cards */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                  +{stats.total_creators}
                </div>
                <div className="text-xs text-slate-400 uppercase font-semibold mt-1">Creadores Verificados</div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-heading">
                  +{stats.total_servers}
                </div>
                <div className="text-xs text-slate-400 uppercase font-semibold mt-1">Servidores Activos</div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl font-extrabold text-orange-400 font-heading">
                  +{stats.total_stream_hours}h
                </div>
                <div className="text-xs text-slate-400 uppercase font-semibold mt-1">Horas Transmitidas</div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-heading">
                  +{stats.total_views}
                </div>
                <div className="text-xs text-slate-400 uppercase font-semibold mt-1">Visualizaciones</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Servicios Section (Sección 4.2) */}
      <section id="servicios" className="py-20 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Servicios Integrales</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading mt-2">
              Todo lo que tu Servidor Necesita para Crecer
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Coordinamos toda la operativa comercial para que los administradores de servidores se enfoquen en su juego.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Servicio 1 */}
            <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all hover:shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Gestión de Streamers & Creadores</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seleccionamos y coordinamos creadores de alto impacto y reputación. Establecemos calendarios de directos y pautas de contenido adaptadas al estilo de tu servidor.
              </p>
            </div>

            {/* Servicio 2 */}
            <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all hover:shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Coordinación de PMs Dedicados</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Un Promoter Manager profesional a cargo de supervisar el cumplimiento de horas, verificar directos, mantener comunicación fluida y resolver cualquier incidencia.
              </p>
            </div>

            {/* Servicio 3 */}
            <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all hover:shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Auditoría, Métricas & Evidencias</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cero promesas vacías. Cada directo y video se registra con VOD, capturas, pico de espectadores y minutos transmitidos, visibles en tiempo real para el cliente.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Ecosistemas / Juegos (Sección 4.3) */}
      <section id="ecosistemas" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Ecosistemas de Juego</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading mt-2">
              Metin2 como Núcleo & Nuevos Universos
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Especialistas nativos en la dinámica de servidores privados y comunidades competitivas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Metin2 Card */}
            <div className="p-8 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-3xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-amber-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-lg">
                  Ecosistema Principal
                </span>
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-3xl font-extrabold text-white font-heading mb-2">Metin2 Servidores Privados</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Especialización profunda en servidores OldSchool, MidSchool y NewSchool. Campañas para aperturas de servidor, torneos PvP 1v1, guerras de gremios y eventos de drop.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Guerras de Gremios', 'Aperturas / Lanzamientos', 'Directos PvP', 'Tutoriales PvE', 'Shorts Virales'].map(t => (
                  <span key={t} className="px-2.5 py-1 bg-slate-950/80 border border-amber-500/30 text-amber-300 text-[11px] font-semibold rounded-md">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Upcoming Ecosystems */}
            <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-lg">
                    Próxima Expansión
                  </span>
                  <Gamepad2 className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-3xl font-extrabold text-white font-heading mb-2">Multi-Gaming Ecosistema</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Nuestra arquitectura modular está preparada para incorporar comunidades con dinámicas comerciales análogas.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {['MU Online', 'Minecraft Servidores', 'GTA V / FiveM RP', 'Lineage II'].map(game => (
                    <div key={game} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold text-slate-200">{game}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Catálogo Interactivo de Creadores */}
      <PublicCreatorCatalog onSelectCreatorForContact={handleSelectCreatorForContact} />

      {/* Cómo Funciona Section (Sección 26) */}
      <section id="como-funciona" className="py-20 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Flujo de Trabajo</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading mt-2">
              Cómo Opera PMForgeX en 6 Pasos
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Un proceso riguroso y transparente desde el primer contacto hasta los reportes finales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Incorporación del Servidor', desc: 'El Super Admin registra el servidor y genera las credenciales privadas para el dueño del servidor.' },
              { step: '02', title: 'Asignación de PM', desc: 'Se asigna un Promoter Manager responsable que coordinará las metas, calendarios y creadores de la campaña.' },
              { step: '03', title: 'Selección de Creadores', desc: 'Se asignan los streamers acordados para transmitir y publicar contenido según el objetivo fijado.' },
              { step: '04', title: 'Transmisión & Contenido', desc: 'Los creadores realizan las actividades en Twitch, YouTube o TikTok e interactúan con la comunidad.' },
              { step: '05', title: 'Registro de Evidencias', desc: 'Los streamers suben duración, enlaces y capturas a su panel, siendo auditados y aprobados por el PM.' },
              { step: '06', title: 'Resultados Verificados', desc: 'El Dueño de Servidor consulta en su panel métricas consolidadas y enlaces a todo el contenido aprobado.' }
            ].map(item => (
              <div key={item.step} className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl relative">
                <span className="text-3xl font-black font-heading text-amber-500/20">{item.step}</span>
                <h4 className="text-base font-bold text-white mt-2 mb-2">{item.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Contacto Section (Sección 4.5) */}
      <section id="contacto" className="py-24 bg-slate-950 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="text-center mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Contacto Comercial</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading mt-2">
                Impulsa tu Servidor con PMForgeX
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-400">
                Escríbenos para armar una propuesta a medida con streamers para tu servidor privado.
              </p>
            </div>

            {contactSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs mb-6 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>¡Mensaje enviado con éxito! Nuestro equipo comercial te contactará a la brevedad.</span>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Tu Nombre</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Ej. Roberto Díaz"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Correo de Contacto</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="admin@miservidor.com"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Nombre del Servidor</label>
                  <input
                    type="text"
                    value={contactForm.server_name}
                    onChange={(e) => setContactForm({ ...contactForm, server_name: e.target.value })}
                    placeholder="Ej. Metin2 Classic"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Juego</label>
                  <select
                    value={contactForm.game}
                    onChange={(e) => setContactForm({ ...contactForm, game: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Metin2">Metin2</option>
                    <option value="MU Online">MU Online</option>
                    <option value="Lineage II">Lineage II</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Mensaje o Requerimientos</label>
                <textarea
                  rows={4}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Cuéntanos sobre la fecha de apertura, número de streamers deseados o presupuesto..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={contactLoading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{contactLoading ? 'Enviando Mensaje...' : 'Enviar Solicitud'}</span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
              <div>Email: <span className="text-amber-400">contacto@pmforgex.com</span></div>
              <div>Discord Oficial: <span className="text-amber-400">discord.gg/pmforgex</span></div>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-900 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">PMForgeX</span>
            <span>- © 2026 Todos los derechos reservados.</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLoginModalOpen(true)}
              className="text-slate-400 hover:text-amber-400 transition-colors"
            >
              Acceso a Plataforma Privada
            </button>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

    </div>
  );
}
