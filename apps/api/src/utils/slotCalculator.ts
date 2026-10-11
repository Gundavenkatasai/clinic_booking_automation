import { Doctor, TimeSlot, DayAvailability } from '@clinic/shared';
import { dataStore } from '../store/dataStore.js';
import { reservationStore } from '../store/reservationStore.js';

export function calculateDoctorSlots(doctor: Doctor, dateStr: string): DayAvailability {
  // Check active status
  if (!doctor.active) {
    return {
      doctorId: doctor.doctorId,
      date: dateStr,
      isWorkingDay: false,
      slots: [],
    };
  }

  // Parse Date to Day of Week
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day));
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[targetDate.getUTCDay()];

  // Check if doctor works on this day
  const doctorDays = doctor.workingDays.split(',').map((d) => d.trim().toLowerCase());
  const isWorking = doctorDays.some((d) => d === dayName.toLowerCase());

  if (!isWorking) {
    return {
      doctorId: doctor.doctorId,
      date: dateStr,
      isWorkingDay: false,
      slots: [],
    };
  }

  // Parse opening and closing times (HH:MM -> minutes from midnight)
  const [openH, openM] = doctor.openingTime.split(':').map(Number);
  const [closeH, closeM] = doctor.closingTime.split(':').map(Number);
  const startMinutes = openH * 60 + openM;
  const endMinutes = closeH * 60 + closeM;
  const duration = doctor.durationMinutes || 30;

  // Get existing active appointments for this doctor on this date
  const existingAppointments = dataStore.getAppointmentsByDoctorAndDate(doctor.doctorId, dateStr);

  // Current date & time for past slot filtering
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: TimeSlot[] = [];

  for (let mins = startMinutes; mins + duration <= endMinutes; mins += duration) {
    const slotStartH = Math.floor(mins / 60);
    const slotStartM = mins % 60;
    const timeStr = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;

    const slotEndMins = mins + duration;
    const slotEndH = Math.floor(slotEndMins / 60);
    const slotEndM = slotEndMins % 60;
    const endTimeStr = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;

    // 1. Check if slot is in the past
    let available = true;
    let reason: string | undefined = undefined;

    if (dateStr < todayStr) {
      available = false;
      reason = 'Date has passed';
    } else if (dateStr === todayStr && mins <= currentMinutes) {
      available = false;
      reason = 'Time has passed';
    }

    // 2. Check existing bookings
    if (available) {
      const isBooked = existingAppointments.some(
        (app) => app.appointmentTime === timeStr && app.status !== 'cancelled'
      );
      if (isBooked) {
        available = false;
        reason = 'Booked';
      }
    }

    // 3. Check reservation lock
    if (available) {
      const slotKey = reservationStore.getSlotKey(doctor.doctorId, dateStr, timeStr);
      if (reservationStore.isSlotLocked(slotKey)) {
        available = false;
        reason = 'Reserved';
      }
    }

    slots.push({
      time: timeStr,
      endTime: endTimeStr,
      available,
      reason,
    });
  }

  return {
    doctorId: doctor.doctorId,
    date: dateStr,
    isWorkingDay: true,
    slots,
  };
}
