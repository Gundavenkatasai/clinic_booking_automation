import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CalendarCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { Doctor, DayAvailability, TimeSlot, Appointment } from '@clinic/shared';

export const BookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedDoctorId = searchParams.get('doctor');

  // Wizard state (Steps 1 through 7)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Data state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  // Selections
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Form Fields
  const [patientName, setPatientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // 1. Fetch Doctors on Mount
  useEffect(() => {
    api
      .getDoctors()
      .then((data) => {
        const validDocs = Array.isArray(data) ? data : [];
        setDoctors(validDocs);
        setLoadingDoctors(false);
        // Preselect if query param provided
        if (preselectedDoctorId) {
          const match = validDocs.find((d) => d.doctorId === preselectedDoctorId);
          if (match) {
            setSelectedDoctor(match);
            setCurrentStep(2);
          }
        }
      })
      .catch((err) => {
        setDoctorsError(err.message);
        setDoctors([]);
        setLoadingDoctors(false);
      });

    // Generate unique idempotency key for this booking session
    setIdempotencyKey(`idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  }, [preselectedDoctorId]);

  // 2. Fetch Slots when Doctor and Date change
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setLoadingSlots(true);
      setSlotError(null);
      setSelectedSlot(null);

      api
        .getDoctorAvailability(selectedDoctor.doctorId, selectedDate)
        .then((data) => {
          setAvailability(data);
          setLoadingSlots(false);
        })
        .catch((err) => {
          setSlotError(err.message);
          setLoadingSlots(false);
        });
    }
  }, [selectedDoctor, selectedDate]);

  // Generate tomorrow's date string as minimum booking date
  const getMinDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate()); // allow today
    return d.toISOString().split('T')[0];
  };

  const getMaxDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 45); // up to 45 days in advance
    return d.toISOString().split('T')[0];
  };

  // Validation for Step 4
  const validatePatientForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!patientName.trim() || patientName.trim().length < 2) {
      errors.patientName = 'Please enter your full name (minimum 2 characters)';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address for confirmation';
    }
    if (!phone.trim() || phone.trim().length < 7) {
      errors.phone = 'Please provide a valid phone number with country code';
    }
    if (!consentAgreed) {
      errors.consent = 'You must acknowledge the clinic privacy policy';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submission handler (Step 6)
  const handleSubmitBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await api.createBooking({
        doctorId: selectedDoctor.doctorId,
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot.time,
        patientName: patientName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        reasonForVisit: reasonForVisit.trim() || undefined,
        consentAgreed: true,
        idempotencyKey,
      });

      setConfirmedBooking(response);
      try {
        localStorage.setItem('aura_last_booking_id', response.bookingId);
        localStorage.setItem('aura_last_booking_email', response.email);
        localStorage.setItem('aura_last_booking_token', response.verificationToken || '');
      } catch (e) {
        // Ignore localStorage restrictions
      }
      setCurrentStep(7); // Move to confirmation
    } catch (err: any) {
      if (err.code === 'SLOT_UNAVAILABLE' || err.code === 'SLOT_CONCURRENT_CONFLICT') {
        setSubmitError('This appointment slot has already been reserved. Please pick another available slot.');
        if (selectedDoctor && selectedDate) {
          api.getDoctorAvailability(selectedDoctor.doctorId, selectedDate).then(setAvailability);
        }
      } else {
        setSubmitError(err.message || 'Booking submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Google Calendar URL generator for Step 7
  const getGoogleCalendarUrl = () => {
    if (!confirmedBooking || !selectedDoctor) return '#';
    const title = encodeURIComponent(`Consultation: ${selectedDoctor.doctorName}`);
    const details = encodeURIComponent(
      `Appointment Ref: ${confirmedBooking.bookingId}\nDoctor: ${selectedDoctor.doctorName} (${selectedDoctor.specialty})\nClinic: Aura Health Clinic`
    );
    const location = encodeURIComponent('Aura Health Clinic, 42 Heritage Ave, Bengaluru');
    const startStr = `${confirmedBooking.appointmentDate.replace(/-/g, '')}T${confirmedBooking.appointmentTime.replace(':', '')}00`;
    const endStr = `${confirmedBooking.appointmentDate.replace(/-/g, '')}T${confirmedBooking.endTime.replace(':', '')}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}&ctz=Asia/Kolkata`;
  };

  return (
    <div className="section" style={{ minHeight: '85vh', backgroundColor: 'var(--color-bg)' }}>
      <div className="container" style={{ maxWidth: '840px' }}>
        {/* Wizard Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>
            Step {currentStep} of {currentStep === 7 ? '7 (Confirmed)' : '6'}
          </span>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
            {currentStep === 7 ? 'Appointment Confirmed' : 'Schedule Your Clinic Visit'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            {currentStep === 7
              ? 'Your booking is finalized and synchronized to Google Calendar & Gmail.'
              : 'Direct booking with real doctor hours in India Standard Time (IST).'}
          </p>
        </div>

        {/* Step Progress Bar (Steps 1 to 6) */}
        {currentStep < 7 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: 'var(--color-border)', zIndex: 1 }} />
            {[
              { num: 1, label: 'Doctor' },
              { num: 2, label: 'Date' },
              { num: 3, label: 'Time' },
              { num: 4, label: 'Details' },
              { num: 5, label: 'Review' },
              { num: 6, label: 'Book' },
            ].map((s) => {
              const isPast = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: isPast ? 'var(--color-primary)' : isCurrent ? 'var(--color-primary)' : '#FFFFFF',
                      color: isPast || isCurrent ? '#FFFFFF' : 'var(--color-text-muted)',
                      border: `2px solid ${isPast || isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    {isPast ? <CheckCircle2 size={16} /> : s.num}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 600 : 500, color: isCurrent ? 'var(--color-text-main)' : 'var(--color-text-light)' }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 1: SELECT DOCTOR */}
        {/* ==================================================== */}
        {currentStep === 1 && (
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} color="var(--color-primary)" /> Choose a Clinical Specialist
            </h3>

            {loadingDoctors ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-primary)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
                <span>Loading available doctors...</span>
              </div>
            ) : doctorsError ? (
              <div className="card" style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                <AlertCircle size={20} /> Failed to load doctors: {doctorsError}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {doctors.map((doc) => {
                  const isSelected = selectedDoctor?.doctorId === doc.doctorId;
                  return (
                    <div
                      key={doc.doctorId}
                      onClick={() => setSelectedDoctor(doc)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: isSelected ? 'var(--color-primary-light)' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '1.0625rem' }}>{doc.doctorName}</span>
                          <span className="badge badge-sage">{doc.durationMinutes} min</span>
                        </div>
                        <div style={{ color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 500, margin: '0.25rem 0' }}>
                          {doc.specialty}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          Consultation Days: {doc.workingDays} ({doc.openingTime} – {doc.closingTime} IST)
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedDoctor}
                onClick={() => setCurrentStep(2)}
                id="wizard-step1-next"
              >
                Continue to Select Date <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: SELECT DATE */}
        {/* ==================================================== */}
        {currentStep === 2 && selectedDoctor && (
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={20} color="var(--color-primary)" /> Select Consultation Date
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Consulting with <strong>{selectedDoctor.doctorName}</strong>. Working days: <em>{selectedDoctor.workingDays}</em>.
            </p>

            <div className="form-group" style={{ maxWidth: '320px' }}>
              <label htmlFor="appointment-date" className="form-label">
                Appointment Date (India Standard Time)
              </label>
              <input
                id="appointment-date"
                type="date"
                min={getMinDateStr()}
                max={getMaxDateStr()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
              />
            </div>

            {selectedDate && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                Selected Date: <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                <ArrowLeft size={16} /> Back to Doctor
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedDate}
                onClick={() => setCurrentStep(3)}
                id="wizard-step2-next"
              >
                Continue to Time Slots <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 3: SELECT TIME SLOT */}
        {/* ==================================================== */}
        {currentStep === 3 && selectedDoctor && selectedDate && (
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="var(--color-primary)" /> Select Time Slot
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              {selectedDoctor.doctorName} on {selectedDate} ({selectedDoctor.durationMinutes} min appointment)
            </p>

            {loadingSlots ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-primary)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
                <span>Checking live Google Sheets & Calendar availability...</span>
              </div>
            ) : slotError ? (
              <div className="card" style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertCircle size={20} />
                <span>{slotError}</span>
              </div>
            ) : availability && !availability.isWorkingDay ? (
              <div className="card" style={{ backgroundColor: 'var(--color-warning-bg)', borderColor: '#FEDF89', color: 'var(--color-warning)' }}>
                <strong>Non-Working Day:</strong> {selectedDoctor.doctorName} does not conduct consultations on this day. Please return to Step 2 and choose another date.
              </div>
            ) : availability && availability.slots.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p>No slots available on this date.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {availability?.slots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: '0.75rem 0.5rem',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${
                            isSelected
                              ? 'var(--color-primary)'
                              : slot.available
                              ? 'var(--color-border)'
                              : '#E5E7EB'
                          }`,
                          backgroundColor: isSelected
                            ? 'var(--color-primary)'
                            : slot.available
                            ? '#FFFFFF'
                            : '#F3F4F6',
                          color: isSelected ? '#FFFFFF' : slot.available ? 'var(--color-text-main)' : '#9CA3AF',
                          cursor: slot.available ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.2rem',
                          transition: 'all 150ms',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{slot.time}</span>
                        <span style={{ fontSize: '0.75rem', opacity: isSelected ? 0.9 : 0.75 }}>
                          {slot.available ? `${slot.endTime}` : slot.reason || 'Booked'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
                <ArrowLeft size={16} /> Back to Date
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedSlot}
                onClick={() => setCurrentStep(4)}
                id="wizard-step3-next"
              >
                Enter Details <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 4: PATIENT DETAILS */}
        {/* ==================================================== */}
        {currentStep === 4 && (
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} color="var(--color-primary)" /> Patient Contact Information
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
              We will send your booking confirmation and Google Calendar invite to these details.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validatePatientForm()) setCurrentStep(5);
              }}
            >
              {/* Full Name */}
              <div className="form-group">
                <label htmlFor="patient-name" className="form-label">
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                  <input
                    id="patient-name"
                    type="text"
                    placeholder="e.g. Anjali Verma"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    autoComplete="name"
                  />
                </div>
                {formErrors.patientName && <span className="form-error">{formErrors.patientName}</span>}
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="patient-email" className="form-label">
                  Email Address * (For Gmail Confirmation & Calendar Invite)
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                  <input
                    id="patient-email"
                    type="email"
                    placeholder="anjali.verma@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    autoComplete="email"
                  />
                </div>
                {formErrors.email && <span className="form-error">{formErrors.email}</span>}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label htmlFor="patient-phone" className="form-label">
                  Phone Number * (With country code)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                  <input
                    id="patient-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    autoComplete="tel"
                  />
                </div>
                {formErrors.phone && <span className="form-error">{formErrors.phone}</span>}
              </div>

              {/* Reason for Visit (Optional) */}
              <div className="form-group">
                <label htmlFor="patient-reason" className="form-label">
                  Reason for Visit (Optional)
                </label>
                <textarea
                  id="patient-reason"
                  rows={3}
                  placeholder="Briefly describe your symptoms or consultation objective..."
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  className="form-textarea"
                />
              </div>

              {/* Consent Checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', marginTop: '1.25rem', marginBottom: '1.75rem' }}>
                <input
                  id="patient-consent"
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  style={{ marginTop: '0.25rem', width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="patient-consent" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  I acknowledge and consent to Aura Health Clinic's appointment and privacy terms. I understand appointment reminders will be dispatched to my email address.
                </label>
              </div>
              {formErrors.consent && <div className="form-error" style={{ marginBottom: '1.25rem' }}>{formErrors.consent}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(3)}>
                  <ArrowLeft size={16} /> Back to Slots
                </button>
                <button type="submit" className="btn btn-primary" id="wizard-step4-next">
                  Review Appointment <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 5: REVIEW BOOKING */}
        {/* ==================================================== */}
        {currentStep === 5 && selectedDoctor && selectedDate && selectedSlot && (
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--color-primary)" /> Review Your Appointment Details
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
              Please verify your appointment and contact details before confirming.
            </p>

            <div style={{ backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Specialist:</span>
                <span style={{ fontWeight: 600 }}>{selectedDoctor.doctorName} ({selectedDoctor.specialty})</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Date:</span>
                <span style={{ fontWeight: 600 }}>{selectedDate}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Time Slot:</span>
                <span style={{ fontWeight: 600 }}>{selectedSlot.time} – {selectedSlot.endTime} IST ({selectedDoctor.durationMinutes} mins)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Patient Name:</span>
                <span style={{ fontWeight: 600 }}>{patientName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Email:</span>
                <span style={{ fontWeight: 600 }}>{email}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Phone:</span>
                <span style={{ fontWeight: 600 }}>{phone}</span>
              </div>
            </div>

            {submitError && (
              <div className="card" style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <AlertCircle size={20} />
                <span>{submitError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(4)}>
                <ArrowLeft size={16} /> Edit Details
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitBooking}
                disabled={submitting}
                id="wizard-step5-confirm-btn"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Reserving Slot...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Confirm & Reserve Appointment
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 7: CONFIRMATION PAGE */}
        {/* ==================================================== */}
        {currentStep === 7 && confirmedBooking && selectedDoctor && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 size={36} />
            </div>

            <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>
              Reference ID: {confirmedBooking.bookingId}
            </span>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>
              Appointment Successfully Booked!
            </h2>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '540px', margin: '0 auto 2rem', fontSize: '0.9375rem' }}>
              Your visit with <strong>{selectedDoctor.doctorName}</strong> on <strong>{confirmedBooking.appointmentDate}</strong> at <strong>{confirmedBooking.appointmentTime} IST</strong> has been scheduled.
            </p>

            {/* Confirmation Summary Card */}
            <div style={{ backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', padding: '1.5rem', maxWidth: '520px', margin: '0 auto 2rem', textAlign: 'left', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div><strong>Status:</strong> <span className="badge badge-sage">Confirmed</span></div>
              <div><strong>Specialist:</strong> {selectedDoctor.doctorName} ({selectedDoctor.specialty})</div>
              <div><strong>Date & Time:</strong> {confirmedBooking.appointmentDate} at {confirmedBooking.appointmentTime} – {confirmedBooking.endTime} IST</div>
              <div><strong>Email Confirmation:</strong> Dispatched to {confirmedBooking.email}</div>
              <div><strong>Verification Token:</strong> <code style={{ backgroundColor: '#E2E8F0', padding: '0.15rem 0.35rem', borderRadius: 4 }}>{confirmedBooking.verificationToken}</code></div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <CalendarCheck size={16} color="var(--color-primary)" /> Add to Google Calendar <ExternalLink size={14} />
              </a>

              <Link
                to={`/manage?bookingId=${confirmedBooking.bookingId}&token=${confirmedBooking.verificationToken}`}
                className="btn btn-outline-primary"
              >
                Manage or Reschedule Visit
              </Link>

              <Link to="/" className="btn btn-primary">
                Return to Clinic Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
