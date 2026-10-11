import {
  AdminLoginInput,
  AdminUser,
  DashboardMetrics,
  Appointment,
  Doctor,
  AuditLogEntry,
  CreateDoctorInput,
  UpdateDoctorInput,
} from '@clinic/shared';

const rawBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

function getToken(): string | null {
  return sessionStorage.getItem('admin_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON response from ${API_BASE}${endpoint}, but received ${contentType || 'non-JSON'}.`);
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).code = data?.error?.code;
    throw err;
  }

  if (data && typeof data === 'object' && 'data' in data && data.data !== undefined) {
    return data.data as T;
  }
  return data as T;
}

export interface PaginatedAppointments {
  items: Appointment[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export const adminApi = {
  login: async (credentials: AdminLoginInput) => {
    const res = await request<{ token: string; user: AdminUser }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    sessionStorage.setItem('admin_token', res.token);
    return res;
  },

  logout: async () => {
    try {
      await request('/admin/auth/logout', { method: 'POST' });
    } finally {
      sessionStorage.removeItem('admin_token');
    }
  },

  me: () => request<AdminUser>('/admin/auth/me'),

  getDashboard: () => request<DashboardMetrics>('/admin/dashboard'),

  getAppointments: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<PaginatedAppointments>(`/admin/appointments${query ? `?${query}` : ''}`);
  },

  getAppointmentById: (bookingId: string) =>
    request<{ appointment: Appointment; doctor: Doctor }>(`/admin/appointments/${bookingId}`),

  cancelAppointment: (bookingId: string, reason?: string) =>
    request<Appointment>(`/admin/appointments/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  rescheduleAppointment: (bookingId: string, newDate: string, newTime: string) =>
    request<Appointment>(`/admin/appointments/${bookingId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ newDate, newTime }),
    }),

  getDoctors: () => request<Doctor[]>('/admin/doctors'),

  createDoctor: (doctor: CreateDoctorInput) =>
    request<Doctor>('/admin/doctors', {
      method: 'POST',
      body: JSON.stringify(doctor),
    }),

  updateDoctor: (doctorId: string, updates: UpdateDoctorInput) =>
    request<Doctor>(`/admin/doctors/${doctorId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  getAuditLogs: (limit = 100) => request<AuditLogEntry[]>(`/admin/audit-logs?limit=${limit}`),
};
