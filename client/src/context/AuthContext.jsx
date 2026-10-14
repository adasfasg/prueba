import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const DEMO_PRESETS = [
  { label: 'Super Admin', email: 'admin@pmforgex.com', pass: 'PMForgeX2026!Admin', role: 'super_admin', badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { label: 'Dir. Operacional', email: 'operaciones@pmforgex.com', pass: 'PMForgeX2026!Ops', role: 'director_ops', badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { label: 'Dir. de PMs', email: 'director.pm@pmforgex.com', pass: 'PMForgeX2026!DirPM', role: 'director_pms', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { label: 'Dir. de Creadores', email: 'director.creadores@pmforgex.com', pass: 'PMForgeX2026!DirCr', role: 'director_creators', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { label: 'Promoter Manager', email: 'pm.carlos@pmforgex.com', pass: 'PMForgeX2026!PM1', role: 'pm', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { label: 'Creador / Streamer', email: 'creador.dragonslayer@pmforgex.com', pass: 'PMForgeX2026!Creator', role: 'creator', badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { label: 'Dueño de Servidor', email: 'owner.metinclassic@pmforgex.com', pass: 'PMForgeX2026!Owner', role: 'server_owner', badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
];

export function getDashboardRoute(role) {
  switch (role) {
    case 'super_admin':
      return '/dashboard/admin';
    case 'director_ops':
      return '/dashboard/director-ops';
    case 'director_pms':
      return '/dashboard/director-pms';
    case 'director_creators':
      return '/dashboard/director-creators';
    case 'pm':
      return '/dashboard/pm';
    case 'creator':
      return '/dashboard/creator';
    case 'server_owner':
      return '/dashboard/server-owner';
    default:
      return '/';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('pmforgex_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyUser() {
      const savedToken = localStorage.getItem('pmforgex_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('pmforgex_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Error verifying token:', err);
      } finally {
        setLoading(false);
      }
    }

    verifyUser();
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    localStorage.setItem('pmforgex_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('pmforgex_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, getDashboardRoute }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
