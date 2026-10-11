import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../api/client';
import { Doctor } from '@clinic/shared';

export const DoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Doctor | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [workingDays, setWorkingDays] = useState('Monday, Tuesday, Wednesday, Thursday, Friday');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('17:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [active, setActive] = useState(true);
  const [bio, setBio] = useState('');

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDoctors();
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch doctor records');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const openAddModal = () => {
    setDoctorName('');
    setSpecialty('');
    setQualifications('');
    setWorkingDays('Monday, Tuesday, Wednesday, Thursday, Friday');
    setOpeningTime('09:00');
    setClosingTime('17:00');
    setDurationMinutes(30);
    setActive(true);
    setBio('');
    setShowAddModal(true);
  };

  const openEditModal = (doc: Doctor) => {
    setSelectedDoc(doc);
    setDoctorName(doc.doctorName);
    setSpecialty(doc.specialty || '');
    setQualifications(doc.qualifications || '');
    setWorkingDays(doc.workingDays);
    setOpeningTime(doc.openingTime);
    setClosingTime(doc.closingTime);
    setDurationMinutes(doc.durationMinutes);
    setActive(doc.active);
    setBio(doc.bio || '');
    setShowEditModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminApi.createDoctor({
        doctorName,
        specialty,
        qualifications,
        workingDays,
        openingTime,
        closingTime,
        durationMinutes,
        active,
        bio,
      });
      setShowAddModal(false);
      fetchDoctors();
    } catch (err: any) {
      alert(`Creation error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setActionLoading(true);
    try {
      await adminApi.updateDoctor(selectedDoc.doctorId, {
        doctorName,
        specialty,
        qualifications,
        workingDays,
        openingTime,
        closingTime,
        durationMinutes,
        active,
        bio,
      });
      setShowEditModal(false);
      fetchDoctors();
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '0.25rem' }}>
            Specialist Profiles & Hours Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)' }}>
            Google Sheets `Doctors` sheet schema configuration and consultation schedules.
          </p>
        </div>

        <button type="button" onClick={openAddModal} className="btn-admin btn-admin-primary">
          <Plus size={16} /> Add New Doctor Profile
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Doctors Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Doctor ID</th>
              <th>Doctor Name</th>
              <th>Specialty</th>
              <th>Working Days</th>
              <th>Operating Hours (IST)</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--admin-primary)' }} />
                  <div>Loading doctor profiles from Google Sheets database...</div>
                </td>
              </tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                  No doctors configured.
                </td>
              </tr>
            ) : (
              doctors.map((doc) => (
                <tr key={doc.doctorId}>
                  <td>
                    <span className="code-ref">{doc.doctorId}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{doc.doctorName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                      {doc.qualifications}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem', color: 'var(--admin-text-main)', fontWeight: 500 }}>
                      {doc.specialty || 'General Medicine'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--admin-text-muted)' }}>
                      {doc.workingDays}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}>
                      <Clock size={13} color="var(--admin-primary)" />
                      {doc.openingTime} – {doc.closingTime}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{doc.durationMinutes} min</span>
                  </td>
                  <td>
                    <span
                      className="status-pill"
                      style={{
                        backgroundColor: doc.active ? 'var(--admin-confirmed-bg)' : '#F3F4F6',
                        color: doc.active ? '#065F46' : '#6B7280',
                        border: `1px solid ${doc.active ? 'var(--admin-confirmed-border)' : '#E5E7EB'}`,
                      }}
                    >
                      {doc.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openEditModal(doc)}
                      className="btn-admin btn-admin-secondary"
                      style={{ padding: '0.3rem 0.6rem' }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD DOCTOR MODAL */}
      {showAddModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-panel" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Create Specialist Profile</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--admin-text-muted)', marginBottom: '1.5rem' }}>
              Maps to Google Sheets `Doctors` columns: doctorId, doctorName, workingDays, openingTime, closingTime, durationMinutes, active.
            </p>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Doctor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kavita Deshmukh"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Specialty / Medical Department *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Neurology & Stroke Care"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Qualifications
                </label>
                <input
                  type="text"
                  placeholder="e.g. MD, DM, FRCP"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Working Days (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Opening Time (HH:MM) *
                  </label>
                  <input
                    type="time"
                    required
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Closing Time (HH:MM) *
                  </label>
                  <input
                    type="time"
                    required
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="admin-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Slot Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Active Status
                  </label>
                  <select
                    value={active ? 'true' : 'false'}
                    onChange={(e) => setActive(e.target.value === 'true')}
                    className="admin-select"
                  >
                    <option value="true">Active (Accepts Bookings)</option>
                    <option value="false">Inactive (Paused)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Professional Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="admin-input"
                  placeholder="Clinical experience and background..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-admin btn-admin-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin btn-admin-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Save Doctor Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCTOR MODAL */}
      {showEditModal && selectedDoc && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-panel" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Edit Specialist Configuration</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--admin-text-muted)', marginBottom: '1.5rem' }}>
              Updating <span className="code-ref">{selectedDoc.doctorId}</span> ({selectedDoc.doctorName})
            </p>

            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Doctor Name *
                </label>
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Specialty
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Working Days *
                </label>
                <input
                  type="text"
                  required
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Opening Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Closing Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="admin-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Slot Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Active Status
                  </label>
                  <select
                    value={active ? 'true' : 'false'}
                    onChange={(e) => setActive(e.target.value === 'true')}
                    className="admin-select"
                  >
                    <option value="true">Active (Accepts Bookings)</option>
                    <option value="false">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Professional Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-admin btn-admin-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin btn-admin-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Update Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
