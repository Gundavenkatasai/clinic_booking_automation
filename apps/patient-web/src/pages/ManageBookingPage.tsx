import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  XCircle,
  CalendarDays,
} from 'lucide-react';
import { api } from '../api/client';
import { Appointment, Doctor, DayAvailability, TimeSlot } from '@clinic/shared';

export const ManageBookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialBookingId = searchParams.get('bookingId') || '';
  const initialToken = searchParams.get('token') || '';

  // Lookup state
  const [bookingId, setBookingId] = useState(initialBookingId);
  const [verificationToken, setVerificationToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verified appointment & doctor
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Rescheduling state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  // Auto-verify if query params present
  useEffect(() => {
    if (initialBookingId && initialToken) {
      handleVerify(initialBookingId, initialToken);
    }
  }, [initialBookingId, initialToken]);

  const handleVerify = async (bId: string, tok: string) => {
    if (!bId.trim() || !tok.trim()) {
      setError('Please provide both your Booking Reference ID and verification token / email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.verifyBooking({
        bookingId: bId.trim(),
        verificationToken: tok.trim(),
      });
      setAppointment(result.appointment);
      setDoctor(result.doctor);
    } catch (err: any) {
      setError(err.message || 'Unable to verify appointment. Please check your details.');
      setAppointment(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancellation
  const handleCancelBooking = async () => {
    if (!appointment) return;
    setCancelling(true);
    setError(null);

    try {
      const updated = await api.cancelBooking({
        bookingId: appointment.bookingId,
        verificationToken: appointment.verificationToken,
        reason: cancelReason || undefined,
      });
      setAppointment(updated);
      setCancelSuccess(true);
      setShowCancelModal(false);
    } catch (err: any) {
      setError(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  // Fetch Slots for Rescheduling
  useEffect(() => {
    if (doctor && newDate) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      api
        .getDoctorAvailability(doctor.doctorId, newDate)
        .then((data) => {
          setAvailability(data);
          setLoadingSlots(false);
        })
        .catch(() => {
          setLoadingSlots(false);
        });
    }
  }, [doctor, newDate]);

  // Handle Rescheduling
  const handleRescheduleBooking = async () => {
    if (!appointment || !newDate || !selectedSlot) return;
    setRescheduling(true);
    setError(null);

    try {
      const updated = await api.rescheduleBooking({
        bookingId: appointment.bookingId,
        verificationToken: appointment.verificationToken,
        newDate,
        newTime: selectedSlot.time,
      });
      setAppointment(updated);
      setRescheduleSuccess(true);
      setShowRescheduleModal(false);
    } catch (err: any) {
      setError(err.message || 'Rescheduling failed');
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="section" style={{ minHeight: '80vh', backgroundColor: 'var(--color-bg)' }}>
      <div className="container" style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>Patient Portal</span>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>Manage Your Appointment</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            Look up your verified booking to check status, reschedule your consultation, or cancel if needed.
          </p>
        </div>

        {/* Verification Form */}
        {!appointment && (
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={20} color="var(--color-primary)" /> Verify Appointment Ownership
            </h3>

            {error && (
              <div className="card" style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem' }}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(bookingId, verificationToken);
              }}
            >
              <div className="form-group">
                <label htmlFor="lookup-id" className="form-label">
                  Booking Reference ID (e.g. APT-2026-XXXX) *
                </label>
                <input
                  id="lookup-id"
                  type="text"
                  placeholder="APT-XXXXXX-XXXX"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lookup-token" className="form-label">
                  Verification Token OR Registered Email Address *
                </label>
                <input
                  id="lookup-token"
                  type="text"
                  placeholder="tok_... or patient.email@example.com"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value)}
                  className="form-input"
                  required
                />
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Found in your booking confirmation screen or original Gmail notification.
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={loading}
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                Verify & Retrieve Details
              </button>
            </form>
          </div>
        )}

        {/* Verified Appointment Card */}
        {appointment && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <span className="badge badge-sage" style={{ marginBottom: '0.5rem' }}>
                  Ref: {appointment.bookingId}
                </span>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-main)' }}>
                  {doctor?.doctorName || 'Clinical Specialist'}
                </h2>
                <div style={{ color: 'var(--color-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                  {doctor?.specialty}
                </div>
              </div>

              <div>
                <span
                  className="badge"
                  style={{
                    backgroundColor:
                      appointment.status === 'confirmed'
                        ? 'var(--color-success-bg)'
                        : appointment.status === 'cancelled'
                        ? 'var(--color-error-bg)'
                        : 'var(--color-warning-bg)',
                    color:
                      appointment.status === 'confirmed'
                        ? 'var(--color-success)'
                        : appointment.status === 'cancelled'
                        ? 'var(--color-error)'
                        : 'var(--color-warning)',
                    fontSize: '0.875rem',
                    textTransform: 'capitalize',
                  }}
                >
                  {appointment.status}
                </span>
              </div>
            </div>

            {cancelSuccess && (
              <div className="card" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', marginBottom: '1.5rem', padding: '1rem' }}>
                <CheckCircle2 size={18} /> Appointment successfully cancelled. Google Calendar event released.
              </div>
            )}

            {rescheduleSuccess && (
              <div className="card" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', marginBottom: '1.5rem', padding: '1rem' }}>
                <CheckCircle2 size={18} /> Appointment successfully rescheduled. Updated confirmation sent to your email.
              </div>
            )}

            {/* Details Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', fontSize: '0.9375rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Date:</span>
                <span style={{ fontWeight: 600 }}>{appointment.appointmentDate}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Time Slot:</span>
                <span style={{ fontWeight: 600 }}>{appointment.appointmentTime} – {appointment.endTime} IST</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Patient Name:</span>
                <span style={{ fontWeight: 600 }}>{appointment.patientName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Patient Email:</span>
                <span style={{ fontWeight: 600 }}>{appointment.email}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Google Calendar Event:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{appointment.calendarEventId || 'Synched'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Email Confirmation:</span>
                <span style={{ textTransform: 'capitalize' }}>{appointment.emailStatus}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {appointment.status !== 'cancelled' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRescheduleModal(true)}
                >
                  <CalendarDays size={16} color="var(--color-primary)" /> Reschedule Appointment
                </button>

                <button
                  type="button"
                  className="btn btn-destructive"
                  onClick={() => setShowCancelModal(true)}
                >
                  <XCircle size={16} /> Cancel Appointment
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAppointment(null)}
                  style={{ marginLeft: 'auto' }}
                >
                  Lookup Another Visit
                </button>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  This appointment has been cancelled.
                </span>
                <Link to="/book" className="btn btn-primary">
                  Book a New Appointment
                </Link>
              </div>
            )}
          </div>
        )}

        {/* CANCELLATION MODAL */}
        {showCancelModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(23, 42, 53, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1.5rem',
            }}
          >
            <div className="card" style={{ maxWidth: '480px', width: '100%', boxShadow: 'var(--shadow-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--color-error)' }}>
                <ShieldAlert size={24} />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-main)' }}>Confirm Cancellation</h3>
              </div>

              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Are you sure you want to cancel your appointment with <strong>{doctor?.doctorName}</strong> on <strong>{appointment?.appointmentDate} at {appointment?.appointmentTime} IST</strong>? This will release the slot and notify clinic staff.
              </p>

              <div className="form-group">
                <label htmlFor="cancel-reason" className="form-label">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  id="cancel-reason"
                  rows={2}
                  placeholder="e.g. Personal schedule change..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  className="btn btn-destructive"
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                >
                  {cancelling ? <RefreshCw size={16} className="animate-spin" /> : 'Yes, Cancel Appointment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESCHEDULE MODAL */}
        {showRescheduleModal && doctor && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(23, 42, 53, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1.5rem',
            }}
          >
            <div className="card" style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Reschedule Appointment</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Select a new date and available time slot for <strong>{doctor.doctorName}</strong>.
              </p>

              <div className="form-group">
                <label htmlFor="reschedule-date" className="form-label">
                  New Date
                </label>
                <input
                  id="reschedule-date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="form-input"
                />
              </div>

              {loadingSlots ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-primary)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                  <span>Checking doctor slot availability...</span>
                </div>
              ) : availability && !availability.isWorkingDay ? (
                <div className="card" style={{ backgroundColor: 'var(--color-warning-bg)', padding: '1rem', color: 'var(--color-warning)' }}>
                  Doctor does not consult on this day of week.
                </div>
              ) : availability ? (
                <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                    Available Time Slots:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                    {availability.slots.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.available}
                        onClick={() => setSelectedSlot(s)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: `2px solid ${selectedSlot?.time === s.time ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          backgroundColor: selectedSlot?.time === s.time ? 'var(--color-primary)' : s.available ? '#FFFFFF' : '#F3F4F6',
                          color: selectedSlot?.time === s.time ? '#FFFFFF' : s.available ? 'var(--color-text-main)' : '#9CA3AF',
                          cursor: s.available ? 'pointer' : 'not-allowed',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                        }}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRescheduleModal(false)}
                  disabled={rescheduling}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!newDate || !selectedSlot || rescheduling}
                  onClick={handleRescheduleBooking}
                >
                  {rescheduling ? <RefreshCw size={16} className="animate-spin" /> : 'Confirm New Slot'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
