import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { dataStore } from '../src/store/dataStore.js';
import { reservationStore } from '../src/store/reservationStore.js';

const app = createApp();

describe('Aura Health Clinic API Test Suite', () => {
  beforeEach(() => {
    dataStore.resetToDefault();
    reservationStore.clearAll();

    // Default test webhook configuration
    config.n8nBookingWebhookUrl =
      'https://sitting-possibilities-savannah-upgrade.trycloudflare.com/webhook/clinic-booking';
    config.n8nCancellationWebhookUrl =
      'https://sitting-possibilities-savannah-upgrade.trycloudflare.com/webhook/clinic-cancel';
    config.n8nRescheduleWebhookUrl =
      'https://sitting-possibilities-savannah-upgrade.trycloudflare.com/webhook/clinic-reschedule';

    // Mock fetch by default to prevent real n8n/Google calls in automated tests
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/webhook/clinic-booking')) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Appointment booked successfully',
            calendarEventId: 'gcal_mock_event_123',
            emailStatus: 'sent',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/webhook/clinic-cancel')) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Your appointment has been cancelled.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/webhook/clinic-reschedule')) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Your appointment has been rescheduled successfully.',
            calendarEventId: 'gcal_mock_rescheduled_123',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    it('forwards booking to configured n8n URL with matching JSON field names', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res = await request(app).post('/api/bookings').send(validBooking);
      expect(res.status).toBe(201);

      expect(fetchSpy).toHaveBeenCalled();
      const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe(config.n8nBookingWebhookUrl);
      expect(calledInit?.method).toBe('POST');
      expect(calledInit?.headers).toMatchObject({
        'Content-Type': 'application/json',
      });

      const sentPayload = JSON.parse(calledInit?.body as string);
      expect(sentPayload.action).toBe('CREATE_APPOINTMENT');
      expect(sentPayload.patientName).toBe('Kavita Rao');
      expect(sentPayload.email).toBe('kavita.rao@example.com');
      expect(sentPayload.phone).toBe('+919876543210');
      expect(sentPayload.doctorId).toBe('DOC-101');
      expect(sentPayload.appointmentDate).toBe('2026-10-20');
      expect(sentPayload.appointmentTime).toBe('10:00');
      expect(sentPayload.consent).toBe(true);
      expect(sentPayload.doctorName).toBe('Dr. Ananya Sharma');
      expect(sentPayload.bookingId).toMatch(/^APT-/);
      expect(sentPayload.calendarName).toBe('Clinic Appointments');
      expect(sentPayload.sheetsDocument).toBe('Clinic Booking Database');
    });

    it('rejects booking for an unknown doctor before calling n8n', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        doctorId: 'DOC-999-NONEXISTENT',
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects booking for an inactive doctor before calling n8n', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        doctorId: 'DOC-105',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DOCTOR_INACTIVE');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects booking with invalid email', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        email: 'not-an-email',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects booking with missing consent', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        consentAgreed: false,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects booking for non-working day', async () => {
      // 2026-10-18 is Sunday
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        appointmentDate: '2026-10-18',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NON_WORKING_DAY');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects booking with an invalid/misaligned slot time', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res = await request(app).post('/api/bookings').send({
        ...validBooking,
        appointmentTime: '09:17',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SLOT_TIME');
      expect(fetchSpy).not.toHaveBeenCalled();
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

    it('handles idempotent retries without duplicating appointments or re-calling n8n', async () => {
      const idempotencyKey = 'unique-client-uuid-12345';
      const payload = { ...validBooking, idempotencyKey };

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res1 = await request(app).post('/api/bookings').send(payload);
      expect(res1.status).toBe(201);
      const bookingId = res1.body.data.bookingId;
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Duplicate network attempt with same key
      const res2 = await request(app).post('/api/bookings').send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.data.bookingId).toBe(bookingId);
      expect(res2.body.message).toContain('idempotent');
      // fetch must NOT be called again
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('simulates concurrent requests where only one can reserve the slot', async () => {
      const slotKey = reservationStore.getSlotKey('DOC-101', '2026-10-21', '11:00');
      const acquired1 = reservationStore.acquireLock(slotKey, 'req_1');
      const acquired2 = reservationStore.acquireLock(slotKey, 'req_2');

      expect(acquired1).toBe(true);
      expect(acquired2).toBe(false);
    });

    it('returns 503 error when N8N_BOOKING_WEBHOOK_URL is missing', async () => {
      config.n8nBookingWebhookUrl = '';
      const res = await request(app).post('/api/bookings').send(validBooking);
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('N8N_NOT_CONFIGURED');

      // Verify no booking was persisted
      expect(dataStore.getAllAppointments()).toHaveLength(0);
    });

    it('handles n8n 409 conflict error correctly and releases slot lock', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            message: 'The requested appointment slot is unavailable.',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await request(app).post('/api/bookings').send(validBooking);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');

      // Check that appointment was NOT saved
      expect(dataStore.getAllAppointments()).toHaveLength(0);

      // Check slot lock was released
      const slotKey = reservationStore.getSlotKey('DOC-101', '2026-10-20', '10:00');
      expect(reservationStore.isSlotLocked(slotKey)).toBe(false);
    });

    it('handles n8n 500 error gracefully with 502 Bad Gateway and releases lock', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await request(app).post('/api/bookings').send(validBooking);
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('N8N_SERVICE_ERROR');

      expect(dataStore.getAllAppointments()).toHaveLength(0);
      const slotKey = reservationStore.getSlotKey('DOC-101', '2026-10-20', '10:00');
      expect(reservationStore.isSlotLocked(slotKey)).toBe(false);
    });

    it('handles n8n network timeout with 504 Gateway Timeout and releases lock', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      });

      const res = await request(app).post('/api/bookings').send(validBooking);
      expect(res.status).toBe(504);
      expect(res.body.error.code).toBe('N8N_TIMEOUT');

      expect(dataStore.getAllAppointments()).toHaveLength(0);
      const slotKey = reservationStore.getSlotKey('DOC-101', '2026-10-20', '10:00');
      expect(reservationStore.isSlotLocked(slotKey)).toBe(false);
    });

    it('handles n8n unreachability with 503 Service Unavailable', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
        throw new TypeError('fetch failed');
      });

      const res = await request(app).post('/api/bookings').send(validBooking);
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('N8N_UNAVAILABLE');

      expect(dataStore.getAllAppointments()).toHaveLength(0);
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

  describe('CORS Restrictions', () => {
    it('allows requests from deployed patient frontend', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://aura-clinic-patient.vercel.app');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(
        'https://aura-clinic-patient.vercel.app'
      );
    });

    it('allows requests from deployed admin dashboard', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://aura-clinic-admin-one.vercel.app');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(
        'https://aura-clinic-admin-one.vercel.app'
      );
    });

    it('rejects unauthorized origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-origin.com');
      expect(res.status).toBe(500); // Express CORS middleware errors on forbidden origin
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('rejects arbitrary vercel subdomains that are not the clinic apps', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://unauthorized-app.vercel.app');
      expect(res.status).toBe(500);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
