import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Baby,
  Sparkles,
  Stethoscope,
  Activity,
  ClipboardList,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const serviceCategories = [
    {
      icon: <Heart size={28} color="#176B65" />,
      title: 'Preventive Cardiology & Vascular Health',
      desc: 'Focused screening for hypertension, lipid disorders, coronary heart disease, and non-invasive cardiovascular reviews.',
      details: [
        'Resting 12-lead ECG interpretation',
        'Clinical ambulatory blood pressure monitoring',
        'Cardiovascular lifestyle & dietary risk counselling',
        'Post-intervention outpatient follow-ups',
      ],
    },
    {
      icon: <Baby size={28} color="#176B65" />,
      title: 'Pediatrics & Adolescent Medicine',
      desc: 'Compassionate medical care for newborns, toddlers, and teenagers by senior consultant pediatricians.',
      details: [
        'Comprehensive newborn growth and developmental tracking',
        'Childhood allergy assessment and chronic asthma management',
        'Pediatric nutritional guidance',
        'Adolescent wellness and preventive health evaluations',
      ],
    },
    {
      icon: <Sparkles size={28} color="#176B65" />,
      title: 'Dermatology & Skin Wellness',
      desc: 'Expert clinical diagnosis and dermatological therapies for chronic skin conditions, hair disorders, and nails.',
      details: [
        'Adult and pediatric eczema and psoriasis management',
        'Acne vulgaris protocols and barrier restoration',
        'Allergy patch testing and contact dermatitis screening',
        'Dermoscopy examination for skin lesions',
      ],
    },
    {
      icon: <Stethoscope size={28} color="#176B65" />,
      title: 'Primary & Family Healthcare',
      desc: 'Your first point of medical contact for acute illnesses, seasonal infections, and ongoing lifestyle health management.',
      details: [
        'Type 2 diabetes and metabolic syndrome screening',
        'Thyroid dysfunction diagnosis and titration',
        'Routine annual adult executive checkups',
        'Prescription review and specialist referral coordination',
      ],
    },
    {
      icon: <Activity size={28} color="#176B65" />,
      title: 'Diagnostic Consultations',
      desc: 'In-depth secondary evaluations of lab work, imaging reports, and unexplained persistent symptoms.',
      details: [
        'Biochemical panel and blood count review',
        'Preventive biomarker tracking',
        'Medication interaction safety audits',
      ],
    },
    {
      icon: <ClipboardList size={28} color="#176B65" />,
      title: 'Chronic Care Continuity',
      desc: 'Structured longitudinal follow-up visits designed to maintain health stability and reduce hospital readmissions.',
      details: [
        'Regular clinical milestone reviews',
        'Direct patient notes sent via secure email',
        'Flexible online rescheduling when needed',
      ],
    },
  ];

  return (
    <div className="section" style={{ minHeight: '80vh' }}>
      <div className="container">
        {/* Header */}
        <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
          <span className="badge badge-sage" style={{ marginBottom: '0.75rem' }}>Our Services</span>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Clinical Specializations & Services</h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)' }}>
            We provide structured, evidence-based outpatient consultations. Every appointment is allocated deliberate consultation time without rushing.
          </p>
        </div>

        {/* Services Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2.5rem' }}>
          {serviceCategories.map((svc, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                {svc.icon}
              </div>
              <h2 style={{ fontSize: '1.375rem', marginBottom: '0.75rem' }}>{svc.title}</h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {svc.desc}
              </p>

              <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.75rem' }}>
                  What is included:
                </h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
                  {svc.details.map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/book" className="btn btn-outline-primary" style={{ width: '100%' }}>
                  <Calendar size={15} /> Book This Service
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
