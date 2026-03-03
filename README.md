# Hackathon Problem Selection Web Application

This is a full-stack web application designed for hackathon organizers to manage problem statements and for participating teams to select their problem statements.

## Tech Stack
- **Frontend**: React.js (Vite), Tailwind CSS, React Router DOM, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose)

## Folder Structure
- `backend/` - Contains the Express.js server, routes, middleware, models, and database connection.
- `frontend/` - Contains the Vite React application, pages, and Tailwind styling.

## Application Features
**Admin Panel**
- Login using a single shared secret key (`ADMIN_SECRET`).
- Add new problem statements (Title, Description, Difficulty).
- Toggle problem visibility (Active/Hidden).
- View a table of all added problem statements and their locked status.
- View a table of which team selected which problem and when.

**User (Team) Panel**
- Login using seeded Team Credentials from `users.json`.
- View all active problem statements.
- Select exactly ONE problem statement. Once selected, it gets locked and no other team can select it.

---

## Setup & Run Instructions Locally

### Prerequisites
- Node.js installed

### 1. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `backend/.env` (or copy from `backend/.env.example`) and set at least:
   - `MONGODB_URI`
   - `ADMIN_SECRET`
   - `CORS_ORIGIN` (for local dev: `http://localhost:5173`)
4. Start the server (runs on `http://localhost:5000`):
   ```bash
   npm run dev
   ```

*(Note: Admin Secret Key is `supersecret123` by default, configured in `backend/.env`)*

### 2. Frontend Setup
1. Open a separate terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `frontend/.env` (or copy from `frontend/.env.example`) and set:
   - `VITE_API_ORIGINS=http://localhost:5000` (local backend)
   - OR `VITE_API_ORIGINS=<comma-separated Render URLs>` (deployed backends)
4. Start the React app (typically runs on `http://localhost:5173`):
   ```bash
   npm run dev
   ```

### 3. Testing Flow
1. Open the frontend in your browser.
2. Go to **Admin Login**, enter `supersecret123`, and add a few problem statements. Keep them active.
3. Open an incognito window, go to **User Login**, and sign in as `alpha@example.com` with password `password123` (from `backend/data/users.json`).
4. Select a problem statement. It will be locked.
5. Go back to Admin Panel to see the updated selections.

---

## API Structure Overview

### Admin APIs
- `POST /api/admin/login` - Authenticate admin using secret key.
- `POST /api/admin/problems` - Add a new problem statement.
- `PATCH /api/admin/problems/:id/toggle` - Toggle active status.
- `GET /api/admin/problems` - Fetch all problem statements.
- `GET /api/admin/selections` - Fetch all team selections.

### User APIs
- `POST /api/user/login` - Authenticate team using email and password.
- `GET /api/problems` - Fetch all *active* problem statements.
- `POST /api/select-problem` - Select a problem (locks it and logs selection).
