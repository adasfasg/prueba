import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, getDashboardRoute } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  ShieldCheck, LogIn, LogOut, LayoutDashboard, Bell, Menu, X, 
  Globe, MessageSquare, Sparkles, Send
} from 'lucide-react';

export default function Navbar({ onOpenLogin }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { lang, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleScrollToContact = (e) => {
    e.preventDefault();
    const el = document.getElementById('contacto');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/#contacto';
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src="/assets/formato%20isotipo.jpg" 
                alt="PMForgeX Isotipo" 
                className="w-10 h-10 rounded-lg object-cover border border-amber-500/30 group-hover:border-amber-400 shadow-md shadow-amber-500/10 transition-all"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-wider font-heading bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                PMFORGEX
              </span>
              <span className="text-[10px] tracking-widest text-slate-400 font-semibold uppercase -mt-1">
                AGENCIA GAMING & SERVIDORES
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="/#inicio" className="hover:text-amber-400 transition-colors">{t.nav.home}</a>
            <a href="/#quienes-somos" className="hover:text-amber-400 transition-colors">{t.nav.about}</a>
            <a href="/#servicios" className="hover:text-amber-400 transition-colors">{t.nav.services}</a>
            <a href="/#diseno-web" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
              <span>{t.nav.webDesign}</span>
              <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                Nuevo
              </span>
            </a>
            <a href="/#como-funciona" className="hover:text-amber-400 transition-colors">{t.nav.howItWorks}</a>
            <a href="/#hub-promotor" className="hover:text-amber-400 transition-colors">Hub</a>
          </div>

          {/* Right Action: Language Switch + Contact CTA + Login */}
          <div className="hidden sm:flex items-center gap-3">
            
            {/* 1-Click Language Selector (ES / EN) */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-amber-400 transition-all cursor-pointer"
              title="Cambiar Idioma / Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className={lang === 'es' ? 'text-amber-400 font-extrabold' : 'text-slate-500'}>ES</span>
              <span className="text-slate-600">/</span>
              <span className={lang === 'en' ? 'text-amber-400 font-extrabold' : 'text-slate-500'}>EN</span>
            </button>

            {/* Always Visible Contact CTA Button */}
            <button
              onClick={handleScrollToContact}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t.nav.contactBtn}</span>
            </button>

            {/* User Logged in / Login Button */}
            {user ? (
              <div className="flex items-center gap-2">
                {/* Notifications Bell */}
                <div className="relative">
                  <button 
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="p-2 text-slate-300 hover:text-amber-400 hover:bg-slate-900 rounded-xl relative transition-all cursor-pointer"
                    title="Notificaciones"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Notificaciones ({unreadCount})</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={() => markAsRead('all')}
                            className="text-[11px] text-amber-400 hover:underline"
                          >
                            Marcar leídas
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/50">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">Sin notificaciones</div>
                        ) : (
                          notifications.slice(0, 5).map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => { markAsRead(n.id); if (n.link_url) navigate(n.link_url); setNotifDropdownOpen(false); }}
                              className={`p-3 text-xs hover:bg-slate-800/80 cursor-pointer transition-colors ${n.is_read ? 'opacity-60' : 'bg-slate-800/30 font-semibold'}`}
                            >
                              <div className="text-amber-400 text-[11px]">{n.title}</div>
                              <p className="text-slate-300 mt-0.5 line-clamp-2">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dashboard button */}
                <Link
                  to={getDashboardRoute(user.role)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-amber-500/40 text-amber-400 hover:bg-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{t.nav.dashboard}</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                  title={t.nav.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.nav.login}</span>
              </button>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-amber-400"
            >
              {lang.toUpperCase()}
            </button>
            <button
              onClick={handleScrollToContact}
              className="px-2.5 py-1.5 bg-amber-500 text-slate-950 font-bold text-[11px] rounded-lg"
            >
              Contactar
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3">
          <a href="/#inicio" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">{t.nav.home}</a>
          <a href="/#quienes-somos" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">{t.nav.about}</a>
          <a href="/#servicios" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">{t.nav.services}</a>
          <a href="/#diseno-web" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">{t.nav.webDesign}</a>
          <a href="/#como-funciona" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">{t.nav.howItWorks}</a>
          <a href="/#hub-promotor" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">Hub</a>
          
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <button
              onClick={() => { setMobileMenuOpen(false); handleScrollToContact(new Event('click')); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-extrabold text-xs uppercase rounded-xl"
            >
              <Send className="w-4 h-4" />
              <span>{t.nav.contactBtn}</span>
            </button>

            {user ? (
              <div className="flex items-center justify-between pt-1">
                <Link 
                  to={getDashboardRoute(user.role)} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 bg-slate-900 border border-amber-500/40 text-amber-400 font-bold text-xs rounded-xl"
                >
                  {t.nav.dashboard}
                </Link>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-red-400 text-xs font-semibold">
                  {t.nav.logout}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onOpenLogin(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs uppercase rounded-xl"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>{t.nav.login}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
