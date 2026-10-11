# n8n Appointment Automation Workflow Integration Guide

## 1. Overview
The platform connects to four distinct n8n workflows through secure server-side webhooks:
1. **Main Booking Workflow** (`N8N_BOOKING_WEBHOOK_URL`)
2. **Cancellation Workflow** (`N8N_CANCELLATION_WEBHOOK_URL`)
3. **Rescheduling Workflow** (`N8N_RESCHEDULE_WEBHOOK_URL`)
4. **Availability Lookup Workflow** (`N8N_AVAILABILITY_WEBHOOK_URL`)

All calls include:
- `x-correlation-id`: Unique request tracing ID (e.g. `corr_a1b2c3d4e5f6`).
- `Authorization`: `Bearer <N8N_INTERNAL_AUTH_TOKEN>`.
- Client timeout: 8–10 seconds.
- Automatic graceful fallback: If an n8n webhook times out or returns a non-200 code in local testing or downtime, the server executes local adapters (`calendarService` + `emailService`), ensuring zero patient-facing downtime.

---

## 2. Webhook Payloads & Contracts

### A. Main Booking Workflow
- **Method**: `POST`
- **URL**: `${N8N_BOOKING_WEBHOOK_URL}`
- **Payload Schema**:
```json
{
  "action": "CREATE_APPOINTMENT",
  "correlationId": "corr_9a8b7c6d5e4f",
  "bookingId": "APT-772040-336F",
  "patientName": "Kavita Rao",
  "email": "kavita.rao@example.com",
  "phone": "+919876543210",
  "doctorId": "DOC-101",
  "doctorName": "Dr. Ananya Sharma",
  "appointmentDate": "2026-10-20",
  "appointmentTime": "10:00",
  "endTime": "10:30",
  "durationMinutes": 30,
  "reasonForVisit": "Routine cardiac health screening",
  "calendarName": "Clinic Appointments",
  "sheetsDocument": "Clinic Booking Database"
}
```
- **Expected n8n Response**:
```json
{
  "success": true,
  "calendarEventId": "gcal_1728666000_a1b2c3",
  "emailStatus": "sent",
  "whatsappStatus": "not_configured"
}
```

### B. Cancellation Workflow
- **Method**: `POST`
- **URL**: `${N8N_CANCELLATION_WEBHOOK_URL}`
- **Payload Schema**:
```json
{
  "action": "CANCEL_APPOINTMENT",
  "correlationId": "corr_123456789abc",
  "bookingId": "APT-772040-336F",
  "doctorId": "DOC-101",
  "calendarEventId": "gcal_1728666000_a1b2c3",
  "reason": "Personal travel conflict"
}
```
- **Expected Response**:
```json
{
  "success": true,
  "status": "cancelled",
  "calendarDeleted": true
}
```

### C. Rescheduling Workflow
- **Method**: `POST`
- **URL**: `${N8N_RESCHEDULE_WEBHOOK_URL}`
- **Payload Schema**:
```json
{
  "action": "RESCHEDULE_APPOINTMENT",
  "correlationId": "corr_987654321fed",
  "bookingId": "APT-772040-336F",
  "doctorId": "DOC-101",
  "calendarEventId": "gcal_1728666000_a1b2c3",
  "newDate": "2026-10-22",
  "newTime": "14:00",
  "newEndTime": "14:30"
}
```
- **Expected Response**:
```json
{
  "success": true,
  "calendarEventId": "gcal_1728666000_a1b2c3",
  "calendarUpdated": true
}
```

---

## 3. n8n Node Breakdown in Configured Workflows

1. **Webhook Trigger Node**:
   - Authentication: Header Auth (`Authorization: Bearer <token>`).
   - Method: POST.
2. **Google Sheets Node (Lookup / Append)**:
   - Resource: Spreadsheet (`Clinic Booking Database`).
   - Sheet: `Appointments`.
   - Operation: Append or Update row matching `bookingId`.
3. **Google Calendar Node**:
   - Resource: Event.
   - Calendar: `Clinic Appointments`.
   - Operation: Create / Update / Delete.
   - Timezone: `Asia/Kolkata` (IST).
4. **Gmail Node**:
   - Resource: Message.
   - Operation: Send.
   - Subject: `Booking Confirmed: Aura Health Clinic [Ref: {{ $json.bookingId }}]`.
   - Body contains formatted consultation time, doctor details, and direct manage link.
