import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { dataStore } from '../src/store/dataStore.js';
import { reservationStore } from '../src/store/reservationStore.js';

const app = createApp();

describe('Aura Health Clinic API Test Suite', () => {
  beforeEach(() => {
    dataStore.resetToDefault();
    reservationStore.clearAll();
  });

  describe('Health Check Endpoint', () => {
    it('returns 200 and healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toContain('Aura Health Clinic');
    });
  });

  describe('Doctor Directory & Availability', () => {
    it('lists active doctors', async () => {
      const res = await request(app).get('/api/doctors');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Inactive doctor DOC-105 should be excluded by default
      const inactive = res.body.data.find((d: any) => d.doctorId === 'DOC-105');
      expect(inactive).toBeUndefined();
    });

    it('rejects availability check for inactive doctor', async () => {
      const res = await request(app).get('/api/doctors/DOC-105/availability?date=2026-10-15');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DOCTOR_INACTIVE');
    });

    it('returns empty slots for a non-working day', async () => {
      // Dr. Ananya Sharma (DOC-101) works Mon-Fri. 2026-10-18 is Sunday.
      const res = await request(app).get('/api/doctors/DOC-101/availability?date=2026-10-18');
      expect(res.status).toBe(200);
      expect(res.body.data.isWorkingDay).toBe(false);
      expect(res.body.data.slots).toHaveLength(0);
    });

    it('returns calculated slots for a valid working day', async () => {
      // 2026-10-19 is Monday
      const res = await request(app).get('/api/doctors/DOC-101/availability?date=2026-10-19');
      expect(res.status).toBe(200);
      expect(res.body.data.isWorkingDay).toBe(true);
      expect(res.body.data.slots.length).toBeGreaterThan(0);
      expect(res.body.data.slots[0].time).toBe('09:00');
    });
  });

  describe('Booking Workflow & Concurrency', () => {
    const validBooking = {
      doctorId: 'DOC-101',
      appointmentDate: '2026-10-20', // Tuesday
      appointmentTime: '10:00',
      patientName: 'Kavita Rao',
      email: 'kavita.rao@example.com',
      phone: '+919876543210',
      reasonForVisit: 'Routine cardiac health screening',
      consentAgreed: true,
    };

    it('successfully creates a valid booking and returns confirmation', async () => {
      const res = await request(app).post('/api/bookings').send(validBooking);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingId).toMatch(/^APT-/);
      expect(res.body.data.verificationToken).toBeDefined();
      expect(res.body.data.status).toBe('confirmed');
      expect(res.body.data.patientName).toBe('Kavita Rao');
    });

    it('rejects booking for an unknown doctor', async () => {
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        doctorId: 'DOC-999-NONEXISTENT',
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
    });

    it('rejects booking for an inactive doctor', async () => {
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        doctorId: 'DOC-105',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DOCTOR_INACTIVE');
    });

    it('rejects booking with invalid email', async () => {
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        email: 'not-an-email',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects booking with missing consent', async () => {
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        consentAgreed: false,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects booking for non-working day', async () => {
      // 2026-10-18 is Sunday
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        appointmentDate: '2026-10-18',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NON_WORKING_DAY');
    });

    it('rejects booking with an invalid/misaligned slot time', async () => {
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        appointmentTime: '09:17', // Not aligned with 30 min duration
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SLOT_TIME');
    });

    it('rejects duplicate booking for an already booked slot', async () => {
      // First booking succeeds
      const res1 = await request(app).post('/api/bookings').send(validBooking);
      expect(res1.status).toBe(201);

      // Second booking for identical slot must fail with 409
      const res2 = await request(app).post('/api/bookings').send({
        ...validBooking,
        patientName: 'Second Patient',
        email: 'second@example.com',
      });
      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('SLOT_UNAVAILABLE');
    });

    it('handles idempotent retries without duplicating appointments', async () => {
      const idempotencyKey = 'unique-client-uuid-12345';
      const payload = { ...validBooking, idempotencyKey };

      const res1 = await request(app).post('/api/bookings').send(payload);
      expect(res1.status).toBe(201);
      const bookingId = res1.body.data.bookingId;

      // Duplicate network attempt with same key
      const res2 = await request(app).post('/api/bookings').send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.data.bookingId).toBe(bookingId);
      expect(res2.body.message).toContain('idempotent');
    });

    it('simulates concurrent requests where only one can reserve the slot', async () => {
      const slotKey = reservationStore.getSlotKey('DOC-101', '2026-10-21', '11:00');
      
      // Simulate two simultaneous requests trying to acquire lock
      const acquired1 = reservationStore.acquireLock(slotKey, 'req_1');
      const acquired2 = reservationStore.acquireLock(slotKey, 'req_2');

      expect(acquired1).toBe(true);
      expect(acquired2).toBe(false); // Second concurrent request safely blocked!
    });
  });

  describe('Manage Appointment (Verify, Cancel, Reschedule)', () => {
    let bookingId: string;
    let verificationToken: string;

    beforeEach(async () => {
      const res = await request(app).post('/api/bookings').send({
        doctorId: 'DOC-101',
        appointmentDate: '2026-10-22',
        appointmentTime: '14:00',
        patientName: 'Dev Sharma',
        email: 'dev@example.com',
        phone: '+919988776655',
        consentAgreed: true,
      });
      bookingId = res.body.data.bookingId;
      verificationToken = res.body.data.verificationToken;
    });

    it('allows patient to verify and view their appointment using verification token', async () => {
      const res = await request(app).post('/api/bookings/verify').send({
        bookingId,
        verificationToken,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment.bookingId).toBe(bookingId);
    });

    it('allows patient to verify using their registered email address', async () => {
      const res = await request(app).post('/api/bookings/verify').send({
        bookingId,
        verificationToken: 'dev@example.com',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.appointment.patientName).toBe('Dev Sharma');
    });

    it('rejects unauthorized verification attempt', async () => {
      const res = await request(app).post('/api/bookings/verify').send({
        bookingId,
        verificationToken: 'wrong-token',
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('VERIFICATION_FAILED');
    });

    it('allows authorized cancellation and releases slot lock', async () => {
      const res = await request(app).post('/api/bookings/cancel').send({
        bookingId,
        verificationToken,
        reason: 'Schedule conflict',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');

      // Now another patient can book the released slot
      const rebookRes = await request(app).post('/api/bookings').send({
        doctorId: 'DOC-101',
        appointmentDate: '2026-10-22',
        appointmentTime: '14:00',
        patientName: 'New Patient',
        email: 'new@example.com',
        phone: '+919123456789',
        consentAgreed: true,
      });
      expect(rebookRes.status).toBe(201);
    });

    it('rejects repeated cancellation of an already cancelled appointment', async () => {
      await request(app).post('/api/bookings/cancel').send({
        bookingId,
        verificationToken,
      });
      const res = await request(app).post('/api/bookings/cancel').send({
        bookingId,
        verificationToken,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ALREADY_CANCELLED');
    });

    it('allows rescheduling to a newly available slot', async () => {
      const res = await request(app).post('/api/bookings/reschedule').send({
        bookingId,
        verificationToken,
        newDate: '2026-10-22',
        newTime: '15:00',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rescheduled');
      expect(res.body.data.appointmentTime).toBe('15:00');
    });
  });

  describe('Admin Operations & Security', () => {
    let adminToken: string;

    beforeEach(async () => {
      const res = await request(app).post('/api/admin/auth/login').send({
        username: 'admin@auraclinic.com',
        password: 'AuraClinicAdmin2026!',
      });
      adminToken = res.body.data.token;
    });

    it('rejects unauthorized access to admin endpoints', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('allows authenticated admin to access dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.doctorCount).toBeGreaterThan(0);
      expect(typeof res.body.data.confirmedAppointments).toBe('number');
    });

    it('allows admin to list and search appointments', async () => {
      const res = await request(app)
        .get('/api/admin/appointments')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('allows admin to create and update doctor profiles', async () => {
      // Create new doctor
      const createRes = await request(app)
        .post('/api/admin/doctors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: 'DOC-200',
          doctorName: 'Dr. Rohan Kapoor',
          specialty: 'Neurology',
          workingDays: 'Monday, Wednesday, Friday',
          openingTime: '10:00',
          closingTime: '16:00',
          durationMinutes: 30,
          active: true,
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.data.doctorId).toBe('DOC-200');

      // Update doctor
      const updateRes = await request(app)
        .patch('/api/admin/doctors/DOC-200')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          active: false,
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.active).toBe(false);
    });

    it('records audit log entries for operational actions', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
