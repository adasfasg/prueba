import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, getDashboardRoute } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  ShieldCheck, LogIn, LogOut, LayoutDashboard, Bell, Menu, X, 
  ChevronDown, ExternalLink, Gamepad2, Users, Flame 
} from 'lucide-react';

export default function Navbar({ onOpenLogin }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 transition-all">
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
                AGENCIA GAMING & METIN2
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="/#inicio" className="hover:text-amber-400 transition-colors">Inicio</a>
            <a href="/#servicios" className="hover:text-amber-400 transition-colors">Servicios</a>
            <a href="/#ecosistemas" className="hover:text-amber-400 transition-colors">Ecosistemas</a>
            <a href="/#creadores" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
              <span>Creadores</span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                Público
              </span>
            </a>
            <a href="/#como-funciona" className="hover:text-amber-400 transition-colors">Cómo Funciona</a>
            <a href="/#contacto" className="hover:text-amber-400 transition-colors">Contacto</a>
          </div>

          {/* Right Action: Login / User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Notifications Bell */}
                <div className="relative">
                  <button 
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="p-2 text-slate-300 hover:text-amber-400 hover:bg-slate-900 rounded-lg relative transition-all"
                    title="Notificaciones"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center animate-pulse">
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

                {/* Go to Dashboard button */}
                <Link
                  to={getDashboardRoute(user.role)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-amber-500/20 transition-all"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Mi Panel</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-all"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-400 font-semibold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Acceso Plataforma</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-3">
            {user && (
              <Link to={getDashboardRoute(user.role)} className="p-2 text-amber-400">
                <LayoutDashboard className="w-5 h-5" />
              </Link>
            )}
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
        <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3">
          <a href="/#inicio" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">Inicio</a>
          <a href="/#servicios" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">Servicios</a>
          <a href="/#ecosistemas" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">Ecosistemas</a>
          <a href="/#creadores" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">Catálogo de Creadores</a>
          <a href="/#como-funciona" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">Cómo Funciona</a>
          <a href="/#contacto" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300 hover:text-amber-400">Contacto</a>
          <div className="pt-3 border-t border-slate-800">
            {user ? (
              <div className="flex items-center justify-between">
                <Link 
                  to={getDashboardRoute(user.role)} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
                >
                  Ir al Panel ({user.role})
                </Link>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-red-400 text-xs">
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onOpenLogin(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs uppercase rounded-lg"
              >
                <LogIn className="w-4 h-4" />
                <span>Acceso Plataforma</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
