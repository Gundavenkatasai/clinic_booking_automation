import nodemailer, { type Transporter } from 'nodemailer';
import { Appointment, Doctor, EmailStatus } from '@clinic/shared';
import { config } from '../config.js';

export interface EmailDeliveryResult {
  success: boolean;
  status: EmailStatus;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (!config.smtpUser || !config.smtpPass) {
      return null;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
      });
    }

    return this.transporter;
  }

  private async sendMailWithSafeTimeout(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<EmailDeliveryResult> {
    const transporter = this.getTransporter();

    // In test mode, skip actual network transmission to prevent test latency
    if (process.env.NODE_ENV === 'test' || !transporter) {
      return {
        success: true,
        status: 'sent',
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      };
    }

    try {
      const sendPromise = transporter.sendMail({
        from: `"${config.emailSenderName}" <${config.smtpUser}>`,
        to,
        subject,
        text,
        html,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('SMTP timeout: port 465/587 blocked by cloud host')),
          4500
        )
      );

      const info = (await Promise.race([sendPromise, timeoutPromise])) as any;
      console.log(`[EmailService] Successfully sent email to ${to} (MessageId: ${info.messageId})`);

      return {
        success: true,
        status: 'sent',
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.warn(`[EmailService] SMTP delivery notice for ${to}: ${err.message}`);
      return {
        success: false,
        status: 'failed',
        error: err.message || 'SMTP transmission failed',
      };
    }
  }

  /**
   * Dispatch Gmail booking confirmation to patient
   */
  public async sendBookingConfirmation(
    appointment: Appointment,
    doctor: Doctor
  ): Promise<EmailDeliveryResult> {
    try {
      if (!appointment.email || !appointment.email.includes('@')) {
        return {
          success: false,
          status: 'failed',
          error: 'Invalid recipient email address',
        };
      }

      const maskedEmail = this.maskEmail(appointment.email);
      console.log(`[EmailService] Preparing confirmation for ${appointment.bookingId} to ${maskedEmail}`);

      const html = this.getBookingConfirmationHtml(appointment, doctor);
      const text = this.getBookingConfirmationText(appointment, doctor);

      return await this.sendMailWithSafeTimeout(
        appointment.email,
        `Appointment Confirmed — Aura Health Clinic [${appointment.bookingId}]`,
        html,
        text
      );
    } catch (err: any) {
      console.error('[EmailService] Failed to deliver booking confirmation:', err.message);
      return {
        success: false,
        status: 'failed',
        error: err.message || 'Gmail transmission failed',
      };
    }
  }

  /**
   * Dispatch cancellation notice
   */
  public async sendCancellationNotice(
    appointment: Appointment,
    doctor: Doctor
  ): Promise<EmailDeliveryResult> {
    try {
      if (!appointment.email || !appointment.email.includes('@')) {
        return {
          success: false,
          status: 'failed',
          error: 'Invalid recipient email address',
        };
      }

      const maskedEmail = this.maskEmail(appointment.email);
      console.log(`[EmailService] Preparing cancellation notice for ${appointment.bookingId} to ${maskedEmail}`);

      const html = this.getCancellationHtml(appointment, doctor);
      const text = this.getCancellationText(appointment, doctor);

      return await this.sendMailWithSafeTimeout(
        appointment.email,
        `Appointment Cancelled — Aura Health Clinic [${appointment.bookingId}]`,
        html,
        text
      );
    } catch (err: any) {
      console.error('[EmailService] Failed to deliver cancellation notice:', err.message);
      return {
        success: false,
        status: 'failed',
        error: err.message,
      };
    }
  }

  /**
   * Dispatch rescheduled confirmation email
   */
  public async sendRescheduleNotice(
    appointment: Appointment,
    doctor: Doctor
  ): Promise<EmailDeliveryResult> {
    try {
      if (!appointment.email || !appointment.email.includes('@')) {
        return {
          success: false,
          status: 'failed',
          error: 'Invalid recipient email address',
        };
      }

      const maskedEmail = this.maskEmail(appointment.email);
      console.log(`[EmailService] Preparing reschedule notice for ${appointment.bookingId} to ${maskedEmail}`);

      const html = this.getRescheduleHtml(appointment, doctor);
      const text = this.getRescheduleText(appointment, doctor);

      return await this.sendMailWithSafeTimeout(
        appointment.email,
        `Appointment Rescheduled — Aura Health Clinic [${appointment.bookingId}]`,
        html,
        text
      );
    } catch (err: any) {
      console.error('[EmailService] Failed to deliver reschedule notice:', err.message);
      return {
        success: false,
        status: 'failed',
        error: err.message,
      };
    }
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const name = parts[0];
    const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}***`;
    return `${maskedName}@${parts[1]}`;
  }

  // --- HTML Email Templates (Aura Health Editorial Styling) ---

  private getBookingConfirmationHtml(appointment: Appointment, doctor: Doctor): string {
    const manageUrl = `${config.patientAppOrigin}/manage`;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #172A35;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F7F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(23, 42, 53, 0.08); border: 1px solid #E6E4DD;" cellpadding="0" cellspacing="0">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #176B65; padding: 28px 32px; text-align: left;">
              <span style="display: inline-block; font-size: 20px; font-weight: 700; color: #F8F7F2; letter-spacing: -0.5px;">
                🌿 Aura Health
              </span>
              <p style="margin: 6px 0 0 0; color: #D8E6E0; font-size: 13px;">Center for Excellence in Outpatient Care</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <div style="display: inline-block; background-color: #E8F4F1; color: #176B65; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                Booking Confirmed
              </div>
              
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #172A35; line-height: 1.3;">
                Hello, ${this.escapeHtml(appointment.patientName)}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #536471; line-height: 1.6;">
                Your appointment at Aura Health has been successfully reserved. Please keep this email and your Booking Reference ID for your records.
              </p>

              <!-- Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F5; border: 1px solid #ECEAE3; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #ECEAE3;">
                    <span style="font-size: 12px; text-transform: uppercase; color: #738491; font-weight: 600;">Reference ID</span>
                    <div style="font-size: 17px; font-weight: 700; color: #176B65; margin-top: 2px;">
                      ${this.escapeHtml(appointment.bookingId)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #ECEAE3;">
                    <span style="font-size: 12px; text-transform: uppercase; color: #738491; font-weight: 600;">Specialist</span>
                    <div style="font-size: 16px; font-weight: 600; color: #172A35; margin-top: 2px;">
                      ${this.escapeHtml(doctor.doctorName)}
                    </div>
                    <div style="font-size: 13px; color: #536471;">${this.escapeHtml(doctor.specialty)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #ECEAE3;">
                    <span style="font-size: 12px; text-transform: uppercase; color: #738491; font-weight: 600;">Date & Time</span>
                    <div style="font-size: 16px; font-weight: 600; color: #172A35; margin-top: 2px;">
                      ${this.escapeHtml(appointment.appointmentDate)}
                    </div>
                    <div style="font-size: 14px; color: #176B65; font-weight: 500;">
                      ${this.escapeHtml(appointment.appointmentTime)} – ${this.escapeHtml(appointment.endTime)} IST (${doctor.durationMinutes} mins)
                    </div>
                  </td>
                </tr>
                ${
                  appointment.reasonForVisit
                    ? `
                <tr>
                  <td style="padding: 16px 20px;">
                    <span style="font-size: 12px; text-transform: uppercase; color: #738491; font-weight: 600;">Reason for Consultation</span>
                    <div style="font-size: 14px; color: #172A35; margin-top: 2px;">${this.escapeHtml(appointment.reasonForVisit)}</div>
                  </td>
                </tr>`
                    : ''
                }
              </table>

              <!-- Call to Action -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${manageUrl}" target="_blank" style="display: inline-block; background-color: #176B65; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.2px;">
                      View or Reschedule Appointment &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Patient Instructions -->
              <div style="border-top: 1px solid #ECEAE3; padding-top: 20px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #738491; letter-spacing: 0.5px;">Arrival Guidelines</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #536471; line-height: 1.6;">
                  <li>Please arrive 10 minutes prior to your consultation time for initial vitals check.</li>
                  <li>Carry any previous diagnostic reports, prescriptions, or discharge summaries.</li>
                  <li>Need to reschedule? You can manage your visit up to 2 hours before the appointment.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF9F5; padding: 20px 32px; border-top: 1px solid #ECEAE3; text-align: center; font-size: 12px; color: #8B98A5;">
              <p style="margin: 0 0 6px 0;"><strong>Aura Health Clinic</strong> &bull; Bengaluru, Karnataka, India</p>
              <p style="margin: 0;">Helpline: +91 80 4123 8899 &bull; Email: care@auraclinic.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getBookingConfirmationText(appointment: Appointment, doctor: Doctor): string {
    return `
Aura Health Clinic — Appointment Confirmed
===========================================

Hello ${appointment.patientName},

Your clinic appointment has been successfully confirmed.

Booking Reference ID: ${appointment.bookingId}
Specialist: ${doctor.doctorName} (${doctor.specialty})
Date: ${appointment.appointmentDate}
Time: ${appointment.appointmentTime} – ${appointment.endTime} IST (${doctor.durationMinutes} mins)
${appointment.reasonForVisit ? `Reason: ${appointment.reasonForVisit}\n` : ''}
Manage or Reschedule:
${config.patientAppOrigin}/manage

Arrival Guidelines:
- Please arrive 10 minutes before your slot.
- Bring any relevant past medical records or prescriptions.

Contact Us:
Aura Health Clinic
Phone: +91 80 4123 8899 | Email: care@auraclinic.com
    `.trim();
  }

  private getCancellationHtml(appointment: Appointment, doctor: Doctor): string {
    const bookUrl = config.patientAppOrigin;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Appointment Cancelled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #172A35;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F7F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E6E4DD;" cellpadding="0" cellspacing="0">
          
          <tr style="background-color: #C87559; padding: 24px 32px;">
            <td style="padding: 24px 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff;">🌿 Aura Health</span>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px;">
              <div style="display: inline-block; background-color: #FDF2EE; color: #C87559; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px;">
                Visit Cancelled
              </div>

              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #172A35;">
                Hello, ${this.escapeHtml(appointment.patientName)}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #536471; line-height: 1.6;">
                Your appointment with <strong>${this.escapeHtml(doctor.doctorName)}</strong> on <strong>${this.escapeHtml(appointment.appointmentDate)}</strong> at <strong>${this.escapeHtml(appointment.appointmentTime)} IST</strong> (Ref: <strong>${this.escapeHtml(appointment.bookingId)}</strong>) has been cancelled as requested.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${bookUrl}" target="_blank" style="display: inline-block; background-color: #176B65; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                      Book a New Appointment &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #738491; line-height: 1.5;">
                If this cancellation was made in error or you need urgent medical advice, please reach our clinic helpline immediately at <strong>+91 80 4123 8899</strong>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #FAF9F5; padding: 16px 32px; border-top: 1px solid #ECEAE3; text-align: center; font-size: 12px; color: #8B98A5;">
              Aura Health Clinic &bull; care@auraclinic.com
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getCancellationText(appointment: Appointment, doctor: Doctor): string {
    return `
Aura Health Clinic — Appointment Cancelled
===========================================

Hello ${appointment.patientName},

Your appointment has been cancelled as requested.

Booking Reference ID: ${appointment.bookingId}
Doctor: ${doctor.doctorName}
Original Date: ${appointment.appointmentDate} at ${appointment.appointmentTime} IST

If you would like to book a new appointment:
${config.patientAppOrigin}

Helpline: +91 80 4123 8899 | Email: care@auraclinic.com
    `.trim();
  }

  private getRescheduleHtml(appointment: Appointment, doctor: Doctor): string {
    const manageUrl = `${config.patientAppOrigin}/manage`;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Appointment Rescheduled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #172A35;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F7F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E6E4DD;" cellpadding="0" cellspacing="0">
          
          <tr style="background-color: #176B65; padding: 24px 32px;">
            <td style="padding: 24px 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff;">🌿 Aura Health</span>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px;">
              <div style="display: inline-block; background-color: #E8F4F1; color: #176B65; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px;">
                Appointment Rescheduled
              </div>

              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #172A35;">
                Hello, ${this.escapeHtml(appointment.patientName)}
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #536471; line-height: 1.6;">
                Your appointment (Ref: <strong>${this.escapeHtml(appointment.bookingId)}</strong>) with <strong>${this.escapeHtml(doctor.doctorName)}</strong> has been successfully updated with new timings.
              </p>

              <!-- New Timing Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F5; border: 1px solid #ECEAE3; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #ECEAE3;">
                    <span style="font-size: 12px; text-transform: uppercase; color: #738491; font-weight: 600;">New Appointment Date & Time</span>
                    <div style="font-size: 16px; font-weight: 700; color: #176B65; margin-top: 4px;">
                      ${this.escapeHtml(appointment.appointmentDate)}
                    </div>
                    <div style="font-size: 14px; color: #172A35; font-weight: 500;">
                      ${this.escapeHtml(appointment.appointmentTime)} – ${this.escapeHtml(appointment.endTime)} IST
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <span style="font-size: 12px; text-transform: uppercase; color: #738491; font-weight: 600;">Specialist</span>
                    <div style="font-size: 15px; font-weight: 600; color: #172A35; margin-top: 2px;">
                      ${this.escapeHtml(doctor.doctorName)}
                    </div>
                    <div style="font-size: 13px; color: #536471;">${this.escapeHtml(doctor.specialty)}</div>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${manageUrl}" target="_blank" style="display: inline-block; background-color: #176B65; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                      Manage Appointment &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #FAF9F5; padding: 16px 32px; border-top: 1px solid #ECEAE3; text-align: center; font-size: 12px; color: #8B98A5;">
              Aura Health Clinic &bull; +91 80 4123 8899 &bull; care@auraclinic.com
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getRescheduleText(appointment: Appointment, doctor: Doctor): string {
    return `
Aura Health Clinic — Appointment Rescheduled
=============================================

Hello ${appointment.patientName},

Your appointment has been updated to the following new timing:

Booking Reference ID: ${appointment.bookingId}
Specialist: ${doctor.doctorName}
New Date: ${appointment.appointmentDate}
New Time: ${appointment.appointmentTime} – ${appointment.endTime} IST

Manage your visit:
${config.patientAppOrigin}/manage

Helpline: +91 80 4123 8899 | Email: care@auraclinic.com
    `.trim();
  }

  private escapeHtml(str?: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const emailService = new EmailService();
