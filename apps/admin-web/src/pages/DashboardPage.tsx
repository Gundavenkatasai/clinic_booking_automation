import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Bell,
  ArrowRight,
  User,
} from 'lucide-react';
import { adminApi, PaginatedAppointments } from '../api/client';
import { DashboardMetrics } from '@clinic/shared';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<PaginatedAppointments | null>(null);
  const [isShowingUpcoming, setIsShowingUpcoming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const metricsData = await adminApi.getDashboard();
      setMetrics(metricsData);

      let appData = await adminApi.getAppointments({ dateFrom: todayStr, dateTo: todayStr, limit: 10 });
      if (!appData.items || appData.items.length === 0) {
        const upcomingData = await adminApi.getAppointments({ limit: 10, sortBy: 'appointmentDate', sortOrder: 'asc' });
        if (upcomingData.items && upcomingData.items.length > 0) {
          appData = upcomingData;
          setIsShowingUpcoming(true);
        } else {
          setIsShowingUpcoming(false);
        }
      } else {
        setIsShowingUpcoming(false);
      }
      setTodayAppointments(appData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      {/* Title & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '0.25rem' }}>
            Clinical Operations Overview
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)' }}>
            Real-time appointment statuses synched with Google Sheets and Google Calendar.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardData}
          className="btn-admin btn-admin-secondary"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {/* Today */}
        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--admin-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase' }}>Appointments Today</span>
            <Calendar size={18} color="var(--admin-primary)" />
          </div>
          <div className="metric-value">{metrics ? metrics.appointmentsToday : '...'}</div>
          <div style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Active schedule for current date
          </div>
        </div>

        {/* Upcoming */}
        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--admin-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase' }}>Upcoming Bookings</span>
            <Clock size={18} color="#2563EB" />
          </div>
          <div className="metric-value">{metrics ? metrics.upcomingAppointments : '...'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
            Scheduled future visits
          </div>
        </div>

        {/* Confirmed */}
        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--admin-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase' }}>Confirmed</span>
            <CheckCircle2 size={18} color="var(--admin-confirmed)" />
          </div>
          <div className="metric-value">{metrics ? metrics.confirmedAppointments : '...'}</div>
          <div style={{ fontSize: '0.75rem', color: '#059669' }}>
            Synched with Google Calendar
          </div>
        </div>

        {/* Cancelled */}
        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--admin-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase' }}>Cancelled</span>
            <XCircle size={18} color="var(--admin-cancelled)" />
          </div>
          <div className="metric-value">{metrics ? metrics.cancelledAppointments : '...'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
            Slots released back to inventory
          </div>
        </div>

        {/* Specialists */}
        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--admin-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase' }}>Specialists</span>
            <UserCheck size={18} color="#7C3AED" />
          </div>
          <div className="metric-value">{metrics ? metrics.doctorCount : '...'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
            Configured doctors in database
          </div>
        </div>

        {/* Reminders */}
        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--admin-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase' }}>Reminders Sent</span>
            <Bell size={18} color="#D97706" />
          </div>
          <div className="metric-value">{metrics ? metrics.reminderCount : '...'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
            Gmail workflow dispatches
          </div>
        </div>
      </div>

      {/* Today's Agenda Section */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--admin-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--admin-text-main)' }}>
              {isShowingUpcoming ? 'Upcoming Consultation Schedule' : "Today's Consultation Schedule"}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--admin-text-muted)' }}>
              {isShowingUpcoming
                ? 'Showing upcoming patient appointments (switch to full log to filter by custom dates)'
                : `Patient appointments scheduled for today (${new Date().toISOString().split('T')[0]})`}
            </p>
          </div>

          <Link to="/appointments" className="btn-admin btn-admin-secondary" style={{ fontSize: '0.8125rem' }}>
            View Full Appointments Log <ArrowRight size={14} />
          </Link>
        </div>

        {todayAppointments && todayAppointments.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>
            No appointments scheduled yet. Use the patient portal to book or test.
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Patient</th>
                  <th>Doctor ID</th>
                  <th>Date & Time (IST)</th>
                  <th>Status</th>
                  <th>Email Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAppointments?.items.map((app) => (
                  <tr key={app.bookingId}>
                    <td>
                      <span className="code-ref">{app.bookingId}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{app.patientName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{app.email}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={13} color="var(--admin-primary)" /> {app.doctorId}
                      </span>
                    </td>
                    <td>
                      <div><strong>{app.appointmentDate}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{app.appointmentTime} – {app.endTime}</div>
                    </td>
                    <td>
                      <span className={`status-pill status-${app.status}`}>
                        {app.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', textTransform: 'capitalize' }}>
                        {app.emailStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
