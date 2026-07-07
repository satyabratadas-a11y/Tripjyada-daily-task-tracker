# Team Task Tracker (MERN)

A web replacement for the team's Google Sheet tracker: daily task assignment, employee self-reporting with restricted columns, an admin verification workflow, a live dashboard, downloadable monthly HR reports in Excel/PDF, admin audit logs, and optional email notifications.

## Stack
- **Server**: Node/Express, MongoDB (Mongoose), JWT auth in an httpOnly cookie, `exceljs` for the report download.
- **Client**: Next.js (App Router) + Tailwind CSS.

## Roles
- **Admin**: assigns each employee's daily task, sets the verified status (Completed/On Progress/Incomplete/Flagged), writes reviewer notes, approves new signups, views the Dashboard and downloads the monthly HR report.
- **Employee**: sees their own assigned task and, for admin-assigned rows, fills in only their proof link and "my status" (`On Progress` / `Done`). Those restrictions are enforced server-side, not just hidden in the UI.

## Getting started

### 1. Server
```
cd server
cp .env.example .env      # edit JWT_SECRET, MONGO_URI, ADMIN_EMAIL/PASSWORD as needed
npm install
npm run seed:admin        # creates the first admin login from ADMIN_EMAIL/ADMIN_PASSWORD
npm run dev                # http://localhost:4000
```
Requires a local MongoDB running at the `MONGO_URI` in `.env` (default `mongodb://127.0.0.1:27017/task_tracker`).
If you want approval / assignment / review emails, also fill in the optional `SMTP_*` variables in `server/.env`.

### 2. Client
```
cd client
cp .env.local.example .env.local
npm install
npm run dev                # http://localhost:3000
```

### 3. Try it
1. Log in as the seeded admin.
2. Have a teammate sign up at `/signup` (they land in "pending" until approved).
3. Approve them from **Users**, assign a job title/role.
4. As admin, assign today's task from **Today's Tasks** or from an employee's monthly log.
5. Log in as the employee, fill in the proof link + status on **Today's Task**.
6. Back as admin, set the verified status/notes, check **Dashboard**, review **Audit Log**, and download the **HR Report** in Excel or PDF.

## Notes
- Signup is public but accounts stay `pending` until an admin approves them — no self-service admin creation.
- Field-level access control lives in the Express controllers (`server/src/controllers/task.controller.js`), not just the UI — employees can only edit proof/status on admin-assigned tasks, and they can never change `adminStatus` or `reviewerNotes`.
- Email notifications are optional and send only when SMTP settings are configured in `server/.env`.
