import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Menu, X, HeartPulse, Clock, Phone } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Specialists', path: '/doctors' },
    { label: 'Services', path: '/services' },
    { label: 'Manage Visit', path: '/manage' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Top Clinic Alert / Hours Bar */}
      <div style={{ backgroundColor: '#172A35', color: '#F3F1EB', fontSize: '0.8125rem', padding: '0.4rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={13} style={{ color: '#D7B56D' }} /> Mon - Sat: 08:30 AM - 06:00 PM IST
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Phone size={13} style={{ color: '#B8CFC2' }} /> +91 (80) 4123-8899
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
            Direct Google Calendar & Gmail Booking Integration
          </div>
        </div>
      </div>

      <header className="header">
        <div className="container nav-container">
          {/* Logo */}
          <Link to="/" className="logo" aria-label="Aura Health Clinic Home">
            <div className="logo-icon">
              <HeartPulse size={20} />
            </div>
            <span>Aura Health</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main Navigation" style={{ display: 'none' }} className="desktop-nav">
            <ul className="nav-links">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                    style={{ fontWeight: isActive(link.path) ? 600 : 500 }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/book" className="btn btn-primary" id="header-book-cta">
              <Calendar size={16} />
              <span>Book Appointment</span>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="btn btn-secondary mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle mobile menu"
              style={{ padding: '0.5rem', display: 'none' }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                style={{ fontSize: '1.0625rem', padding: '0.5rem 0' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <style>{`
        @media (min-width: 769px) {
          .desktop-nav { display: block !important; }
        }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: inline-flex !important; }
        }
      `}</style>
    </>
  );
};
