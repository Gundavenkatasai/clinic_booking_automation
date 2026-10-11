import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  AdminLoginSchema,
  CreateDoctorSchema,
  UpdateDoctorSchema,
  AdminUser,
  DashboardMetrics,
} from '@clinic/shared';
import { config } from '../config.js';
import { dataStore } from '../store/dataStore.js';
import { reservationStore } from '../store/reservationStore.js';
import { auditService } from '../services/auditService.js';
import { n8nService } from '../services/n8nService.js';
import { calculateDoctorSlots } from '../utils/slotCalculator.js';
import crypto from 'crypto';

export class AdminController {
  /**
   * Admin Authentication / Sign In
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const validated = AdminLoginSchema.parse(req.body);

      // Verify credentials
      const validUser =
        validated.username.toLowerCase() === config.adminUsername.toLowerCase() &&
        validated.password === config.adminPassword;

      if (!validUser) {
        auditService.record({
          actor: validated.username,
          action: 'ADMIN_LOGIN_FAILED',
          details: 'Failed authentication attempt with invalid credentials',
          ipAddress: req.ip,
        });

        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
          },
        });
        return;
      }

      const user: AdminUser = {
        id: 'usr_admin_1',
        username: config.adminUsername,
        name: 'Clinical Administrator',
        role: 'admin',
      };

      const token = jwt.sign(user, config.jwtSecret, { expiresIn: '24h' });

      // Set cookie for browser sessions
      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      auditService.record({
        actor: user.username,
        action: 'ADMIN_LOGIN_SUCCESS',
        details: 'Administrator successfully logged into operations console',
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: {
          token,
          user,
        },
        message: 'Authentication successful',
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors?.[0]?.message || 'Invalid input' },
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'LOGIN_ERROR', message: err.message },
      });
    }
  }

  /**
   * Admin Sign Out
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('admin_token');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  /**
   * Current Admin Profile
   */
  public static async me(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: req.user,
    });
  }

  /**
   * Real-Time Clinical Operations Dashboard Metrics
   */
  public static async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const appointments = dataStore.getAllAppointments();
      const doctors = dataStore.getAllDoctors();
      const todayStr = new Date().toISOString().split('T')[0];

      const appointmentsToday = appointments.filter(
        (a) => a.appointmentDate === todayStr && a.status !== 'cancelled'
      ).length;

      const upcomingAppointments = appointments.filter(
        (a) => a.appointmentDate > todayStr && a.status !== 'cancelled'
      ).length;

      const confirmedAppointments = appointments.filter(
        (a) => a.status === 'confirmed' || a.status === 'rescheduled'
      ).length;

      const pendingAppointments = appointments.filter((a) => a.status === 'pending').length;
      const cancelledAppointments = appointments.filter((a) => a.status === 'cancelled').length;
      const reminderCount = appointments.filter((a) => a.reminderSent).length;
      const notificationFailures = appointments.filter((a) => a.emailStatus === 'failed').length;

      const metrics: DashboardMetrics = {
        appointmentsToday,
        upcomingAppointments,
        confirmedAppointments,
        pendingAppointments,
        cancelledAppointments,
        reminderCount,
        notificationFailures,
        doctorCount: doctors.length,
      };

      res.json({
        success: true,
        data: metrics,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'METRICS_ERROR', message: err.message },
      });
    }
  }

  /**
   * List Appointments with Search, Filtering & Pagination
   */
  public static async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const {
        search,
        status,
        doctorId,
        dateFrom,
        dateTo,
        page = '1',
        limit = '10',
        sortBy = 'appointmentDate',
        sortOrder = 'desc',
      } = req.query;

      let appointments = dataStore.getAllAppointments();

      // Search filter
      if (search && typeof search === 'string') {
        const q = search.toLowerCase().trim();
        appointments = appointments.filter(
          (a) =>
            a.bookingId.toLowerCase().includes(q) ||
            a.patientName.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            a.phone.includes(q)
        );
      }

      // Status filter
      if (status && typeof status === 'string' && status !== 'all') {
        appointments = appointments.filter((a) => a.status === status);
      }

      // Doctor filter
      if (doctorId && typeof doctorId === 'string' && doctorId !== 'all') {
        appointments = appointments.filter((a) => a.doctorId === doctorId);
      }

      // Date range filter
      if (dateFrom && typeof dateFrom === 'string') {
        appointments = appointments.filter((a) => a.appointmentDate >= dateFrom);
      }
      if (dateTo && typeof dateTo === 'string') {
        appointments = appointments.filter((a) => a.appointmentDate <= dateTo);
      }

      // Sort
      appointments.sort((a, b) => {
        let valA = (a as any)[sortBy as string] || '';
        let valB = (b as any)[sortBy as string] || '';
        if (sortBy === 'appointmentDate') {
          valA = `${a.appointmentDate} ${a.appointmentTime}`;
          valB = `${b.appointmentDate} ${b.appointmentTime}`;
        }
        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });

      // Pagination
      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.max(1, parseInt(limit as string, 10));
      const totalCount = appointments.length;
      const totalPages = Math.ceil(totalCount / limitNum);
      const paginated = appointments.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      res.json({
        success: true,
        data: {
          items: paginated,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages,
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'APPOINTMENTS_FETCH_ERROR', message: err.message },
      });
    }
  }

  /**
   * Get Single Appointment Details
   */
  public static async getAppointmentById(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const appointment = dataStore.getAppointmentById(bookingId);
      if (!appointment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found' },
        });
        return;
      }
      const doctor = dataStore.getDoctorById(appointment.doctorId);

      res.json({
        success: true,
        data: {
          appointment,
          doctor,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'ERROR', message: err.message },
      });
    }
  }

  /**
   * Admin cancels appointment
   */
  public static async cancelAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body;

      const appointment = dataStore.getAppointmentById(bookingId);
      if (!appointment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found' },
        });
        return;
      }

      const doctor = dataStore.getDoctorById(appointment.doctorId);
      if (doctor) {
        await n8nService.triggerCancellationWorkflow(appointment, doctor, reason);
      }

      const updated = dataStore.updateAppointment(bookingId, { status: 'cancelled' });

      auditService.record({
        actor: req.user?.username || 'ADMIN',
        action: 'ADMIN_APPOINTMENT_CANCELLED',
        bookingId,
        details: `Appointment cancelled by admin. Reason: ${reason || 'Staff override'}`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: updated,
        message: 'Appointment cancelled successfully by staff.',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CANCEL_ERROR', message: err.message },
      });
    }
  }

  /**
   * Admin reschedules appointment
   */
  public static async rescheduleAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const { newDate, newTime } = req.body;

      if (!newDate || !newTime) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'newDate and newTime are required' },
        });
        return;
      }

      const appointment = dataStore.getAppointmentById(bookingId);
      if (!appointment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found' },
        });
        return;
      }

      const doctor = dataStore.getDoctorById(appointment.doctorId);
      if (!doctor) {
        res.status(404).json({
          success: false,
          error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' },
        });
        return;
      }

      // Check slot availability
      const availability = calculateDoctorSlots(doctor, newDate);
      const slot = availability.slots.find((s) => s.time === newTime);

      const isSameSlot = appointment.appointmentDate === newDate && appointment.appointmentTime === newTime;
      if (!isSameSlot && (!slot || !slot.available)) {
        res.status(409).json({
          success: false,
          error: { code: 'SLOT_UNAVAILABLE', message: 'Selected reschedule slot is unavailable' },
        });
        return;
      }

      // Calculate new end time
      const [h, m] = newTime.split(':').map(Number);
      const endTotalMins = h * 60 + m + doctor.durationMinutes;
      const newEndTime = `${String(Math.floor(endTotalMins / 60)).padStart(2, '0')}:${String(endTotalMins % 60).padStart(2, '0')}`;

      // Trigger workflow
      const n8nResult = await n8nService.triggerRescheduleWorkflow(
        appointment,
        doctor,
        newDate,
        newTime,
        newEndTime
      );

      const updated = dataStore.updateAppointment(bookingId, {
        appointmentDate: newDate,
        appointmentTime: newTime,
        endTime: newEndTime,
        status: 'rescheduled',
        calendarEventId: n8nResult.calendarEventId,
        reminderSent: false,
      });

      auditService.record({
        actor: req.user?.username || 'ADMIN',
        action: 'ADMIN_APPOINTMENT_RESCHEDULED',
        bookingId,
        details: `Rescheduled by admin to ${newDate} at ${newTime}`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: updated,
        message: 'Appointment rescheduled successfully.',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'RESCHEDULE_ERROR', message: err.message },
      });
    }
  }

  /**
   * Doctor Management: List all doctors
   */
  public static async getDoctors(req: Request, res: Response): Promise<void> {
    try {
      const doctors = dataStore.getAllDoctors();
      res.json({
        success: true,
        data: doctors,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DOCTOR_FETCH_ERROR', message: err.message },
      });
    }
  }

  /**
   * Doctor Management: Add new doctor
   */
  public static async createDoctor(req: Request, res: Response): Promise<void> {
    try {
      const validated = CreateDoctorSchema.parse(req.body);
      const doctorId = validated.doctorId || `DOC-${Date.now().toString().slice(-4)}`;

      const newDoctor = dataStore.createDoctor({
        ...validated,
        doctorId,
      });

      auditService.record({
        actor: req.user?.username || 'ADMIN',
        action: 'DOCTOR_CREATED',
        details: `Created doctor profile for ${newDoctor.doctorName} (${newDoctor.doctorId})`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        data: newDoctor,
        message: 'Doctor created successfully',
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors?.[0]?.message || 'Invalid doctor data' },
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'DOCTOR_CREATION_ERROR', message: err.message },
      });
    }
  }

  /**
   * Doctor Management: Update existing doctor
   */
  public static async updateDoctor(req: Request, res: Response): Promise<void> {
    try {
      const { doctorId } = req.params;
      const validated = UpdateDoctorSchema.parse(req.body);

      const existing = dataStore.getDoctorById(doctorId);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' },
        });
        return;
      }

      const updated = dataStore.updateDoctor(doctorId, validated);

      auditService.record({
        actor: req.user?.username || 'ADMIN',
        action: 'DOCTOR_UPDATED',
        details: `Updated doctor profile for ${existing.doctorName} (${doctorId})`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: updated,
        message: 'Doctor updated successfully',
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors?.[0]?.message || 'Invalid doctor data' },
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'DOCTOR_UPDATE_ERROR', message: err.message },
      });
    }
  }

  /**
   * Audit Logs
   */
  public static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const logs = auditService.getLogs(limit);
      res.json({
        success: true,
        data: logs,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'AUDIT_ERROR', message: err.message },
      });
    }
  }
}
