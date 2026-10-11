# Google Sheets Database Schema Specification

## 1. Overview
The platform uses the existing Google Sheets document **`Clinic Booking Database`** as its operational record system.
The spreadsheet contains two required sheets:
1. **`Doctors`**
2. **`Appointments`**

---

## 2. Sheet: `Doctors`

| Column Header | Data Type | Example Value | Description |
|---|---|---|---|
| `doctorId` | String (Unique) | `DOC-101` | Unique specialist identifier |
| `doctorName` | String | `Dr. Ananya Sharma` | Full clinical name and title |
| `workingDays` | String | `Monday, Tuesday, Wednesday, Thursday, Friday` | Comma-separated list of consultation days |
| `openingTime` | String (HH:MM) | `09:00` | Clinic start time in 24h IST format |
| `closingTime` | String (HH:MM) | `17:00` | Clinic finish time in 24h IST format |
| `durationMinutes` | Number (Integer) | `30` | Duration allocated per consultation |
| `active` | Boolean | `TRUE` | Whether doctor is accepting new bookings |

### Backward-Compatible Optional Extensions
| Column Header | Data Type | Description |
|---|---|---|
| `specialty` | String | Medical department (e.g. Cardiology & Preventive Heart Care) |
| `qualifications` | String | Degrees and certifications (e.g. MD, DM, FACC) |
| `bio` | String | Clinical focus summary |

---

## 3. Sheet: `Appointments`

| Column Header | Data Type | Example Value | Description |
|---|---|---|---|
| `bookingId` | String (Unique) | `APT-772040-336F` | Unique public booking reference code |
| `patientName` | String | `Kavita Rao` | Patient's full name |
| `email` | String | `kavita.rao@example.com` | Patient contact email address |
| `phone` | String | `+919876543210` | Contact phone with country code |
| `doctorId` | String | `DOC-101` | Foreign key matching `Doctors.doctorId` |
| `appointmentDate`| String (YYYY-MM-DD)| `2026-10-20` | Scheduled consultation date |
| `appointmentTime`| String (HH:MM) | `10:00` | Scheduled start time (IST) |
| `endTime` | String (HH:MM) | `10:30` | Scheduled end time (calculated from duration) |
| `status` | Enum String | `confirmed` | `confirmed`, `pending`, `cancelled`, `rescheduled`, `completed` |
| `calendarEventId`| String | `gcal_1728666000_a1b2c3` | Google Calendar event reference |
| `emailStatus` | Enum String | `sent` | `sent`, `pending`, `failed` |
| `whatsappStatus`| String | `not_configured` | Explicitly excluded in this version |
| `reminderSent` | Boolean | `FALSE` | Flag indicating whether Gmail reminder has fired |
| `createdAt` | ISO 8601 String | `2026-10-11T17:28:54.123Z` | Record creation timestamp |

### Backward-Compatible Operational Extensions
| Column Header | Data Type | Description |
|---|---|---|
| `verificationToken` | String | Unguessable token (`tok_...`) used for patient online manage/cancel/reschedule |
| `reasonForVisit` | String | Optional patient consultation notes |

---

## 4. Preservation & Concurrency Rules
- Column names, casing, and relative order must not be altered.
- All slot validation happens server-side via `ReservationStore` mutex before appending rows.
- Inactive doctors (`active: FALSE`) are blocked from appearing in the patient wizard or accepting new appointments.
