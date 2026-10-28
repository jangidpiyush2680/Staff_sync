# StaffSync — Modern Human Resource Management Solution

StaffSync is a college-level MERN-stack Human Resource Management System. It centralizes employee profiles, daily check-in/check-out attendance, leave applications and decisions, announcements, training programs, and role-specific dashboards.

> **Local-development project.** The supplied demo accounts and seed data are fictional. Do not use the demo password or deploy this project with development settings as-is.

## Features

### HR Administrator
- Dashboard statistics calculated from database records.
- Create Employee and Manager accounts, edit employment/profile fields, assign employees to managers, and activate/deactivate accounts.
- Organization attendance listing and documented attendance corrections.
- Review, approve, or reject leave requests with decision comments.
- Create, edit, and delete announcements.
- Department, leave-status, and saved-attendance reports.

### Manager
- View only assigned team profiles and team attendance.
- Review and decide leave requests from assigned team members.
- Create and manage training programs they own.
- View team leave activity and relevant upcoming programs.

### Employee
- Public registration (always creates an Employee role) and login.
- View a personal dashboard and permitted profile details; update name, phone, and address.
- Record one check-in and one check-out per working date; browse saved attendance history.
- Submit leave requests and view approval/rejection details.
- Read published announcements, enroll in eligible training, and mark enrollment complete.
- View personal notifications and mark them read.

### Main technology
- **Frontend:** React 18, Vite, JavaScript, React Router, Redux Toolkit, Axios, Bootstrap 5, Bootstrap Icons, CSS.
- **Backend:** Node.js, Express 4, Mongoose, MongoDB, JWT, bcryptjs, dotenv, cors, Helmet.
- **Testing:** Node's built-in test runner for key validation/date helpers, plus frontend production build and manual workflow checklist.

## Prerequisites

- Node.js **20.19 or newer** (a currently supported Node.js LTS release is recommended).
- npm (bundled with Node.js).
- MongoDB Atlas account or a MongoDB instance you can connect to.
- Chrome or Firefox.
- Visual Studio Code or another editor.
- Git is recommended for GitHub submission.

Check installation in a terminal:

```bash
node --version
npm --version
git --version
```

## Quick start (Windows 10/11)

Extract the downloaded ZIP. Open the extracted `StaffSync` folder in your editor. Commands below use PowerShell; on macOS/Linux, use `cp` instead of `Copy-Item` and use your shell's equivalent commands.

### 1. Configure MongoDB

You can use MongoDB Atlas or another MongoDB server reachable from the machine running the backend.

For MongoDB Atlas:

1. Create/sign in to an Atlas account and create a cluster.
2. In **Database Access**, create a database user. This is separate from your Atlas web-login account.
3. In **Network Access**, add your current public IP address. Avoid allowing access from every IP (`0.0.0.0/0`) except for a deliberately short, temporary troubleshooting step.
4. Open the cluster's **Connect** dialog and copy the application connection string.
5. Replace the username, password, and database portion as needed. URL-encode special characters in the database password. The URI should name the `staffsync` database, for example:
   `mongodb+srv://<db-user>:<encoded-password>@<cluster-host>/staffsync?retryWrites=true&w=majority`
6. Never paste the connection string into public messages, source files, or GitHub.

### 2. Configure and install the backend

Open a terminal in `StaffSync/backend` and create your local environment file:

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and set `MONGODB_URI` to your own connection string. Replace `JWT_SECRET` with a random secret of at least 32 characters. You can generate one with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The other local defaults are:

```dotenv
PORT=5000
NODE_ENV=development
JWT_EXPIRES_IN=8h
CLIENT_URL=http://localhost:5173
APP_TIME_ZONE=Asia/Kolkata
```

Install dependencies and initialise demo records:

```bash
npm install
npm run seed
```

Then start the API in this terminal:

```bash
npm run dev
```

The API should listen at `http://localhost:5000`. Keep this terminal open. You can test `http://localhost:5000/api/health` in a browser; it should return a small JSON health response.

### 3. Configure and start the frontend

Open a **second terminal** in `StaffSync/frontend` and run:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`). Keep both terminals open while you use the app.

If your API runs at a different address, change `VITE_API_URL` in `frontend/.env` to the full API base URL, including `/api`, and restart Vite. If you change the frontend origin, update `CLIENT_URL` in `backend/.env` and restart the backend.

## Demo accounts

Run `npm run seed` from `backend` after configuring MongoDB. The local demo password defaults to `StaffSync@123`; it can be changed with `SEED_PASSWORD` in `backend/.env` before you seed the database. Leave `SEED_PASSWORD` blank to use the documented local default.

| Role | Email | Default development password |
|---|---|---|
| HR Administrator | `hr@staffsync.local` | `StaffSync@123` |
| Manager | `manager@staffsync.local` | `StaffSync@123` |
| Employee | `aarav@staffsync.local` | `StaffSync@123` |
| Employee | `maya@staffsync.local` | `StaffSync@123` |
| Employee | `rohan@staffsync.local` | `StaffSync@123` |

All records use fictional sample names. The seed script is intended for local demonstration. Set a different `SEED_PASSWORD` before running it in a shared development database. The current seed script inserts/updates the demonstration records but intentionally does not reset the password of an already-existing account automatically; if you change `SEED_PASSWORD` after the first seed, use the previous password or recreate the development database/accounts.

The sign-in page provides shortcut buttons that fill in the demo email/password. Those shortcuts should be removed before any public deployment.

## Database and business rules

- `User` is the shared authentication/role record. `Employee` stores work-profile fields for Employees and Managers. HR accounts do not need an Employee profile.
- Attendance uses a `YYYY-MM-DD` date key in the configured `APP_TIME_ZONE` (defaults to `Asia/Kolkata`). Check-in and check-out timestamps are stored as dates. A unique index prevents multiple attendance rows for one employee/date.
- A check-out requires an existing check-in and cannot precede it. The HR correction workflow stores the previous times, editor, edit time, and reason.
- Attendance records represent saved check-ins only. People without a check-in are **not automatically marked absent**; dashboard wording uses “Not checked in”.
- Leave types are Casual Leave, Sick Leave, and Earned Leave. Requests are pending until HR or the assigned manager makes a decision. The decision author/time/comment are stored and a notification is created for the employee.
- Managers can access team records only when the employee's `manager` reference matches their user account. HR can access organization-wide records.
- A leave balance and company/legal leave policy are not calculated because no policy rules were supplied.
- Training programs can be global or associated with a manager's team. Enrollment/completion status is stored on each training record.

## API overview

All protected endpoints require `Authorization: Bearer <JWT>`; the frontend adds it automatically after login.

| Route | Purpose | Access |
|---|---|---|
| `GET /api/health` | API health check | Public |
| `POST /api/auth/register` | Register an Employee account only | Public |
| `POST /api/auth/login` | Sign in | Public |
| `GET /api/auth/me` | Current account | Authenticated |
| `/api/employees` | List/view employee profiles; HR create/update/status changes | Authenticated; HR/Manager scope enforced |
| `GET/PUT /api/employees/profile/me` | View/update permitted own profile fields | Authenticated Employee/Manager profile |
| `/api/attendance` | Attendance history, check-in, check-out, HR corrections | Authenticated; role/team scope enforced |
| `/api/leaves` | Submit/list leave requests and decide pending requests | Authenticated; HR/Manager reviewer scope enforced |
| `/api/announcements` | Read published announcements; HR manages announcements | Authenticated; HR write access |
| `/api/trainings` | List/create/update programs, enroll, mark completion | Authenticated; Manager ownership enforced |
| `/api/notifications` | List/read personal notifications | Authenticated, own notifications only |
| `GET /api/dashboard` | Role-specific dashboard payload | Authenticated |
| `GET /api/dashboard/reports` | Department/leave/attendance summaries | HR only |

The backend returns JSON error messages for common validation, authorization, duplicate-record, and not-found errors. Larger list endpoints use a bounded page size. The precise route/controller behavior in the source is authoritative if you extend this table.

## Tests and checks

Run the validation/date helper tests from `backend`:

```bash
npm test
```

Build the frontend production bundle from `frontend`:

```bash
npm run build
```

Run a syntax pass over backend JavaScript files if you want a quick extra check (PowerShell example from project root):

```powershell
Get-ChildItem .\backend -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

### Manual workflow checklist

- [ ] `GET http://localhost:5000/api/health` returns status `ok`.
- [ ] Log in as HR; create a Manager and an Employee, assign the employee to the manager, then refresh the employee list.
- [ ] Log in as the Employee in a separate browser profile/private window; check in, refresh, then check out. A second same-day check-in should be rejected.
- [ ] Submit a valid leave request and verify it appears in the review queue.
- [ ] Log in as the assigned Manager; approve/reject the request and confirm an employee notification is created.
- [ ] Try to review a leave request belonging to an employee outside the Manager's team; the backend should reject the request.
- [ ] Publish an announcement as HR and confirm it is visible to the Employee account.
- [ ] Create a training program as Manager, enroll the assigned Employee, and mark it complete from the Employee account.
- [ ] Open HR reports and confirm counts follow records created in the database.
- [ ] Try visiting an HR-only route as an Employee; the frontend redirects to the permitted dashboard and the backend still protects its API endpoints.

The included automated tests cover input-validation/date helpers. They are **not** a complete database/API integration suite. Full end-to-end workflows require a running MongoDB database and should be exercised with the checklist above.

### Checks performed while packaging this source

- Backend JavaScript syntax (`node --check`): passed for all backend JavaScript files.
- Backend unit tests (`npm test`): 4 passed, 0 failed.
- Frontend JS/JSX syntax parse: 26 source files checked, 0 syntax diagnostics; relative imports resolve.
- Stylesheet parse: passed.
- ZIP integrity and required-file checks: passed.
- **Not run:** Vite production build, dependency-backed server startup, MongoDB integration, and full browser workflows. The packaging environment could not resolve `registry.npmjs.org` (`EAI_AGAIN`), so npm dependencies could not be installed here. These checks must be run after installing dependencies and configuring MongoDB on your computer; they are not being reported as passed.

## GitHub submission

Create an empty repository on GitHub (do not add a second README or license if you already have those files locally). From the `StaffSync` root directory, run:

```bash
git init
git add .
git status
git commit -m "Build StaffSync HR management system"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own GitHub repository URL. If `git remote add origin` says the remote already exists, inspect it with `git remote -v`; update it only if needed using `git remote set-url origin <YOUR-REPOSITORY-URL>`. Never commit either `backend/.env` or `frontend/.env`; `.gitignore` excludes them. Do not push passwords, Atlas URIs, JWT secrets, personal data, or access tokens.

## Troubleshooting

- **`node` or `npm` is not recognised:** install Node.js 20.19+ from the official Node.js website, reopen your terminal, and rerun `node --version` and `npm --version`.
- **Port 5000 is already in use:** change `PORT` in `backend/.env`, then change `VITE_API_URL` in `frontend/.env` to that port and restart both servers. Update the frontend origin/`CLIENT_URL` only if you also changed the Vite port.
- **MongoDB connection fails:** check that `MONGODB_URI` is copied correctly, the DB username/password are correct, special characters in the password are URL-encoded, and your current IP is on the Atlas Network Access list.
- **`JWT_SECRET` error on startup:** use a random secret of 32 or more characters in `backend/.env`; do not use a value from a public example in a real deployment.
- **Frontend says it cannot reach the API:** make sure backend terminal is running, open `/api/health`, check `VITE_API_URL`, then restart Vite after changing the frontend `.env`.
- **Login succeeds but no data appears:** make sure the backend points at the intended MongoDB database and run `npm run seed` once in `backend`.
- **`EADDRINUSE`:** another process owns that port. Stop it or choose another unused port.
- **A dependency appears missing:** run `npm install` in the specific `backend` or `frontend` folder where the package is missing.
- **Atlas says the IP is not allowed:** add the current development computer's IP in Atlas Network Access; a changing home connection may require updating it.

## Security notes and limitations

- Passwords are hashed with bcryptjs. JWT signing requires an environment-based secret, and backend endpoints enforce role and team permissions.
- For this local college demo, the bearer token is kept in `localStorage`. This is convenient but more exposed to a browser XSS issue than an appropriately configured HTTP-only, Secure, SameSite cookie design. Do not describe this token strategy as production-grade.
- Before production use, add a reviewed cookie/session design, stronger rate limiting, account recovery and verification, detailed audit/logging, stricter deployment CORS/TLS settings, formal leave policies, concurrency/integration tests, and security review.
- Demo login shortcut buttons and seed credentials are development-only.
- Notifications are created for leave decisions. Announcements are listed directly and do not currently create a separate notification for every user.
- Some optional requirements such as manager enrollment tracking for all employees, company-specific leave balances, full performance scoring, exports, and automated end-to-end tests are not implemented. Employee attendance is not biometric or location-based.

## Folder structure

```text
StaffSync/
├── README.md
├── .gitignore
├── backend/
│   ├── config/ controllers/ middleware/ models/ routes/ utils/
│   ├── scripts/seed.js
│   ├── tests/validators.test.js
│   ├── server.js app.js package.json .env.example
└── frontend/
    ├── src/components/
    ├── src/features/auth/
    ├── src/pages/
    ├── src/services/api.js
    ├── src/App.jsx main.jsx store.js index.css
    ├── package.json vite.config.js .env.example
```
