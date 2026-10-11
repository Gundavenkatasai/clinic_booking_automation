import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  ShieldCheck,
  Stethoscope,
  Heart,
  Baby,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  CalendarCheck,
  MailCheck,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { Doctor } from '@clinic/shared';

export const HomePage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const services = [
    {
      icon: <Heart size={24} color="#176B65" />,
      title: 'Cardiology & Heart Care',
      desc: 'Preventive cardiovascular risk assessments, clinical ECG reviews, and hypertension consultations.',
    },
    {
      icon: <Baby size={24} color="#176B65" />,
      title: 'Pediatrics & Child Wellness',
      desc: 'Gentle developmental screenings, neonatal monitoring, and compassionate care for children and teens.',
    },
    {
      icon: <Sparkles size={24} color="#176B65" />,
      title: 'Dermatology & Skin Care',
      desc: 'Targeted diagnosis for chronic dermatological conditions, allergies, and therapeutic skin therapies.',
    },
    {
      icon: <Stethoscope size={24} color="#176B65" />,
      title: 'General & Family Medicine',
      desc: 'Holistic primary care, routine preventative checkups, and chronic lifestyle disease management.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Select Your Specialist',
      desc: 'Browse certified physicians with transparent consultation hours and clinical specialties.',
    },
    {
      step: '02',
      title: 'Choose a Verified Time Slot',
      desc: 'Live availability calculated directly from actual doctor hours in India Standard Time.',
    },
    {
      step: '03',
      title: 'Instant Calendar & Email Sync',
      desc: 'Receive immediate Google Calendar scheduling and a detailed Gmail confirmation with easy manage links.',
    },
  ];

  const faqs = [
    {
      q: 'How quickly is my appointment confirmed?',
      a: 'Instantly. Your appointment is reserved with atomic concurrency protection, synched directly to Google Calendar, and confirmed via Gmail in real-time.',
    },
    {
      q: 'Can I reschedule or cancel my appointment later?',
      a: 'Yes. Every booking includes a secure reference ID and verification token allowing you to reschedule or cancel your visit online at any time.',
    },
    {
      q: 'What consultation timezone is used?',
      a: 'All appointment times and Google Calendar schedules are coordinated in India Standard Time (IST).',
    },
    {
      q: 'Do I need to create an account to book?',
      a: 'No account registration is required. You simply provide your contact details during booking.',
    },
  ];

  return (
    <div>
      {/* HERO SECTION */}
      <section style={{ backgroundColor: 'var(--color-bg)', padding: '5rem 0 4rem', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-secondary-sage-light)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-secondary-sage)', marginBottom: '1.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#175242' }}>
              <ShieldCheck size={14} /> Certified Outpatient Medical Care
            </div>
            <h1 style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', color: 'var(--color-text-main)', marginBottom: '1.5rem', lineHeight: 1.15 }}>
              Thoughtful healthcare, scheduled around your life.
            </h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '2.25rem', maxWidth: '540px' }}>
              Experience clinical consultations with attentive doctors. Direct scheduling, real-time availability, and instant Google Calendar & Gmail confirmations.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <Link to="/book" className="btn btn-primary" style={{ padding: '0.875rem 1.75rem', fontSize: '1rem' }} id="hero-book-btn">
                <Calendar size={18} /> Book Your Appointment
              </Link>
              <Link to="/doctors" className="btn btn-secondary" style={{ padding: '0.875rem 1.5rem', fontSize: '1rem' }}>
                Meet Our Specialists <ArrowRight size={16} />
              </Link>
            </div>

            {/* Quick Guarantees */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={16} color="var(--color-primary)" /> No waiting room queues
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <CalendarCheck size={16} color="var(--color-primary)" /> Direct Calendar invites
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <MailCheck size={16} color="var(--color-primary)" /> Easy online rescheduling
              </span>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div>
            <div className="card" style={{ padding: '2.25rem', backgroundColor: '#FFFFFF', position: 'relative', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <span className="badge badge-sage" style={{ marginBottom: '0.5rem' }}>Today's Availability</span>
                  <h3 style={{ fontSize: '1.375rem', color: 'var(--color-text-main)' }}>Aura Health Outpatient Center</h3>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={22} color="var(--color-primary)" />
                </div>
              </div>

              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
                Our physicians offer focused one-on-one appointments. Check real availability across cardiology, pediatrics, dermatology, and family health:
              </p>

              {/* Sample Doctor Row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                <div style={{ padding: '1rem', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Dr. Ananya Sharma</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Cardiology • 30 min consults</div>
                  </div>
                  <span className="badge badge-teal">Mon – Fri</span>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Dr. Rajesh Kumar</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Pediatrics • 20 min consults</div>
                  </div>
                  <span className="badge badge-teal">Mon – Sat</span>
                </div>
              </div>

              <Link to="/book" className="btn btn-primary" style={{ width: '100%' }}>
                Select a Specialist & Slot
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CLINICAL SERVICES SECTION */}
      <section className="section" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
            <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>Clinical Excellence</span>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>Focused Outpatient Specializations</h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>
              Comprehensive care delivered by experienced practitioners equipped with modern clinical diagnostics.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            {services.map((svc, i) => (
              <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  {svc.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{svc.title}</h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '1.5rem', flexGrow: 1 }}>
                  {svc.desc}
                </p>
                <Link to="/book" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                  Schedule Consultation <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEET OUR DOCTORS SECTION */}
      <section className="section" style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
            <div>
              <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>Medical Staff</span>
              <h2 style={{ fontSize: '2.25rem' }}>Our Certified Specialists</h2>
            </div>
            <Link to="/doctors" className="btn btn-secondary">
              View All Doctors <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Loading active doctors...</div>
            </div>
          ) : error ? (
            <div className="card" style={{ backgroundColor: 'var(--color-error-bg)', borderColor: '#FECDCA', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={20} />
              <span>Failed to load doctors: {error}</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
              {(doctors || []).slice(0, 4).map((doc) => (
                <div key={doc.doctorId} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{doc.doctorName}</h3>
                      <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                        {doc.specialty || 'Consultant Physician'}
                      </div>
                    </div>
                    <span className="badge badge-sage">{doc.durationMinutes} min</span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                    {doc.qualifications}
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.5rem', flexGrow: 1 }}>
                    {doc.bio || 'Experienced clinic specialist providing patient-centered diagnosis and consultation.'}
                  </p>

                  <div style={{ padding: '0.875rem', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-main)', fontWeight: 500 }}>
                      <Clock size={13} color="var(--color-primary)" /> {doc.openingTime} – {doc.closingTime} IST
                    </div>
                    <div style={{ marginTop: '0.25rem', color: 'var(--color-text-muted)' }}>
                      Days: {doc.workingDays}
                    </div>
                  </div>

                  <Link to={`/book?doctor=${doc.doctorId}`} className="btn btn-outline-primary" style={{ width: '100%' }}>
                    Book with {doc.doctorName.split(' ')[1] || 'Doctor'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW APPOINTMENT BOOKING WORKS */}
      <section className="section" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
            <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>Simple Process</span>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>How Online Booking Works</h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>
              Transparent scheduling in under two minutes with zero guesswork.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
            {steps.map((st, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-serif)', color: 'var(--color-secondary-sage)', fontWeight: 700, marginBottom: '0.75rem' }}>
                  {st.step}
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{st.title}</h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  {st.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <Link to="/book" className="btn btn-primary" style={{ padding: '0.875rem 2rem' }}>
              Begin Booking Now
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="section" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>Frequently Asked</span>
            <h2 style={{ fontSize: '2.25rem' }}>Questions About Appointments</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {faqs.map((f, i) => (
              <div key={i} className="card" style={{ padding: '1.5rem 2rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>{f.q}</h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
