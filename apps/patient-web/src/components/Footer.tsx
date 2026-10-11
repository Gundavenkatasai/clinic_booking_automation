import React from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, MapPin, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ backgroundColor: '#172A35', color: '#F3F1EB', marginTop: 'auto', paddingTop: '4rem', paddingBottom: '2rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem', marginBottom: '3.5rem' }}>
          {/* Clinic Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 32, height: 32, backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HeartPulse size={20} color="#FFFFFF" />
              </div>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.375rem', fontWeight: 700, color: '#FFFFFF' }}>
                Aura Health
              </span>
            </div>
            <p style={{ color: '#A0B0B5', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Dedicated outpatient medical care combining clinical excellence with timely, respectful consultations. Powered by automated Google Calendar scheduling and instant Gmail confirmations.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#B8CFC2', fontSize: '0.8125rem' }}>
              <ShieldCheck size={16} /> Certified Clinical Specialists & Patient Privacy
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', fontFamily: 'var(--font-serif)' }}>
              Quick Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem' }}>
              <li><Link to="/" style={{ color: '#CBD5E1', transition: 'color 150ms' }}>Home</Link></li>
              <li><Link to="/doctors" style={{ color: '#CBD5E1' }}>Our Specialists</Link></li>
              <li><Link to="/services" style={{ color: '#CBD5E1' }}>Clinical Services</Link></li>
              <li><Link to="/book" style={{ color: '#CBD5E1' }}>Book an Appointment</Link></li>
              <li><Link to="/manage" style={{ color: '#CBD5E1' }}>Manage / Reschedule Visit</Link></li>
            </ul>
          </div>

          {/* Clinic Hours */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', fontFamily: 'var(--font-serif)' }}>
              Consultation Hours
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#A0B0B5' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mon – Fri:</span>
                <span style={{ color: '#FFFFFF' }}>08:30 AM – 06:00 PM</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Saturday:</span>
                <span style={{ color: '#FFFFFF' }}>09:00 AM – 04:30 PM</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sunday:</span>
                <span style={{ color: '#E2E8F0' }}>Urgent Care Only</span>
              </li>
              <li style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#D7B56D' }}>
                <Clock size={14} /> India Standard Time (IST)
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', fontFamily: 'var(--font-serif)' }}>
              Clinic Location
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#CBD5E1' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <MapPin size={18} style={{ color: '#D7B56D', flexShrink: 0, marginTop: 2 }} />
                <span>42 Heritage Avenue, 3rd Block, Koramangala, Bengaluru, KA 560034</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} style={{ color: '#B8CFC2', flexShrink: 0 }} />
                <span>+91 (80) 4123-8899</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} style={{ color: '#B8CFC2', flexShrink: 0 }} />
                <span>care@auraclinic.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem', color: '#7E8E94' }}>
          <div>
            © {new Date().getFullYear()} Aura Health Clinic. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Medical Disclaimer</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
