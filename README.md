# Aura Health Clinic — Full-Stack Appointment Booking Platform

A complete, production-grade clinic appointment booking platform featuring a patient website, operational admin dashboard, Node.js + Express backend, concurrency-safe slot reservation store, and automated n8n / Google Sheets / Google Calendar / Gmail integration.

---

## 🌟 Key Deliverables

1. **Patient-Facing Web Application (`apps/patient-web`)**
   - Distinctive warm editorial aesthetic: Warm ivory (`#F8F7F2`), deep ink (`#172A35`), primary deep teal (`#176B65`), sage (`#B8CFC2`), terracotta (`#C87559`).
   - Restrained serif typography paired with high-readability sans-serif.
   - Comprehensive multi-step booking wizard (Doctor -> Date -> Time Slot -> Patient Details -> Review -> Concurrency-safe submit -> Confirmation).
   - Dedicated patient appointment lookup, rescheduling, and cancellation with secure verification token.
   - WCAG 2.2 AA compliant with high-contrast keyboard navigation and `prefers-reduced-motion` support.

2. **Dedicated Operations Console / Admin Dashboard (`apps/admin-web`)**
   - Slate & Teal operational interface with high information density.
   - Secure staff sign-in with JWT verification, session cookie, and rate limiting.
   - Real-time operational metrics (today, upcoming, confirmed, pending, cancelled, reminders, doctor count).
   - Searchable, filterable, sortable, and paginated appointments data table.
   - Direct cancellation with audit reason and rescheduling with real-time slot verification.
   - Doctor management matching Google Sheets schema (working days, opening/closing hours, duration, active status toggle).
   - Chronological audit log trail for clinical compliance.

3. **Backend API (`apps/api`)**
   - Node.js + Express + TypeScript.
   - Strict request body, query, and parameter validation with Zod.
   - Concurrency-safe in-memory reservation mutex with TTL and 24-hour idempotency key cache.
   - Security headers with Helmet, CORS isolation, and multi-tier rate limiting.
   - Robust n8n webhook integration service with correlation IDs and timeouts.
   - Synchronizes with Google Sheets `Clinic Booking Database` schema and Google Calendar `Clinic Appointments`.

4. **Shared Package (`packages/shared`)**
   - Shared TypeScript types and Zod schemas for doctors, appointments, availability, slots, and requests.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Node.js >= 18 (Tested on v24.15.0)
- npm >= 9 (Tested on 12.0.2)

### 2. Installation
```bash
# Install dependencies across all npm workspaces
npm install
```

### 3. Environment Setup
Copy the environment template:
```bash
cp .env.example .env
```
*(Default values work out-of-the-box for local testing and development).*

### 4. Running the Development Environment
You can run all three services concurrently or individually:

```bash
# Terminal 1: Run Backend API (Port 5000)
npm run dev:api

# Terminal 2: Run Patient Website (Port 5173)
npm run dev:patient

# Terminal 3: Run Admin Console (Port 5174)
npm run dev:admin
```

- **Patient Web**: [http://localhost:5173](http://localhost:5173)
- **Admin Console**: [http://localhost:5174](http://localhost:5174)
  - Default Staff Username: `admin@auraclinic.com`
  - Default Staff Password: `AuraClinicAdmin2026!`
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Automated Testing

Run the automated test suite (26 passing tests covering booking workflows, slot calculation, concurrency locks, idempotency, cancellation, rescheduling, and admin security):

```bash
npm run test -w @clinic/api
```

Run production builds for all workspaces:
```bash
npm run build
```

---

## 📚 Complete Project Documentation

Detailed architecture and integration manuals are located in `docs/`:
- [Architecture & Concurrency Guide](file:///c:/Users/venka/OneDrive/Desktop/hosipital/docs/architecture.md)
- [n8n Automation Webhooks Manual](file:///c:/Users/venka/OneDrive/Desktop/hosipital/docs/n8n-integration.md)
- [Google Sheets Schema Specification](file:///c:/Users/venka/OneDrive/Desktop/hosipital/docs/google-sheets-schema.md)
- [Security & Privacy Architecture](file:///c:/Users/venka/OneDrive/Desktop/hosipital/docs/security.md)
- [Automated Testing & Acceptance Checklist](file:///c:/Users/venka/OneDrive/Desktop/hosipital/docs/testing.md)
- [Production Deployment Guide](file:///c:/Users/venka/OneDrive/Desktop/hosipital/docs/deployment.md)
- [Implementation Status Document](file:///c:/Users/venka/OneDrive/Desktop/hosipital/docs/IMPLEMENTATION_STATUS.md)
