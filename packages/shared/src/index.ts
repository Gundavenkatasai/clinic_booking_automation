import { z } from 'zod';

// ==========================================
// DOCTORS SCHEMA (Matches Google Sheets 'Doctors')
// ==========================================
export const DoctorSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  doctorName: z.string().min(1, 'Doctor Name is required'),
  workingDays: z.string().min(1, 'Working days are required'), // e.g. "Monday, Tuesday, Wednesday, Thursday, Friday"
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid opening time format (HH:MM)'),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid closing time format (HH:MM)'),
  durationMinutes: z.number().int().positive().min(10).max(240),
  active: z.boolean(),
  // Backward-compatible extensions:
  specialty: z.string().optional(),
  qualifications: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export type Doctor = z.infer<typeof DoctorSchema>;

export const CreateDoctorSchema = DoctorSchema.omit({ doctorId: true }).extend({
  doctorId: z.string().optional(),
});
export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;

export const UpdateDoctorSchema = DoctorSchema.partial().omit({ doctorId: true });
export type UpdateDoctorInput = z.infer<typeof UpdateDoctorSchema>;

// ==========================================
// APPOINTMENTS SCHEMA (Matches Google Sheets 'Appointments')
// ==========================================
export const AppointmentStatusSchema = z.enum([
  'confirmed',
  'pending',
  'cancelled',
  'rescheduled',
  'completed'
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const EmailStatusSchema = z.enum(['sent', 'pending', 'failed']);
export type EmailStatus = z.infer<typeof EmailStatusSchema>;

export const AppointmentSchema = z.object({
  bookingId: z.string().min(1),
  patientName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Invalid phone number').max(20),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be HH:MM'),
  status: AppointmentStatusSchema,
  calendarEventId: z.string().default(''),
  emailStatus: EmailStatusSchema.default('pending'),
  whatsappStatus: z.string().default('not_configured'),
  reminderSent: z.boolean().default(false),
  createdAt: z.string(),
  // Secure management fields
  verificationToken: z.string().default(''),
  reasonForVisit: z.string().max(500).optional(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;

// ==========================================
// SLOTS & AVAILABILITY
// ==========================================
export const TimeSlotSchema = z.object({
  time: z.string(), // "09:00"
  endTime: z.string(), // "09:30"
  available: z.boolean(),
  reason: z.string().optional(),
});
export type TimeSlot = z.infer<typeof TimeSlotSchema>;

export const DayAvailabilitySchema = z.object({
  doctorId: z.string(),
  date: z.string(),
  isWorkingDay: z.boolean(),
  slots: z.array(TimeSlotSchema),
});
export type DayAvailability = z.infer<typeof DayAvailabilitySchema>;

// ==========================================
// PUBLIC BOOKING REQUEST SCHEMAS
// ==========================================
export const CreateBookingSchema = z.object({
  doctorId: z.string().min(1, 'Doctor selection is required'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required'),
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Valid time (HH:MM) is required'),
  patientName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  phone: z.string().trim().min(7, 'Valid phone number is required').max(20),
  reasonForVisit: z.string().trim().max(500).optional(),
  consentAgreed: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the clinic privacy policy and terms',
  }),
  idempotencyKey: z.string().optional(),
});
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const VerifyBookingSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking reference is required'),
  verificationToken: z.string().trim().min(1, 'Verification token or email is required'),
});
export type VerifyBookingInput = z.infer<typeof VerifyBookingSchema>;

export const CancelBookingSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking reference is required'),
  verificationToken: z.string().trim().min(1, 'Verification token is required'),
  reason: z.string().trim().max(300).optional(),
});
export type CancelBookingInput = z.infer<typeof CancelBookingSchema>;

export const RescheduleBookingSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking reference is required'),
  verificationToken: z.string().trim().min(1, 'Verification token is required'),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required'),
  newTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Valid time (HH:MM) is required'),
});
export type RescheduleBookingInput = z.infer<typeof RescheduleBookingSchema>;

// ==========================================
// ADMIN SCHEMAS
// ==========================================
export const AdminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

export const AdminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'staff']),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

export const DashboardMetricsSchema = z.object({
  appointmentsToday: z.number(),
  upcomingAppointments: z.number(),
  confirmedAppointments: z.number(),
  pendingAppointments: z.number(),
  cancelledAppointments: z.number(),
  reminderCount: z.number(),
  notificationFailures: z.number(),
  doctorCount: z.number(),
});
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: z.string(),
  action: z.string(),
  bookingId: z.string().optional(),
  details: z.string(),
  ipAddress: z.string().optional(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

// ==========================================
// API STANDARD RESPONSE TYPES
// ==========================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
