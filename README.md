# Wedding Guest Counter (MERN Stack)

A minimal, elegant wedding guest management web application built with the MERN stack (MongoDB, Express, React + Vite, Node.js) and simple custom CSS.

Designed with a premium minimal wedding aesthetic: warm beige background, dark brown typography, muted gold accents, and clean cards. Accessible by multiple family members via a single shared link without requiring login or authentication.

---

## Features

1. **Dashboard Overview**:
   - Live **Total Guests** count.
   - Live **Total Houses / Families** count.
   - Automatically re-calculates when houses are added, edited, or removed.

2. **Add House / Family**:
   - House / Family name input.
   - Number of people (guest count) input.
   - Add button with validation and inline feedback.

3. **House Directory & Management**:
   - List displaying each house name and guest badge.
   - **Inline Edit**: update house name or guest count with instant validation.
   - **Delete**: remove house with a quick safety confirmation.
   - **Live Search**: filter houses by name in real-time.

4. **Automatic Guest Count Calculation**:
   - Calculates the sum of all guests across all houses in real-time.

5. **Duplicate Prevention**:
   - Case-insensitive duplicate prevention on both client-side and server-side.
   - Informative error alerts when duplicate names are entered during creation or editing.

6. **MongoDB Persistence**:
   - Stores all data in MongoDB via Mongoose schema to guarantee zero data loss on page refresh.

7. **Shared Access (No Login Required)**:
   - All family members access and manage the exact same data using one shared link.
   - "Copy Link" and "Sync" buttons included directly in the header.

---

## Tech Stack

- **Frontend**: React 19, Vite, native Fetch API, modern vanilla CSS (no Redux, no heavy UI libraries)
- **Backend**: Node.js, Express 5, CORS, Dotenv
- **Database**: MongoDB, Mongoose 9

---

## Project Structure

```text
plannerwedding/
├── backend/
│   ├── models/
│   │   └── House.js          # Mongoose House schema & validation
│   ├── .env                  # Environment variables (PORT, MONGODB_URI)
│   ├── .env.example          # Sample environment config
│   ├── package.json          # Express, Mongoose, CORS, Dotenv
│   └── server.js             # Express CRUD REST APIs & static production server
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main UI & state management
│   │   ├── index.css         # Premium minimal wedding styling
│   │   └── main.jsx          # React DOM entrypoint
│   ├── index.html            # Cormorant Garamond & Plus Jakarta Sans typography
│   ├── vite.config.js        # Vite config with API proxy & local network host
│   └── package.json          # React + Vite dependencies
├── package.json              # Root scripts
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally, or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection URI.

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Check or edit the `.env` file:
   ```env
   PORT=5001
   MONGODB_URI=mongodb://127.0.0.1:27017/wedding_guest_counter
   ```
4. Start the backend:
   ```bash
   npm start
   ```
   The backend will start on `http://localhost:5001`.

### 2. Frontend Setup

1. Open a second terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The Vite dev server will start (defaulting to `http://localhost:5174/` and `http://<your-lan-ip>:5174/`).

---

## Sharing with Family Members on the Same Wi-Fi

Because `vite.config.js` is configured with `host: true`:
1. Find the **Network URL** output by Vite in your terminal (e.g. `http://192.168.1.30:5174/`).
2. Share that URL with your family members connected to the same Wi-Fi.
3. Family members can open it from their phones or laptops to add, edit, or check counts instantly without logging in.
4. Click the **Sync** button in the header at any time to refresh server state.

---

## Deployment Instructions

### Option A: Single-Service Full Stack (Render / Railway)

Because `backend/server.js` serves the frontend's static build from `frontend/dist`:

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. In your cloud provider (e.g. [Render](https://render.com) or [Railway](https://railway.app)):
   - **Build Command**:
     ```bash
     cd frontend && npm install && npm run build && cd ../backend && npm install
     ```
   - **Start Command**:
     ```bash
     node backend/server.js
     ```
   - **Environment Variables**:
     - `PORT`: `5001` (or provided by host)
     - `MONGODB_URI`: your MongoDB Atlas connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/wedding_guest_counter?retryWrites=true&w=majority`)
3. The deployed web app URL will serve both the frontend and the backend API from a single domain.

### Option B: Separate Frontend & Backend (Vercel + Render)

1. **Deploy Backend to Render / Railway**:
   - Set `MONGODB_URI` to your MongoDB Atlas connection string.
   - Note your deployed backend URL: `https://my-wedding-api.onrender.com`.
2. **Deploy Frontend to Vercel**:
   - Set root directory to `frontend`.
   - Set environment variable: `VITE_API_BASE_URL=https://my-wedding-api.onrender.com`.
   - Deploy.
