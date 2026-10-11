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
        this.doctors = parsed.doctors || INITIAL_DOCTORS;
        this.appointments = parsed.appointments || [];
      } else {
        this.doctors = [...INITIAL_DOCTORS];
        this.appointments = [];
        this.saveDatabase();
      }
    } catch (err) {
      console.error('Failed to read database file, initializing defaults:', err);
      this.doctors = [...INITIAL_DOCTORS];
      this.appointments = [];
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
