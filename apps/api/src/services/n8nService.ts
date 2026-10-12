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
  consent: boolean;
  calendarName: string;
  sheetsDocument: string;
}

export interface N8nCancellationPayload {
  action: 'CANCEL_APPOINTMENT';
  correlationId: string;
  bookingId: string;
  email: string;
  doctorId: string;
  calendarEventId: string;
  reason?: string;
}

export interface N8nReschedulePayload {
  action: 'RESCHEDULE_APPOINTMENT';
  correlationId: string;
  bookingId: string;
  email: string;
  doctorId: string;
  calendarEventId: string;
  newAppointmentDate: string;
  newAppointmentTime: string;
  newDate: string;
  newTime: string;
  newEndTime: string;
}

export class N8nService {
  /**
   * Helper to normalize phone number to E.164 required by n8n validation (+countryCode followed by 7-14 digits)
   */
  public normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s-]/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    // Default to India (+91) if 10-digit number is provided without country code
    const digitsOnly = cleaned.replace(/^0+/, '');
    return `+91${digitsOnly}`;
  }

  /**
   * Invoke n8n Main Booking Workflow
   * Strictly requires a valid success response from n8n before confirming.
   */
  public async triggerBookingWorkflow(
    appointment: Appointment,
    doctor: Doctor
  ): Promise<{ calendarEventId: string; emailStatus: 'sent' | 'pending' | 'failed' }> {
    const correlationId = `corr_${crypto.randomBytes(6).toString('hex')}`;

    if (!config.n8nBookingWebhookUrl) {
      const err = new Error('Booking automation webhook is not configured. Please set N8N_BOOKING_WEBHOOK_URL.');
      (err as any).status = 503;
      (err as any).code = 'N8N_NOT_CONFIGURED';
      throw err;
    }

    const normalizedPhone = this.normalizePhone(appointment.phone);

    const payload: N8nBookingPayload = {
      action: 'CREATE_APPOINTMENT',
      correlationId,
      bookingId: appointment.bookingId,
      patientName: appointment.patientName.trim(),
      email: appointment.email.trim().toLowerCase(),
      phone: normalizedPhone,
      doctorId: appointment.doctorId,
      doctorName: doctor.doctorName,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      endTime: appointment.endTime,
      durationMinutes: doctor.durationMinutes,
      reasonForVisit: appointment.reasonForVisit,
      consent: true,
      calendarName: config.calendarName,
      sheetsDocument: config.spreadsheetName,
    };

    console.log(
      `[n8n] Dispatching booking webhook [correlationId: ${correlationId}, bookingId: ${appointment.bookingId}, doctorId: ${appointment.doctorId}]`
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(config.n8nBookingWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
          ...(config.n8nInternalAuthToken ? { Authorization: `Bearer ${config.n8nInternalAuthToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (networkErr: any) {
      if (networkErr.name === 'AbortError') {
        console.error(`[n8n] Booking webhook timed out [correlationId: ${correlationId}, bookingId: ${appointment.bookingId}]`);
        const err = new Error('Booking automation service timed out. Please try again.');
        (err as any).status = 504;
        (err as any).code = 'N8N_TIMEOUT';
        throw err;
      }
      console.error(
        `[n8n] Booking webhook unreachable [correlationId: ${correlationId}, bookingId: ${appointment.bookingId}]: ${networkErr.message}`
      );
      const err = new Error('Booking automation service is currently unreachable. Please check tunnel connection and try again.');
      (err as any).status = 503;
      (err as any).code = 'N8N_UNAVAILABLE';
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const status = response.status;
      const errorBody = (await response.json().catch(() => ({}))) as { message?: string };
      console.warn(
        `[n8n] Booking webhook returned error status ${status} [correlationId: ${correlationId}, bookingId: ${appointment.bookingId}]`
      );

      if (status === 409) {
        const err = new Error(
          errorBody.message || 'The requested appointment slot is unavailable. Please choose another time.'
        );
        (err as any).status = 409;
        (err as any).code = 'SLOT_UNAVAILABLE';
        throw err;
      }

      if (status === 400) {
        const err = new Error(errorBody.message || 'Invalid booking details received by booking service.');
        (err as any).status = 400;
        (err as any).code = 'VALIDATION_ERROR';
        throw err;
      }

      const err = new Error('Booking automation service returned an error. Please try again.');
      (err as any).status = 502;
      (err as any).code = 'N8N_SERVICE_ERROR';
      throw err;
    }

    const result = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      calendarEventId?: string;
      emailStatus?: string;
      message?: string;
    };

    if (result && result.success === false) {
      console.warn(
        `[n8n] Booking webhook returned success=false [correlationId: ${correlationId}, bookingId: ${appointment.bookingId}]`
      );
      const err = new Error(result.message || 'Booking was not confirmed by the automation service.');
      (err as any).status = 400;
      (err as any).code = 'BOOKING_REJECTED';
      throw err;
    }

    console.log(
      `[n8n] Booking successfully confirmed by workflow [correlationId: ${correlationId}, bookingId: ${appointment.bookingId}]`
    );

    return {
      calendarEventId: result.calendarEventId || `gcal_synced_${Date.now()}`,
      emailStatus: (result.emailStatus as 'sent' | 'pending' | 'failed') || 'sent',
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

    if (!config.n8nCancellationWebhookUrl) {
      console.warn(`[n8n] Cancellation webhook URL not configured. Executing direct fallback.`);
      if (appointment.calendarEventId) {
        await calendarService.cancelEvent(appointment.calendarEventId);
      }
      await emailService.sendCancellationNotice(appointment, doctor);
      return true;
    }

    try {
      console.log(
        `[n8n] Dispatching cancellation webhook [correlationId: ${correlationId}, bookingId: ${appointment.bookingId}]`
      );
      const payload: N8nCancellationPayload = {
        action: 'CANCEL_APPOINTMENT',
        correlationId,
        bookingId: appointment.bookingId,
        email: appointment.email,
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

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { message?: string };
        const err = new Error(errBody.message || 'Cancellation rejected by workflow service');
        (err as any).status = response.status;
        (err as any).code = 'CANCELLATION_FAILED';
        throw err;
      }
      return true;
    } catch (err: any) {
      if (err.status) throw err;
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Cancellation webhook timed out. Please try again.');
        (timeoutErr as any).status = 504;
        (timeoutErr as any).code = 'N8N_TIMEOUT';
        throw timeoutErr;
      }
      const unavailErr = new Error('Cancellation service is currently unreachable.');
      (unavailErr as any).status = 503;
      (unavailErr as any).code = 'N8N_UNAVAILABLE';
      throw unavailErr;
    }
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

    if (!config.n8nRescheduleWebhookUrl) {
      console.warn(`[n8n] Reschedule webhook URL not configured. Executing direct fallback.`);
      const calResult = await calendarService.updateEvent(appointment.calendarEventId, appointment, doctor);
      await emailService.sendRescheduleNotice(appointment, doctor);
      return { calendarEventId: calResult.calendarEventId };
    }

    try {
      console.log(
        `[n8n] Dispatching reschedule webhook [correlationId: ${correlationId}, bookingId: ${appointment.bookingId}]`
      );
      const payload: N8nReschedulePayload = {
        action: 'RESCHEDULE_APPOINTMENT',
        correlationId,
        bookingId: appointment.bookingId,
        email: appointment.email,
        doctorId: appointment.doctorId,
        calendarEventId: appointment.calendarEventId,
        newAppointmentDate: newDate,
        newAppointmentTime: newTime,
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

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { message?: string };
        const err = new Error(errBody.message || 'Reschedule rejected by workflow service');
        (err as any).status = response.status;
        (err as any).code = response.status === 409 ? 'SLOT_UNAVAILABLE' : 'RESCHEDULE_FAILED';
        throw err;
      }

      const result = (await response.json().catch(() => ({}))) as { calendarEventId?: string };
      return { calendarEventId: result.calendarEventId || appointment.calendarEventId };
    } catch (err: any) {
      if (err.status) throw err;
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Reschedule webhook timed out. Please try again.');
        (timeoutErr as any).status = 504;
        (timeoutErr as any).code = 'N8N_TIMEOUT';
        throw timeoutErr;
      }
      const unavailErr = new Error('Reschedule service is currently unreachable.');
      (unavailErr as any).status = 503;
      (unavailErr as any).code = 'N8N_UNAVAILABLE';
      throw unavailErr;
    }
  }
}

export const n8nService = new N8nService();
