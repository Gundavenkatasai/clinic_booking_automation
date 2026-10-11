import React, { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  XCircle,
  CalendarDays,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { adminApi, PaginatedAppointments } from '../api/client';
import { Appointment, Doctor } from '@clinic/shared';

export const AppointmentsPage: React.FC = () => {
  const [data, setData] = useState<PaginatedAppointments | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Action Modals
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 10,
        search,
        status: statusFilter,
        doctorId: doctorFilter,
      };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await adminApi.getAppointments(params);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    adminApi.getDoctors().then(setDoctors).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [page, statusFilter, doctorFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAppointments();
  };

  // Cancel Handler
  const handleCancel = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await adminApi.cancelAppointment(selectedApp.bookingId, cancelReason);
      setShowCancelModal(false);
      setSelectedApp(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Reschedule Handler
  const handleReschedule = async () => {
    if (!selectedApp || !rescheduleDate || !rescheduleTime) return;
    setActionLoading(true);
    try {
      await adminApi.rescheduleAppointment(selectedApp.bookingId, rescheduleDate, rescheduleTime);
      setShowRescheduleModal(false);
      setSelectedApp(null);
      setRescheduleDate('');
      setRescheduleTime('');
      fetchAppointments();
    } catch (err: any) {
      alert(`Rescheduling failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '0.25rem' }}>
            Appointment Records & Operational Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)' }}>
            Google Sheets `Appointments` database synchronization & Calendar controls.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPage(1);
            fetchAppointments();
          }}
          className="btn-admin btn-admin-secondary"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--admin-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ flexGrow: 1, minWidth: '240px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '0.35rem' }}>
            Search Reference or Patient
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search reference, name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </form>

        {/* Status Filter */}
        <div style={{ minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '0.35rem' }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Doctor Filter */}
        <div style={{ minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '0.35rem' }}>
            Doctor
          </label>
          <select
            value={doctorFilter}
            onChange={(e) => {
              setDoctorFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="all">All Specialists</option>
            {doctors.map((d) => (
              <option key={d.doctorId} value={d.doctorId}>
                {d.doctorName}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '0.35rem' }}>
            From Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="admin-input"
            style={{ width: '140px' }}
          />
        </div>

        {/* Date To */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '0.35rem' }}>
            To Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="admin-input"
            style={{ width: '140px' }}
          />
        </div>

        <button type="button" onClick={fetchAppointments} className="btn-admin btn-admin-primary">
          Filter
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date & Time (IST)</th>
              <th>Status</th>
              <th>Calendar Event</th>
              <th>Email</th>
              <th>Reminder</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--admin-primary)' }} />
                  <div>Loading appointments from Google Sheets data store...</div>
                </td>
              </tr>
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                  No appointments found matching current filter parameters.
                </td>
              </tr>
            ) : (
              data?.items.map((app) => (
                <tr key={app.bookingId}>
                  <td>
                    <span className="code-ref">{app.bookingId}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{app.patientName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                      {app.email} • {app.phone}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{app.doctorId}</span>
                  </td>
                  <td>
                    <div><strong>{app.appointmentDate}</strong></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                      {app.appointmentTime} – {app.endTime}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill status-${app.status}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {app.calendarEventId ? app.calendarEventId.slice(0, 16) + '...' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', textTransform: 'capitalize' }}>
                      {app.emailStatus}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: app.reminderSent ? '#059669' : '#94A3B8' }}>
                      {app.reminderSent ? 'Dispatched' : 'Queued'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedApp(app);
                          setShowDetailsModal(true);
                        }}
                        className="btn-admin btn-admin-secondary"
                        style={{ padding: '0.3rem 0.5rem' }}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>

                      {app.status !== 'cancelled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(app);
                              setRescheduleDate(app.appointmentDate);
                              setRescheduleTime(app.appointmentTime);
                              setShowRescheduleModal(true);
                            }}
                            className="btn-admin btn-admin-secondary"
                            style={{ padding: '0.3rem 0.5rem', color: '#2563EB' }}
                            title="Reschedule"
                          >
                            <CalendarDays size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(app);
                              setShowCancelModal(true);
                            }}
                            className="btn-admin btn-admin-secondary"
                            style={{ padding: '0.3rem 0.5rem', color: '#DC2626' }}
                            title="Cancel"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {data && data.pagination.totalPages > 1 && (
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--admin-border)', fontSize: '0.8125rem', color: 'var(--admin-text-muted)' }}>
            <div>
              Showing page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalCount} total records)
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                disabled={data.pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-admin btn-admin-secondary"
                style={{ padding: '0.25rem 0.6rem' }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                disabled={data.pagination.page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-admin btn-admin-secondary"
                style={{ padding: '0.25rem 0.6rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedApp && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-panel">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Appointment Audit Details</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--admin-text-muted)', marginBottom: '1.5rem' }}>
              Reference: <span className="code-ref">{selectedApp.bookingId}</span>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
              <div><strong>Patient Name:</strong> {selectedApp.patientName}</div>
              <div><strong>Email:</strong> {selectedApp.email}</div>
              <div><strong>Phone:</strong> {selectedApp.phone}</div>
              <div><strong>Doctor ID:</strong> {selectedApp.doctorId}</div>
              <div><strong>Date:</strong> {selectedApp.appointmentDate}</div>
              <div><strong>Time (IST):</strong> {selectedApp.appointmentTime} – {selectedApp.endTime}</div>
              <div><strong>Status:</strong> <span className={`status-pill status-${selectedApp.status}`}>{selectedApp.status}</span></div>
              <div><strong>Calendar Event ID:</strong> <span className="code-ref">{selectedApp.calendarEventId || 'None'}</span></div>
              <div><strong>Verification Token:</strong> <span className="code-ref">{selectedApp.verificationToken}</span></div>
              <div><strong>Visit Reason:</strong> {selectedApp.reasonForVisit || 'None specified'}</div>
              <div><strong>Created Timestamp:</strong> {selectedApp.createdAt}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowDetailsModal(false)} className="btn-admin btn-admin-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && selectedApp && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626', marginBottom: '1rem' }}>
              <ShieldAlert size={22} />
              <h3 style={{ fontSize: '1.25rem', color: 'var(--admin-text-main)' }}>Cancel Appointment</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)', marginBottom: '1.25rem' }}>
              This will cancel booking <span className="code-ref">{selectedApp.bookingId}</span> for <strong>{selectedApp.patientName}</strong>, release the calendar reservation slot, and dispatch a cancellation notice.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Reason for Cancellation (Audit Trail)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="admin-input"
                placeholder="e.g. Doctor emergency leave, patient requested..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn-admin btn-admin-secondary"
                disabled={actionLoading}
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn-admin btn-admin-danger"
                disabled={actionLoading}
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {showRescheduleModal && selectedApp && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-panel">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Reschedule Appointment</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)', marginBottom: '1.25rem' }}>
              Patient: <strong>{selectedApp.patientName}</strong> with Specialist {selectedApp.doctorId}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                New Date (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="admin-input"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                New Time (HH:MM IST)
              </label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="admin-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="btn-admin btn-admin-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReschedule}
                className="btn-admin btn-admin-primary"
                disabled={actionLoading || !rescheduleDate || !rescheduleTime}
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Update & Sync Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
