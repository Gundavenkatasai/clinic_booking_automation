import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  UserCheck,
  ShieldAlert,
  LogOut,
  HeartPulse,
  Clock,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/', icon: <LayoutDashboard size={18} /> },
    { label: 'Appointments', path: '/appointments', icon: <CalendarCheck size={18} /> },
    { label: 'Specialists & Hours', path: '/doctors', icon: <UserCheck size={18} /> },
    { label: 'Security & Audit Log', path: '/audit', icon: <ShieldAlert size={18} /> },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        {/* Brand */}
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #1E293B' }}>
          <div style={{ width: 32, height: 32, backgroundColor: 'var(--admin-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
            <HeartPulse size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              Aura Health
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--admin-sidebar-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Operations Console
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '1rem 0', flexGrow: 1 }}>
          <div style={{ padding: '0 1.25rem 0.5rem', fontSize: '0.6875rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Clinical Management
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Sign Out */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid #1E293B', backgroundColor: '#0B1120' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>
                {user?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--admin-sidebar-text-muted)' }}>
                {user?.username}
              </div>
            </div>
            <span style={{ fontSize: '0.6875rem', backgroundColor: '#1E293B', color: '#38BDF8', padding: '0.15rem 0.4rem', borderRadius: 3, fontWeight: 600 }}>
              {user?.role}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="btn-admin"
            style={{ width: '100%', backgroundColor: '#1E293B', color: '#EF4444', border: '1px solid #334155', fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Operational Area */}
      <div className="admin-main">
        {/* Top Header */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--admin-text-main)' }}>
              Clinic Operations
            </span>
            <span style={{ color: 'var(--admin-border)' }}>|</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#059669', backgroundColor: '#ECFDF5', padding: '0.2rem 0.5rem', borderRadius: 9999, border: '1px solid #A7F3D0' }}>
              <Radio size={12} className="animate-pulse" /> Google Sheets & Calendar Active
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--admin-text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} /> IST (UTC+05:30)
            </span>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
