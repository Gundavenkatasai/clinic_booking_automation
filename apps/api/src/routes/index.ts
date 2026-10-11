import { Router, Request, Response } from 'express';
import { DoctorController } from '../controllers/doctorController.js';
import { BookingController } from '../controllers/bookingController.js';
import { AdminController } from '../controllers/adminController.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { publicBookingLimiter, authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// ==========================================
// HEALTH CHECK
// ==========================================
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Aura Health Clinic API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ==========================================
// PATIENT / PUBLIC ROUTES
// ==========================================
router.get('/doctors', DoctorController.getDoctors);
router.get('/doctors/:doctorId', DoctorController.getDoctorById);
router.get('/doctors/:doctorId/availability', DoctorController.getDoctorAvailability);

router.post('/bookings', publicBookingLimiter, BookingController.createBooking);
router.post('/bookings/verify', BookingController.verifyBooking);
router.post('/bookings/cancel', BookingController.cancelBooking);
router.post('/bookings/reschedule', BookingController.rescheduleBooking);

// ==========================================
// ADMIN ROUTES
// ==========================================
// Auth
router.post('/admin/auth/login', authLimiter, AdminController.login);
router.post('/admin/auth/logout', AdminController.logout);
router.get('/admin/auth/me', requireAdminAuth, AdminController.me);

// Operations Dashboard
router.get('/admin/dashboard', requireAdminAuth, AdminController.getDashboardMetrics);

// Appointments
router.get('/admin/appointments', requireAdminAuth, AdminController.getAppointments);
router.get('/admin/appointments/:bookingId', requireAdminAuth, AdminController.getAppointmentById);
router.post('/admin/appointments/:bookingId/cancel', requireAdminAuth, AdminController.cancelAppointment);
router.post('/admin/appointments/:bookingId/reschedule', requireAdminAuth, AdminController.rescheduleAppointment);

// Doctor Management
router.get('/admin/doctors', requireAdminAuth, AdminController.getDoctors);
router.post('/admin/doctors', requireAdminAuth, AdminController.createDoctor);
router.patch('/admin/doctors/:doctorId', requireAdminAuth, AdminController.updateDoctor);

// Audit Logs
router.get('/admin/audit-logs', requireAdminAuth, AdminController.getAuditLogs);

export default router;
