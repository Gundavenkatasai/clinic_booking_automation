# Production Deployment Guide: Patient Web + Admin Dashboard + Express API

## 1. Recommended Deployment Architecture

| Component | Recommended Platform | Build Command | Output Directory | Root Directory |
|---|---|---|---|---|
| **Patient Web** | Vercel | `npm run build -w @clinic/patient-web` | `apps/patient-web/dist` | `./` |
| **Admin Console** | Vercel (Isolated Project) | `npm run build -w @clinic/admin-web` | `apps/admin-web/dist` | `./` |
| **Express Backend** | Render / Railway / Node VPS | `npm run build -w @clinic/api` | `apps/api/dist` (Start: `npm run start -w @clinic/api`) | `./` |
| **n8n Automation** | Self-hosted / n8n Cloud | Webhooks active | — | — |
| **Google Sheets & Cal** | Google Workspace / Cloud | Continuous Sync | — | — |

---

## 2. Step-by-Step Deployment Instructions

### A. Deploy Express API to Render (Web Service)
1. In Render dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Environment**: `Node`
   - **Root Directory**: `.` (or blank)
   - **Build Command**: `npm install && npm run build -w @clinic/shared && npm run build -w @clinic/api`
   - **Start Command**: `npm run start -w @clinic/api`
4. Add Environment Variables:
   - `PORT`: `5000` (or leave default, Render sets `PORT` automatically)
   - `NODE_ENV`: `production`
   - `CLINIC_TIMEZONE`: `Asia/Kolkata`
   - `JWT_SECRET`: Generate a secure 64-character random key
   - `PATIENT_APP_ORIGIN`: `https://your-patient-app.vercel.app`
   - `ADMIN_APP_ORIGIN`: `https://your-admin-console.vercel.app`
   - `ADMIN_USERNAME`: `admin@auraclinic.com`
   - `ADMIN_PASSWORD`: Your chosen strong production staff password
   - `N8N_INTERNAL_AUTH_TOKEN`: Your internal authorization bearer token
   - `N8N_BOOKING_WEBHOOK_URL`: Your production n8n booking webhook
   - `N8N_CANCELLATION_WEBHOOK_URL`: Your production n8n cancellation webhook
   - `N8N_RESCHEDULE_WEBHOOK_URL`: Your production n8n reschedule webhook
   - `GOOGLE_SHEETS_DOCUMENT_NAME`: `Clinic Booking Database`
   - `GOOGLE_CALENDAR_NAME`: `Clinic Appointments`
5. Click **Deploy**. Note your API service URL: e.g. `https://aura-clinic-api.onrender.com`.

---

### B. Deploy Patient Website to Vercel
1. In Vercel, click **Add New Project**.
2. Select your repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.`
   - **Build Command**: `npm run build -w @clinic/shared && npm run build -w @clinic/patient-web`
   - **Output Directory**: `apps/patient-web/dist`
4. Add rewrite rule for Single Page Application in `apps/patient-web/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://aura-clinic-api.onrender.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
5. Click **Deploy**.

---

### C. Deploy Admin Dashboard to Vercel
1. Create a second project on Vercel dedicated to clinical operations.
2. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.`
   - **Build Command**: `npm run build -w @clinic/shared && npm run build -w @clinic/admin-web`
   - **Output Directory**: `apps/admin-web/dist`
3. Add rewrite rule in `apps/admin-web/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://aura-clinic-api.onrender.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
4. Click **Deploy**.

---

## 3. Post-Deployment Verification Checklist
1. Visit `https://your-api.onrender.com/api/health` -> verify status is `healthy`.
2. Visit Patient Website -> verify doctors load dynamically from backend.
3. Complete an end-to-end booking -> verify reference ID received and email/calendar synched.
4. Visit Admin Console (`/login`) -> sign in with configured credentials.
5. Verify new booking is listed in appointments table.
6. Test cancellation or reschedule -> verify immediate sync.
