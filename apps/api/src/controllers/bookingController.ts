import { Request, Response } from 'express';
import {
  CreateBookingSchema,
  VerifyBookingSchema,
  CancelBookingSchema,
  RescheduleBookingSchema,
  Appointment,
} from '@clinic/shared';
import { dataStore } from '../store/dataStore.js';
import { reservationStore } from '../store/reservationStore.js';
import { n8nService } from '../services/n8nService.js';
import { auditService } from '../services/auditService.js';
import { calculateDoctorSlots } from '../utils/slotCalculator.js';
import crypto from 'crypto';

export class BookingController {
  /**
   * Patient creates a new booking
   */
  public static async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const validated = CreateBookingSchema.parse(req.body);

      // Check Idempotency key if provided
      if (validated.idempotencyKey) {
        const cached = reservationStore.getIdempotencyResult(validated.idempotencyKey);
        if (cached) {
          res.json({
            success: true,
            data: cached,
            message: 'Returning existing booking confirmation (idempotent)',
          });
          return;
        }
      }

      // Verify doctor
      const doctor = dataStore.getDoctorById(validated.doctorId);
      if (!doctor) {
        res.status(404).json({
          success: false,
          error: { code: 'DOCTOR_NOT_FOUND', message: 'Requested doctor does not exist' },
        });
        return;
      }

      if (!doctor.active) {
        res.status(400).json({
          success: false,
          error: {
            code: 'DOCTOR_INACTIVE',
            message: 'This doctor is currently inactive and cannot receive new appointments',
          },
        });
        return;
      }

      // Calculate availability for this date and time
      const availability = calculateDoctorSlots(doctor, validated.appointmentDate);
      if (!availability.isWorkingDay) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NON_WORKING_DAY',
            message: `${doctor.doctorName} does not consult on the selected day of week`,
          },
        });
        return;
      }

      const matchingSlot = availability.slots.find((s) => s.time === validated.appointmentTime);
      if (!matchingSlot) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SLOT_TIME',
            message: 'Selected time slot does not match doctor schedule intervals',
          },
        });
        return;
      }

      if (!matchingSlot.available) {
        res.status(409).json({
          success: false,
          error: {
            code: 'SLOT_UNAVAILABLE',
            message: `Selected slot at ${validated.appointmentTime} is no longer available (${matchingSlot.reason || 'Booked'})`,
          },
        });
        return;
      }

      // Concurrency Lock: Atomically acquire temporary reservation lock
      const slotKey = reservationStore.getSlotKey(
        validated.doctorId,
        validated.appointmentDate,
        validated.appointmentTime
      );
      const holderId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const lockAcquired = reservationStore.acquireLock(slotKey, holderId, 60000);

      if (!lockAcquired) {
        res.status(409).json({
          success: false,
          error: {
            code: 'SLOT_CONCURRENT_CONFLICT',
            message: 'Another patient is currently booking this slot. Please select a different time.',
          },
        });
        return;
      }

      try {
        // Generate booking reference & verification token
        const bookingId = `APT-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        const verificationToken = `tok_${crypto.randomBytes(16).toString('hex')}`;

        // Calculate end time based on doctor duration
        const [h, m] = validated.appointmentTime.split(':').map(Number);
        const endTotalMins = h * 60 + m + doctor.durationMinutes;
        const endTime = `${String(Math.floor(endTotalMins / 60)).padStart(2, '0')}:${String(endTotalMins % 60).padStart(2, '0')}`;

        const appointment: Appointment = {
          bookingId,
          patientName: validated.patientName,
          email: validated.email,
          phone: validated.phone,
          doctorId: validated.doctorId,
          appointmentDate: validated.appointmentDate,
          appointmentTime: validated.appointmentTime,
          endTime,
          status: 'confirmed',
          calendarEventId: '',
          emailStatus: 'pending',
          whatsappStatus: 'not_configured',
          reminderSent: false,
          createdAt: new Date().toISOString(),
          verificationToken,
          reasonForVisit: validated.reasonForVisit,
        };

        // Trigger n8n appointment workflow (or fallback calendar + email services)
        const integrationResult = await n8nService.triggerBookingWorkflow(appointment, doctor);
        appointment.calendarEventId = integrationResult.calendarEventId;
        appointment.emailStatus = integrationResult.emailStatus;

        // Persist to Google Sheets data store
        const savedAppointment = dataStore.addAppointment(appointment);

        // Store idempotency response if key supplied
        if (validated.idempotencyKey) {
          reservationStore.setIdempotencyResult(validated.idempotencyKey, savedAppointment);
        }

        // Record audit entry
        auditService.record({
          actor: 'PATIENT',
          action: 'APPOINTMENT_CREATED',
          bookingId: savedAppointment.bookingId,
          details: `Booking created for ${savedAppointment.patientName} with ${doctor.doctorName} on ${savedAppointment.appointmentDate} at ${savedAppointment.appointmentTime}`,
          ipAddress: req.ip,
        });

        res.status(201).json({
          success: true,
          data: savedAppointment,
          message: 'Appointment successfully confirmed and scheduled.',
        });
      } catch (err: any) {
        // Release lock on unexpected failure
        reservationStore.releaseLock(slotKey);
        throw err;
      }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: err.errors?.[0]?.message || 'Invalid booking data',
            details: err.errors,
          },
        });
        return;
      }
      const statusCode = err.status || err.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: { code: err.code || 'BOOKING_CREATION_FAILED', message: err.message },
      });
    }
  }

  /**
   * Patient verifies and views their existing booking
   */
  public static async verifyBooking(req: Request, res: Response): Promise<void> {
    try {
      const validated = VerifyBookingSchema.parse(req.body);
      const appointment = dataStore.getAppointmentById(validated.bookingId);

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: { code: 'BOOKING_NOT_FOUND', message: 'No appointment found with the provided reference ID' },
        });
        return;
      }

      // Check verification token or matching email
      const tokenMatch = appointment.verificationToken === validated.verificationToken;
      const emailMatch = appointment.email.toLowerCase() === validated.verificationToken.toLowerCase();

      if (!tokenMatch && !emailMatch) {
        res.status(403).json({
          success: false,
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Invalid verification token or email. Access denied.',
          },
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
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors?.[0]?.message || 'Invalid input' },
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'VERIFICATION_ERROR', message: err.message },
      });
    }
  }

  /**
   * Patient requests cancellation of their appointment
   */
  public static async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const validated = CancelBookingSchema.parse(req.body);
      const appointment = dataStore.getAppointmentById(validated.bookingId);

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: { code: 'BOOKING_NOT_FOUND', message: 'Appointment not found' },
        });
        return;
      }

      // Verification check
      const tokenMatch = appointment.verificationToken === validated.verificationToken;
      const emailMatch = appointment.email.toLowerCase() === validated.verificationToken.toLowerCase();

      if (!tokenMatch && !emailMatch) {
        res.status(403).json({
          success: false,
          error: { code: 'VERIFICATION_FAILED', message: 'Unauthorized cancellation attempt' },
        });
        return;
      }

      if (appointment.status === 'cancelled') {
        res.status(400).json({
          success: false,
          error: { code: 'ALREADY_CANCELLED', message: 'This appointment has already been cancelled' },
        });
        return;
      }

      const doctor = dataStore.getDoctorById(appointment.doctorId);

      // Trigger n8n cancellation workflow & calendar removal
      if (doctor) {
        await n8nService.triggerCancellationWorkflow(appointment, doctor, validated.reason);
      }

      // Update status and release reservation lock
      const updated = dataStore.updateAppointment(appointment.bookingId, {
        status: 'cancelled',
      });

      auditService.record({
        actor: 'PATIENT',
        action: 'APPOINTMENT_CANCELLED',
        bookingId: appointment.bookingId,
        details: `Appointment cancelled by patient. Reason: ${validated.reason || 'None specified'}`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: updated,
        message: 'Appointment successfully cancelled.',
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors?.[0]?.message || 'Invalid input' },
        });
        return;
      }
      const statusCode = err.status || err.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: { code: err.code || 'CANCELLATION_FAILED', message: err.message },
      });
    }
  }

  /**
   * Patient reschedules their appointment to a new date/time slot
   */
  public static async rescheduleBooking(req: Request, res: Response): Promise<void> {
    try {
      const validated = RescheduleBookingSchema.parse(req.body);
      const appointment = dataStore.getAppointmentById(validated.bookingId);

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: { code: 'BOOKING_NOT_FOUND', message: 'Appointment not found' },
        });
        return;
      }

      const tokenMatch = appointment.verificationToken === validated.verificationToken;
      const emailMatch = appointment.email.toLowerCase() === validated.verificationToken.toLowerCase();

      if (!tokenMatch && !emailMatch) {
        res.status(403).json({
          success: false,
          error: { code: 'VERIFICATION_FAILED', message: 'Unauthorized reschedule attempt' },
        });
        return;
      }

      if (appointment.status === 'cancelled') {
        res.status(400).json({
          success: false,
          error: { code: 'CANNOT_RESCHEDULE_CANCELLED', message: 'Cancelled appointments cannot be rescheduled. Please book a new visit.' },
        });
        return;
      }

      const doctor = dataStore.getDoctorById(appointment.doctorId);
      if (!doctor || !doctor.active) {
        res.status(400).json({
          success: false,
          error: { code: 'DOCTOR_UNAVAILABLE', message: 'Doctor is not available for rescheduling' },
        });
        return;
      }

      // Check slot availability for the new date and time
      const availability = calculateDoctorSlots(doctor, validated.newDate);
      const slot = availability.slots.find((s) => s.time === validated.newTime);

      if (!slot) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_SLOT', message: 'Requested time slot is invalid' },
        });
        return;
      }

      // Ensure patient is not conflicting with another booking (unless it is their own current slot)
      const isSameSlot = appointment.appointmentDate === validated.newDate && appointment.appointmentTime === validated.newTime;
      if (!isSameSlot && !slot.available) {
        res.status(409).json({
          success: false,
          error: { code: 'SLOT_UNAVAILABLE', message: 'Selected reschedule slot is no longer available' },
        });
        return;
      }

      // Acquire lock on new slot if changing slot
      let newSlotKey = '';
      if (!isSameSlot) {
        newSlotKey = reservationStore.getSlotKey(doctor.doctorId, validated.newDate, validated.newTime);
        const lockAcquired = reservationStore.acquireLock(newSlotKey, `reschedule_${appointment.bookingId}`, 60000);
        if (!lockAcquired) {
          res.status(409).json({
            success: false,
            error: { code: 'SLOT_CONFLICT', message: 'Selected reschedule slot is currently reserved by another patient' },
          });
          return;
        }
      }

      try {
        // Calculate new end time
        const [h, m] = validated.newTime.split(':').map(Number);
        const endTotalMins = h * 60 + m + doctor.durationMinutes;
        const newEndTime = `${String(Math.floor(endTotalMins / 60)).padStart(2, '0')}:${String(endTotalMins % 60).padStart(2, '0')}`;

        // Trigger n8n reschedule workflow
        const n8nResult = await n8nService.triggerRescheduleWorkflow(
          appointment,
          doctor,
          validated.newDate,
          validated.newTime,
          newEndTime
        );

        // Update appointment in data store
        const updated = dataStore.updateAppointment(appointment.bookingId, {
          appointmentDate: validated.newDate,
          appointmentTime: validated.newTime,
          endTime: newEndTime,
          status: 'rescheduled',
          calendarEventId: n8nResult.calendarEventId,
          reminderSent: false, // Reset reminder flag on reschedule
        });

        auditService.record({
          actor: 'PATIENT',
          action: 'APPOINTMENT_RESCHEDULED',
          bookingId: appointment.bookingId,
          details: `Rescheduled from ${appointment.appointmentDate} ${appointment.appointmentTime} to ${validated.newDate} ${validated.newTime}`,
          ipAddress: req.ip,
        });

        res.json({
          success: true,
          data: updated,
          message: 'Appointment successfully rescheduled.',
        });
      } catch (err: any) {
        if (newSlotKey) {
          reservationStore.releaseLock(newSlotKey);
        }
        throw err;
      }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors?.[0]?.message || 'Invalid input' },
        });
        return;
      }
      const statusCode = err.status || err.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: { code: err.code || 'RESCHEDULE_FAILED', message: err.message },
      });
    }
  }
}
