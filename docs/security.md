# Security, Privacy & Data Integrity Architecture

## 1. Principles
The Aura Health Clinic booking platform treats all patient information as confidential health data:
1. **Zero Secret Leakage**: No secrets, tokens, internal n8n URLs, or Google API keys are ever bundled into public client builds or logged in output.
2. **Strict Authorization**: Admin routes are protected by server-validated JWT tokens (`requireAdminAuth`).
3. **Data Minimization**: Only contact details essential to scheduling are requested; medical intake details are kept optional and minimal.
4. **Idempotency & Race Condition Defense**: Atomic in-memory locks prevent dual-allocation of consultation slots.

---

## 2. Security Controls Implemented

| Control | Implementation Details |
|---|---|
| **CORS Isolation** | Only exact client origins (`PATIENT_APP_ORIGIN`, `ADMIN_APP_ORIGIN`) permitted; wildcard origins blocked. |
| **Security Headers** | `helmet()` adds Content-Security-Policy, HSTS, X-Frame-Options (DENY), and X-Content-Type-Options (nosniff). |
| **Rate Limiting** | Three tiers via `express-rate-limit`: (1) Booking creation: 30/15m, (2) Admin login: 15/15m, (3) General API: 120/1m. |
| **Input Validation** | Strict Zod validation on every endpoint. SQL/NoSQL injection vectors eliminated by schema typing. |
| **Password & Token Security** | Cryptographically signed tokens (`HS256`, 24h expiration). No plaintext passwords stored in frontend storage. |
| **Audit Logging** | Operational events recorded in `data/audit_logs.json` with actor, action, timestamp, and IP address. Sensitive tokens and medical data omitted. |

---

## 3. Patient Appointment Privacy
- The `/api/bookings/verify` endpoint requires both a valid `bookingId` AND a cryptographically random `verificationToken` or the matching patient email.
- Brute-force guessing of booking IDs is mitigated by rate limiting and token entropy (`tok_` + 16 random bytes).
