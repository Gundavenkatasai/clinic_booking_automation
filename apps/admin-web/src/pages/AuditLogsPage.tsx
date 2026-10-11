import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, Clock, User } from 'lucide-react';
import { adminApi } from '../api/client';
import { AuditLogEntry } from '@clinic/shared';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAuditLogs(100);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit log trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '0.25rem' }}>
            Operational Security & Audit Trail
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)' }}>
            Tamper-evident operational logging for booking creation, cancellation, rescheduling, and staff actions.
          </p>
        </div>

        <button type="button" onClick={fetchLogs} className="btn-admin btn-admin-secondary" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp (UTC / IST)</th>
              <th>Actor</th>
              <th>Action Type</th>
              <th>Booking Ref</th>
              <th>Operational Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--admin-primary)' }} />
                  <div>Loading audit logs...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                  No operational audit events recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                      <Clock size={13} color="var(--admin-text-muted)" />
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.8125rem' }}>
                      <User size={13} color="var(--admin-primary)" />
                      {entry.actor}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#F1F5F9',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 3,
                        color: '#334155',
                      }}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td>
                    {entry.bookingId ? (
                      <span className="code-ref">{entry.bookingId}</span>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--admin-text-main)' }}>
                      {entry.details}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
