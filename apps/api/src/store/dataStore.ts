import fs from 'fs';
import path from 'path';
import { Doctor, Appointment } from '@clinic/shared';
import { reservationStore } from './reservationStore.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'clinic_database.json');

const INITIAL_DOCTORS: Doctor[] = [
  {
    doctorId: 'DOC-101',
    doctorName: 'Dr. Ananya Sharma',
    specialty: 'Cardiology & Preventive Heart Care',
    qualifications: 'MD, DM (Cardiology), FACC',
    workingDays: 'Monday, Tuesday, Wednesday, Thursday, Friday',
    openingTime: '09:00',
    closingTime: '17:00',
    durationMinutes: 30,
    active: true,
    bio: 'Specialist in non-invasive cardiology, preventive coronary screening, and clinical hypertension management with over 14 years of clinical practice.',
  },
  {
    doctorId: 'DOC-102',
    doctorName: 'Dr. Rajesh Kumar',
    specialty: 'Pediatrics & Adolescent Care',
    qualifications: 'MD (Pediatrics), DNB, FIAP',
    workingDays: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday',
    openingTime: '10:00',
    closingTime: '18:00',
    durationMinutes: 20,
    active: true,
    bio: 'Dedicated pediatrician focused on neonatal care, childhood developmental assessments, and comprehensive pediatric health.',
  },
  {
    doctorId: 'DOC-103',
    doctorName: 'Dr. Priya Nair',
    specialty: 'Dermatology & Medical Cosmetology',
    qualifications: 'MD (Dermatology), Fellow in Dermatosurgery',
    workingDays: 'Tuesday, Wednesday, Thursday, Friday, Saturday',
    openingTime: '09:30',
    closingTime: '16:30',
    durationMinutes: 30,
    active: true,
    bio: 'Expert in clinical dermatology, autoimmune skin conditions, allergy management, and targeted therapeutic skincare.',
  },
  {
    doctorId: 'DOC-104',
    doctorName: 'Dr. Vikram Patel',
    specialty: 'General Medicine & Family Health',
    qualifications: 'MBBS, MD (Internal Medicine)',
    workingDays: 'Monday, Tuesday, Wednesday, Thursday, Friday',
    openingTime: '08:30',
    closingTime: '15:30',
    durationMinutes: 15,
    active: true,
    bio: 'Experienced primary care physician managing lifestyle diseases, metabolic screening, and chronic disease consultations.',
  },
  {
    doctorId: 'DOC-105',
    doctorName: 'Dr. Meera Reddy',
    specialty: 'Orthopedics & Sports Rehabilitation',
    qualifications: 'MS (Orthopedics), Fellowship in Joint Replacement',
    workingDays: 'Monday, Wednesday, Friday',
    openingTime: '11:00',
    closingTime: '17:00',
    durationMinutes: 30,
    active: false, // Inactive doctor to test inactive rejection
    bio: 'Consultant orthopedic surgeon currently on academic sabbatical.',
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    bookingId: 'APT-858284-60D1',
    patientName: 'sai',
    email: 'venkatasaigunda82@gmail.com',
    phone: '+919963039884',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-13',
    appointmentTime: '15:00',
    endTime: '15:30',
    status: 'confirmed',
    calendarEventId: 'a4qsfj3vit37k1sbbm53bhgva8@google.com',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: false,
    createdAt: '2026-10-12T10:27:41.686Z',
    verificationToken: 'tok_sai_858284',
    reasonForVisit: 'Clinical Consultation',
  },
  {
    bookingId: 'APT-821508-7B32',
    patientName: 'suri',
    email: 'venkatasaigunda5@gmail.com',
    phone: '+919963039884',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-13',
    appointmentTime: '13:00',
    endTime: '13:30',
    status: 'confirmed',
    calendarEventId: 'le97psminf6g9igdcdaaof6qso@google.com',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: false,
    createdAt: '2026-10-12T07:57:02.458Z',
    verificationToken: 'tok_suri_821508',
    reasonForVisit: 'Clinical Consultation',
  },
  {
    bookingId: 'APT-379148-A820',
    patientName: 'Test Patient Live',
    email: 'testlive@example.com',
    phone: '+919876543210',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-14',
    appointmentTime: '11:00',
    endTime: '11:30',
    status: 'confirmed',
    calendarEventId: 'gcal_synced_1791792387473',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: false,
    createdAt: '2026-10-12T08:06:19.148Z',
    verificationToken: 'tok_6aec6ceddd7f4e9befe9ebd24b759389',
    reasonForVisit: 'General checkup testing integration',
  },
  {
    bookingId: 'BOOK-1791546758162',
    patientName: 'Test Patient',
    email: 'test@example.com',
    phone: '+919876543210',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-15',
    appointmentTime: '10:30',
    endTime: '11:00',
    status: 'confirmed',
    calendarEventId: '',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: true,
    createdAt: '2026-10-09T11:52:38.162Z',
    verificationToken: 'tok_1791546758162',
  },
  {
    bookingId: 'BOOK-1791548324950',
    patientName: 'Test Patient 2',
    email: 'test2@example.com',
    phone: '+919876543210',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-16',
    appointmentTime: '11:00',
    endTime: '11:30',
    status: 'confirmed',
    calendarEventId: '',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: true,
    createdAt: '2026-10-09T12:18:44.951Z',
    verificationToken: 'tok_1791548324950',
  },
  {
    bookingId: 'BOOK-1791549108676',
    patientName: 'Rahul Sharma',
    email: 'venkatasaigunda82@gmail.com',
    phone: '+919876543210',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-15',
    appointmentTime: '11:30',
    endTime: '12:00',
    status: 'confirmed',
    calendarEventId: '',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: true,
    createdAt: '2026-10-09T12:31:48.681Z',
    verificationToken: 'tok_1791549108676',
  },
  {
    bookingId: 'BOOK-1791549263677',
    patientName: 'Priya Reddy',
    email: 'venkatasaigunda82@gmail.com',
    phone: '+919812345678',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-15',
    appointmentTime: '12:00',
    endTime: '12:30',
    status: 'confirmed',
    calendarEventId: '',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: true,
    createdAt: '2026-10-09T12:34:23.677Z',
    verificationToken: 'tok_1791549263677',
  },
  {
    bookingId: 'BOOK-1791549577815',
    patientName: 'Arjun Kumar',
    email: 'venkatasaigunda82@gmail.com',
    phone: '+919876543219',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-16',
    appointmentTime: '14:00',
    endTime: '14:30',
    status: 'confirmed',
    calendarEventId: '',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: true,
    createdAt: '2026-10-09T12:39:37.815Z',
    verificationToken: 'tok_1791549577815',
  },
  {
    bookingId: 'BOOK-1791551279198',
    patientName: 'Kavya Reddy',
    email: 'venkatasaigunda82@gmail.com',
    phone: '+919963039884',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-15',
    appointmentTime: '14:00',
    endTime: '14:30',
    status: 'cancelled',
    calendarEventId: '',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: false,
    createdAt: '2026-10-09T13:07:59.198Z',
    verificationToken: 'tok_1791551279198',
  },
  {
    bookingId: 'BOOK-1791722637361',
    patientName: 'Arjun Test',
    email: 'venkatasaigunda82@gmail.com',
    phone: '+919876543210',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-15',
    appointmentTime: '10:00',
    endTime: '10:30',
    status: 'confirmed',
    calendarEventId: '',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: true,
    createdAt: '2026-10-11T12:43:57.363Z',
    verificationToken: 'tok_1791722637361',
  },
  {
    bookingId: 'BOOK-1791738233885',
    patientName: 'Future Booking Test',
    email: 'venkatasaigunda82@gmail.com',
    phone: '+919876543210',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-17',
    appointmentTime: '11:00',
    endTime: '11:30',
    status: 'confirmed',
    calendarEventId: 'gsmg3rpn3rumo76fh0jcli5al4',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: true,
    createdAt: '2026-10-11T17:03:53.885Z',
    verificationToken: 'tok_1791738233885',
  },
  {
    bookingId: 'BOOK-1791738345518',
    patientName: 'Different Slot Test',
    email: 'venkatasaigunda82@gmail.com',
    phone: '+919876543210',
    doctorId: 'DOC-101',
    appointmentDate: '2026-10-19',
    appointmentTime: '15:00',
    endTime: '15:30',
    status: 'confirmed',
    calendarEventId: 'mnt8798cda3dt3s6h840htnk4s',
    emailStatus: 'sent',
    whatsappStatus: 'not_configured',
    reminderSent: true,
    createdAt: '2026-10-11T17:05:45.518Z',
    verificationToken: 'tok_1791738345518',
  },
];

interface DatabaseData {
  doctors: Doctor[];
  appointments: Appointment[];
}

export class DataStore {
  private static instance: DataStore;
  private doctors: Doctor[] = [];
  private appointments: Appointment[] = [];

  private constructor() {
    this.loadDatabase();
    this.syncLocks();
  }

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  private loadDatabase(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed: DatabaseData = JSON.parse(raw);
        this.doctors = parsed.doctors && parsed.doctors.length > 0 ? parsed.doctors : [...INITIAL_DOCTORS];
        const loadedAppointments: Appointment[] = parsed.appointments && parsed.appointments.length > 0 ? parsed.appointments : [];
        const existingIds = new Set(loadedAppointments.map((a) => a.bookingId.toLowerCase()));
        for (const initial of INITIAL_APPOINTMENTS) {
          if (!existingIds.has(initial.bookingId.toLowerCase())) {
            loadedAppointments.push(initial);
          }
        }
        this.appointments = loadedAppointments;
      } else {
        this.doctors = [...INITIAL_DOCTORS];
        this.appointments = [...INITIAL_APPOINTMENTS];
        this.saveDatabase();
      }
    } catch (err) {
      console.error('Failed to read database file, initializing defaults:', err);
      this.doctors = [...INITIAL_DOCTORS];
      this.appointments = [...INITIAL_APPOINTMENTS];
    }
  }

  public saveDatabase(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data: DatabaseData = {
        doctors: this.doctors,
        appointments: this.appointments,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database file:', err);
    }
  }

  /**
   * Sync active committed locks to the reservation store
   */
  private syncLocks(): void {
    for (const app of this.appointments) {
      if (app.status === 'confirmed' || app.status === 'pending') {
        const key = reservationStore.getSlotKey(app.doctorId, app.appointmentDate, app.appointmentTime);
        reservationStore.commitLock(key, app.bookingId);
      }
    }
  }

  // ----------------------------------------------------
  // DOCTOR OPERATIONS
  // ----------------------------------------------------
  public getAllDoctors(): Doctor[] {
    return [...this.doctors];
  }

  public getActiveDoctors(): Doctor[] {
    return this.doctors.filter((d) => d.active);
  }

  public getDoctorById(doctorId: string): Doctor | undefined {
    return this.doctors.find((d) => d.doctorId === doctorId);
  }

  public createDoctor(doctor: Doctor): Doctor {
    this.doctors.push(doctor);
    this.saveDatabase();
    return doctor;
  }

  public updateDoctor(doctorId: string, updates: Partial<Doctor>): Doctor | null {
    const idx = this.doctors.findIndex((d) => d.doctorId === doctorId);
    if (idx === -1) return null;
    this.doctors[idx] = { ...this.doctors[idx], ...updates };
    this.saveDatabase();
    return this.doctors[idx];
  }

  // ----------------------------------------------------
  // APPOINTMENT OPERATIONS
  // ----------------------------------------------------
  public getAllAppointments(): Appointment[] {
    return [...this.appointments];
  }

  public getAppointmentById(bookingId: string): Appointment | undefined {
    return this.appointments.find((a) => a.bookingId.toLowerCase() === bookingId.toLowerCase());
  }

  public getAppointmentsByDoctorAndDate(doctorId: string, date: string): Appointment[] {
    return this.appointments.filter(
      (a) =>
        a.doctorId === doctorId &&
        a.appointmentDate === date &&
        (a.status === 'confirmed' || a.status === 'pending')
    );
  }

  public addAppointment(appointment: Appointment): Appointment {
    this.appointments.push(appointment);
    this.saveDatabase();
    // Commit lock permanently
    const slotKey = reservationStore.getSlotKey(
      appointment.doctorId,
      appointment.appointmentDate,
      appointment.appointmentTime
    );
    reservationStore.commitLock(slotKey, appointment.bookingId);
    return appointment;
  }

  public updateAppointment(bookingId: string, updates: Partial<Appointment>): Appointment | null {
    const idx = this.appointments.findIndex((a) => a.bookingId.toLowerCase() === bookingId.toLowerCase());
    if (idx === -1) return null;
    const oldApp = this.appointments[idx];
    const updated = { ...oldApp, ...updates };
    this.appointments[idx] = updated;

    // Handle lock release/recommit
    if (updates.status === 'cancelled') {
      const oldSlot = reservationStore.getSlotKey(oldApp.doctorId, oldApp.appointmentDate, oldApp.appointmentTime);
      reservationStore.releaseLock(oldSlot);
    } else if (updates.appointmentDate || updates.appointmentTime) {
      // Released old slot and committed new slot
      const oldSlot = reservationStore.getSlotKey(oldApp.doctorId, oldApp.appointmentDate, oldApp.appointmentTime);
      reservationStore.releaseLock(oldSlot);
      const newSlot = reservationStore.getSlotKey(updated.doctorId, updated.appointmentDate, updated.appointmentTime);
      reservationStore.commitLock(newSlot, updated.bookingId);
    }

    this.saveDatabase();
    return updated;
  }

  // Clear for tests
  public resetToDefault(): void {
    this.doctors = [...INITIAL_DOCTORS];
    this.appointments = [];
    this.saveDatabase();
    reservationStore.clearAll();
  }
}

export const dataStore = DataStore.getInstance();
