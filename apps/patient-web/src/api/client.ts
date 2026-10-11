import {
  Doctor,
  DayAvailability,
  Appointment,
  CreateBookingInput,
  VerifyBookingInput,
  CancelBookingInput,
  RescheduleBookingInput,
} from '@clinic/shared';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).code = data?.error?.code;
    (err as any).details = data?.error?.details;
    throw err;
  }

  return data.data as T;
}

export const api = {
  getDoctors: () => request<Doctor[]>('/doctors'),
  
  getDoctorById: (doctorId: string) => request<Doctor>(`/doctors/${doctorId}`),
  
  getDoctorAvailability: (doctorId: string, date: string) =>
    request<DayAvailability>(`/doctors/${doctorId}/availability?date=${date}`),

  createBooking: (payload: CreateBookingInput) =>
    request<Appointment>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyBooking: (payload: VerifyBookingInput) =>
    request<{ appointment: Appointment; doctor: Doctor }>('/bookings/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelBooking: (payload: CancelBookingInput) =>
    request<Appointment>('/bookings/cancel', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  rescheduleBooking: (payload: RescheduleBookingInput) =>
    request<Appointment>('/bookings/reschedule', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
