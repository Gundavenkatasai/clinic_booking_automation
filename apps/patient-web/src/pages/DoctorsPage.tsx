import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Doctor } from '@clinic/shared';

export const DoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .getDoctors()
      .then((data) => {
        setDoctors(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setDoctors([]);
        setLoading(false);
      });
  }, []);

  const filteredDoctors = (doctors || []).filter((doc) => {
    const q = search.toLowerCase();
    return (
      doc.doctorName.toLowerCase().includes(q) ||
      (doc.specialty && doc.specialty.toLowerCase().includes(q)) ||
      doc.workingDays.toLowerCase().includes(q)
    );
  });

  return (
    <div className="section" style={{ minHeight: '80vh' }}>
      <div className="container">
        {/* Header */}
        <div style={{ maxWidth: '640px', marginBottom: '3rem' }}>
          <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>Our Team</span>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Clinical Specialists</h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)' }}>
            Meet our certified doctors. All consultations are scheduled directly into Google Calendar with automated Gmail appointment confirmations.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '2.5rem', maxWidth: '480px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }}
            />
            <input
              type="text"
              placeholder="Search by specialist name or medical department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.75rem' }}
              aria-label="Search specialists"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Loading active doctors...</div>
          </div>
        ) : error ? (
          <div className="card" style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            <span>Failed to load doctors: {error}</span>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No specialists found</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              No doctors matched your search criteria. Try a different search term.
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => setSearch('')}>
              Clear Search
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {filteredDoctors.map((doc) => (
              <div key={doc.doctorId} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.375rem', marginBottom: '0.25rem' }}>{doc.doctorName}</h2>
                    <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>
                      {doc.specialty}
                    </div>
                  </div>
                  <span className="badge badge-sage">{doc.durationMinutes} min</span>
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                  {doc.qualifications}
                </div>

                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '1.75rem', flexGrow: 1 }}>
                  {doc.bio}
                </p>

                <div style={{ padding: '1rem', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    <Clock size={15} color="var(--color-primary)" /> {doc.openingTime} – {doc.closingTime} IST
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={15} color="var(--color-primary)" /> Days: {doc.workingDays}
                  </div>
                </div>

                <Link
                  to={`/book?doctor=${doc.doctorId}`}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Book with {doc.doctorName}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
