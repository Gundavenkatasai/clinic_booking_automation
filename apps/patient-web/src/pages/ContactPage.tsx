import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, AlertCircle, CheckCircle2, Send } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && message) {
      setSent(true);
    }
  };

  return (
    <div className="section" style={{ minHeight: '80vh', backgroundColor: 'var(--color-bg)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
          <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>Get in Touch</span>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Contact Aura Health Clinic</h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)' }}>
            We are here to assist with your appointments, questions regarding our clinical departments, and consultation logistics.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          {/* Clinic Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card">
              <h2 style={{ fontSize: '1.375rem', marginBottom: '1.25rem' }}>Clinic Information</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9375rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <MapPin size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-main)' }}>Location</strong>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      42 Heritage Avenue, 3rd Block, Koramangala, Bengaluru, Karnataka 560034
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <Phone size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-main)' }}>Telephone Appointments</strong>
                    <span style={{ color: 'var(--color-text-muted)' }}>+91 (80) 4123-8899 / +91 (80) 4123-8890</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <Mail size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-main)' }}>Email Enquiries</strong>
                    <span style={{ color: 'var(--color-text-muted)' }}>care@auraclinic.com</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <Clock size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-main)' }}>Outpatient Working Hours</strong>
                    <span style={{ color: 'var(--color-text-muted)' }}>Monday to Friday: 08:30 AM – 06:00 PM IST</span>
                    <br />
                    <span style={{ color: 'var(--color-text-muted)' }}>Saturday: 09:00 AM – 04:30 PM IST</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Notice */}
            <div className="card" style={{ backgroundColor: 'var(--color-warning-bg)', borderColor: '#FEDF89', color: '#92400E' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Urgent Medical Notice</strong>
                  <p style={{ fontSize: '0.875rem', color: '#92400E', lineHeight: 1.5 }}>
                    For acute cardiovascular emergencies, severe trauma, or life-threatening symptoms, please immediately proceed to the nearest emergency room or dial emergency medical services (108 / 112).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Inquiry Form */}
          <div className="card">
            <h2 style={{ fontSize: '1.375rem', marginBottom: '0.5rem' }}>Send Us a Message</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
              Have questions regarding specialized treatments or medical records? Send our front desk an inquiry.
            </p>

            {sent ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)' }}>
                <CheckCircle2 size={36} style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Message Received</h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)' }}>
                  Thank you for contacting Aura Health. A clinic coordinator will respond to your inquiry within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="contact-name" className="form-label">Your Name *</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Ramesh Chandra"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-email" className="form-label">Email Address *</label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="ramesh@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-subject" className="form-label">Subject</label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Diagnostic report inquiry"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-message" className="form-label">Message *</label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="form-textarea"
                    placeholder="How may our clinical team assist you?"
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  <Send size={16} /> Send Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
