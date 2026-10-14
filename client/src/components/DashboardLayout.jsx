import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getDashboardRoute } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  LayoutDashboard, Users, Server, Target, FileCheck, Shield, 
  BarChart3, Bell, LogOut, ExternalLink, Menu, X, CheckCircle2,
  AlertTriangle, UserCheck, Flame
} from 'lucide-react';

export default function DashboardLayout({ children, activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  // Define sidebar navigation items depending on role
  const getNavItems = () => {
    switch (user.role) {
      case 'super_admin':
        return [
          { id: 'overview', label: 'Resumen Global', icon: LayoutDashboard },
          { id: 'users', label: 'Gestión de Usuarios', icon: Users },
          { id: 'servers', label: 'Servidores & PMs', icon: Server },
          { id: 'campaigns', label: 'Campañas Globales', icon: Target },
          { id: 'audit', label: 'Logs de Auditoría', icon: Shield },
        ];
      case 'director_ops':
        return [
          { id: 'overview', label: 'Supervisión Operativa', icon: LayoutDashboard },
          { id: 'servers', label: 'Servidores Activos', icon: Server },
          { id: 'campaigns', label: 'Campañas en Curso', icon: Target },
          { id: 'audit', label: 'Registro de Incidencias', icon: Shield },
        ];
      case 'director_pms':
        return [
          { id: 'overview', label: 'Supervisión de PMs', icon: LayoutDashboard },
          { id: 'servers', label: 'Servidores Asignados', icon: Server },
          { id: 'campaigns', label: 'Cumplimiento', icon: Target },
        ];
      case 'director_creators':
        return [
          { id: 'overview', label: 'Directorio Creadores', icon: Users },
          { id: 'performance', label: 'Rendimiento & Horas', icon: BarChart3 },
          { id: 'campaigns', label: 'Asignaciones', icon: Target },
        ];
      case 'pm':
        return [
          { id: 'servers', label: 'Mis Servidores', icon: Server },
          { id: 'campaigns', label: 'Mis Campañas', icon: Target },
          { id: 'review', label: 'Bandeja de Revisión', icon: FileCheck, badge: 'Workflow' },
          { id: 'creators', label: 'Mis Creadores', icon: Users },
        ];
      case 'creator':
        return [
          { id: 'campaigns', label: 'Mis Campañas', icon: Target },
          { id: 'submit', label: 'Registrar Actividad', icon: FileCheck },
          { id: 'evidences', label: 'Mis Entregas', icon: BarChart3 },
          { id: 'profile', label: 'Mi Perfil Público', icon: Users },
        ];
      case 'server_owner':
        return [
          { id: 'overview', label: 'Mi Servidor', icon: Server },
          { id: 'creators', label: 'Creadores Asignados', icon: Users },
          { id: 'results', label: 'Evidencias Verificadas', icon: CheckCircle2 },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin / Dueño';
      case 'director_ops': return 'Director Operacional';
      case 'director_pms': return 'Director de PMs';
      case 'director_creators': return 'Director de Creadores';
      case 'pm': return 'Promoter Manager';
      case 'creator': return 'Creador de Contenido';
      case 'server_owner': return 'Dueño de Servidor';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Brand */}
        <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-800">
          <img 
            src="/assets/formato%20isotipo.jpg" 
            alt="PMForgeX" 
            className="w-9 h-9 rounded-lg object-cover border border-amber-500/30 shadow-md"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <span className="text-xl font-extrabold font-heading tracking-wide bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              PMFORGEX
            </span>
            <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Área Privada
            </div>
          </div>
        </div>

        {/* User Role Card */}
        <div className="p-4 m-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <div className="text-xs font-bold text-white truncate">{user.full_name}</div>
          <div className="text-[10px] text-amber-400 font-semibold mt-0.5">{getRoleLabel(user.role)}</div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</div>
        </div>

        {/* Nav list */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto pt-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-slate-900 text-amber-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ver Web Pública</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-heading text-white">
                {navItems.find(i => i.id === activeTab)?.label || 'Panel de Control'}
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">
                PMForgeX Platform v1.0 • Sistema RBAC Activo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Notificaciones</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => markAsRead('all')} 
                        className="text-[11px] text-amber-400 hover:underline"
                      >
                        Marcar todas leídas
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
                          onClick={() => { markAsRead(n.id); if (n.link_url) navigate(n.link_url); setNotifOpen(false); }}
                          className={`p-3 text-xs hover:bg-slate-800 cursor-pointer ${n.is_read ? 'opacity-60' : 'bg-slate-800/40 font-semibold'}`}
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

            {/* User chip */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-xs text-slate-950">
                {user.full_name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{user.full_name}</div>
                <div className="text-[10px] text-slate-400">{user.role}</div>
              </div>
            </div>

          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>

      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative w-72 bg-slate-900 border-r border-slate-800 flex flex-col p-4 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-lg font-bold font-heading text-white">PMFORGEX</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1.5 py-4">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onTabChange(item.id); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    activeTab === item.id ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <button onClick={logout} className="w-full py-2 text-xs text-red-400 flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
