import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'aura-clinic-super-secret-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  clinicTimezone: process.env.CLINIC_TIMEZONE || 'Asia/Kolkata', // India Standard Time (IST)
  
  // CORS Origins
  patientAppOrigin: process.env.PATIENT_APP_ORIGIN || 'http://localhost:5173',
  adminAppOrigin: process.env.ADMIN_APP_ORIGIN || 'http://localhost:5174',

  // Google Sheets & Calendar configuration
  spreadsheetName: process.env.GOOGLE_SHEETS_DOCUMENT_NAME || 'Clinic Booking Database',
  calendarName: process.env.GOOGLE_CALENDAR_NAME || 'Clinic Appointments',
  googleSheetsDocumentId: process.env.GOOGLE_SHEETS_DOCUMENT_ID || '',
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID || '',

  // n8n Webhook URLs & Security Token
  n8nBookingWebhookUrl: process.env.N8N_BOOKING_WEBHOOK_URL || '',
  n8nCancellationWebhookUrl: process.env.N8N_CANCELLATION_WEBHOOK_URL || '',
  n8nRescheduleWebhookUrl: process.env.N8N_RESCHEDULE_WEBHOOK_URL || '',
  n8nAvailabilityWebhookUrl: process.env.N8N_AVAILABILITY_WEBHOOK_URL || '',
  n8nInternalAuthToken: process.env.N8N_INTERNAL_AUTH_TOKEN || '',

  // Admin bootstrap credentials (used for first admin creation in dev/production)
  adminUsername: process.env.ADMIN_USERNAME || 'admin@auraclinic.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'AuraClinicAdmin2026!',
};
