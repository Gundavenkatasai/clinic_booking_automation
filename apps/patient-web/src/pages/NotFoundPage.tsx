import React from 'react';
import { Link } from 'react-router-dom';
import { HeartCrack, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="section" style={{ textAlign: 'center', minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ maxWidth: '480px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <HeartCrack size={32} />
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>Page Not Found</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '1rem' }}>
          The page you are looking for does not exist or may have been relocated.
        </p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft size={16} /> Return to Clinic Home
        </Link>
      </div>
    </div>
  );
};
