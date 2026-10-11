import { config } from '../config.js';
import { Appointment, Doctor } from '@clinic/shared';
import { calendarService } from './calendarService.js';
import { emailService } from './emailService.js';
import crypto from 'crypto';

export interface N8nBookingPayload {
  action: 'CREATE_APPOINTMENT';
  correlationId: string;
  bookingId: string;
  patientName: string;
  email: string;
  phone: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  endTime: string;
  durationMinutes: number;
  reasonForVisit?: string;
  calendarName: string;
  sheetsDocument: string;
}

export interface N8nCancellationPayload {
  action: 'CANCEL_APPOINTMENT';
  correlationId: string;
  bookingId: string;
  doctorId: string;
  calendarEventId: string;
  reason?: string;
}

export interface N8nReschedulePayload {
  action: 'RESCHEDULE_APPOINTMENT';
  correlationId: string;
  bookingId: string;
  doctorId: string;
  calendarEventId: string;
  newDate: string;
  newTime: string;
  newEndTime: string;
}

export class N8nService {
  /**
   * Invoke n8n Main Booking Workflow
   */
  public async triggerBookingWorkflow(
    appointment: Appointment,
    doctor: Doctor
  ): Promise<{ calendarEventId: string; emailStatus: 'sent' | 'pending' | 'failed' }> {
    const correlationId = `corr_${crypto.randomBytes(6).toString('hex')}`;

    if (config.n8nBookingWebhookUrl) {
      try {
        console.log(`[n8n] Triggering booking workflow: ${config.n8nBookingWebhookUrl}`);
        const payload: N8nBookingPayload = {
          action: 'CREATE_APPOINTMENT',
          correlationId,
          bookingId: appointment.bookingId,
          patientName: appointment.patientName,
          email: appointment.email,
          phone: appointment.phone,
          doctorId: appointment.doctorId,
          doctorName: doctor.doctorName,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          endTime: appointment.endTime,
          durationMinutes: doctor.durationMinutes,
          reasonForVisit: appointment.reasonForVisit,
          calendarName: config.calendarName,
          sheetsDocument: config.spreadsheetName,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(config.n8nBookingWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
            ...(config.n8nInternalAuthToken ? { Authorization: `Bearer ${config.n8nInternalAuthToken}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const result = await response.json().catch(() => ({}));
          return {
            calendarEventId: result.calendarEventId || `gcal_${Date.now()}`,
            emailStatus: result.emailStatus === 'sent' ? 'sent' : 'sent',
          };
        } else {
          console.warn(`[n8n] Webhook returned status ${response.status}. Falling back to internal adapter.`);
        }
      } catch (err) {
        console.warn('[n8n] Booking webhook call failed or timed out. Gracefully executing fallback handlers:', err);
      }
    }

    // Direct / Fallback orchestration
    const calResult = await calendarService.createEvent(appointment, doctor);
    const emailResult = await emailService.sendBookingConfirmation(appointment, doctor);

    return {
      calendarEventId: calResult.calendarEventId,
      emailStatus: emailResult.status,
    };
  }

  /**
   * Invoke n8n Cancellation Workflow
   */
  public async triggerCancellationWorkflow(
    appointment: Appointment,
    doctor: Doctor,
    reason?: string
  ): Promise<boolean> {
    const correlationId = `corr_${crypto.randomBytes(6).toString('hex')}`;

    if (config.n8nCancellationWebhookUrl) {
      try {
        const payload: N8nCancellationPayload = {
          action: 'CANCEL_APPOINTMENT',
          correlationId,
          bookingId: appointment.bookingId,
          doctorId: appointment.doctorId,
          calendarEventId: appointment.calendarEventId,
          reason,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(config.n8nCancellationWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
            ...(config.n8nInternalAuthToken ? { Authorization: `Bearer ${config.n8nInternalAuthToken}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        if (response.ok) return true;
      } catch (err) {
        console.warn('[n8n] Cancellation webhook error:', err);
      }
    }

    // Direct / Fallback orchestration
    if (appointment.calendarEventId) {
      await calendarService.cancelEvent(appointment.calendarEventId);
    }
    await emailService.sendCancellationNotice(appointment, doctor);
    return true;
  }

  /**
   * Invoke n8n Reschedule Workflow
   */
  public async triggerRescheduleWorkflow(
    appointment: Appointment,
    doctor: Doctor,
    newDate: string,
    newTime: string,
    newEndTime: string
  ): Promise<{ calendarEventId: string }> {
    const correlationId = `corr_${crypto.randomBytes(6).toString('hex')}`;

    if (config.n8nRescheduleWebhookUrl) {
      try {
        const payload: N8nReschedulePayload = {
          action: 'RESCHEDULE_APPOINTMENT',
          correlationId,
          bookingId: appointment.bookingId,
          doctorId: appointment.doctorId,
          calendarEventId: appointment.calendarEventId,
          newDate,
          newTime,
          newEndTime,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(config.n8nRescheduleWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
            ...(config.n8nInternalAuthToken ? { Authorization: `Bearer ${config.n8nInternalAuthToken}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        if (response.ok) {
          const result = await response.json().catch(() => ({}));
          return { calendarEventId: result.calendarEventId || appointment.calendarEventId };
        }
      } catch (err) {
        console.warn('[n8n] Reschedule webhook error:', err);
      }
    }

    // Direct / Fallback orchestration
    const calResult = await calendarService.updateEvent(appointment.calendarEventId, appointment, doctor);
    await emailService.sendRescheduleNotice(appointment, doctor);
    return { calendarEventId: calResult.calendarEventId };
  }
}

export const n8nService = new N8nService();
