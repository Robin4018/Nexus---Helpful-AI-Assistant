# Nexus AI - Intelligent Workspace

Nexus AI is a high-fidelity, focus-driven chat application built with **React (Vite)** and **Django**. It features the premium **Nexus-AI** design system, integrating a charcoal-amber aesthetic with advanced glassmorphism and motion transitions.

## ✨ Features

- **Premium Design**: Full replication of the Nexus-AI interface using **Tailwind CSS v4**.
- **Intelligent AI**: Powered by **Google Gemini API** (`gemini-2.5-flash-lite`) for fast, multimodal-ready responses.
- **Seamless UX**: Global page transitions powered by **Framer Motion** and **AnimatePresence**.
- **Advanced UI Components**:
  - Custom glassmorphism sidebar and chat area.
  - **Sonner** toast notifications for status updates.
  - Custom Nexus-styled deletion confirmation modals.
  - Multi-turn conversation awareness and persistence.
- **Secure Auth**: JWT-based authentication (Login/Signup) with protected workspace routing.
- **Markdown Support**: Rich text rendering for AI responses includes code highlighting and styled typography.

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Framer Motion, Lucide React, Sonner.
- **Backend**: Django 6.x, Django REST Framework, SimpleJWT.
- **Database**: SQLite (Development) / PostgreSQL (Production optional).
- **AI Engine**: Google Gemini SDK (GenAI).

---

## 🧹 Project Cleanup & Git Preparation

To prepare the repository for hosting on Render and general version control, the project has been cleaned up:
1. **Unnecessary Directories Removed**:
   - `venv/` (Local Python Virtual Environment - ~15MB+)
   - `frontend/node_modules/` (Local Frontend dependencies - ~150MB+)
   - `frontend/dist/` (Local production build output)
2. **Root `.gitignore` Created**: 
   - A comprehensive `.gitignore` has been added to the root. This prevents committing heavy local folders (`node_modules`, `venv`), secrets (`.env`, `frontend/.env`), and temporary files (`__pycache__`, `db.sqlite3`) to Git, allowing for fast pushes and error-free builds.

---

## 🚀 Local Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- A Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### 2. Backend Setup
1. Create and activate a virtual environment:
   ```powershell
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure Environment:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   SECRET_KEY=your_django_secret_key_here
   DEBUG=True
   ```
4. Run migrations and start the server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```
   The backend API will run at `http://localhost:8000`.

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install modern dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   Access the workspace at `http://localhost:5173`.

---

## 🌩️ Deployment (Render)

Render deploys projects directly from GitHub/GitLab. First, initialize a git repository in the root directory, commit your files, and push to your git provider.

```bash
git init
git add .
git commit -m "Initial commit with clean structure"
```

### 1. Backend Deployment (Web Service)
Deploy the Django backend as a **Web Service**:

- **Repository**: Select your repository.
- **Language**: `Python`
- **Region**: Choose the region closest to your users.
- **Build Command**: 
  ```bash
  pip install -r requirements.txt; python manage.py migrate; python manage.py collectstatic --no-input
  ```
- **Start Command**: 
  ```bash
  gunicorn backend.wsgi
  ```
- **Environment Variables**:
  - `GEMINI_API_KEY`: *Your Google Gemini API Key*
  - `SECRET_KEY`: *A secure random string for Django (will raise an error in production if not set)*
  - `DEBUG`: `False` (forces production security settings, SSL redirect, and cookie protection)
  - `ALLOWED_HOSTS`: `your-backend-app.onrender.com` (comma-separated list of allowed host domains)
  - `DATABASE_URL`: *The connection URI for your PostgreSQL database (provisioned automatically if you attach a Render Postgres service)*
  - `CORS_ALLOWED_ORIGINS`: `https://your-frontend-app.onrender.com` (comma-separated list of allowed frontend URLs)

> [!IMPORTANT]
> **Database Configuration**: The database setup is fully production-ready and supports PostgreSQL database integration out of the box using `dj-database-url`. If no `DATABASE_URL` env variable is set, it will fallback to SQLite for local development. However, SQLite database files (`db.sqlite3`) on Render are ephemeral (recreated on every restart/redeploy). For persistent production storage, provision a PostgreSQL database service on Render and attach it to your web service.

---

### 2. Frontend Deployment (Static Site)
Deploy the React frontend as a **Static Site**:

- **Repository**: Select your repository.
- **Root Directory**: `frontend`
- **Build Command**: 
  ```bash
  npm run build
  ```
- **Publish Directory**: 
  ```text
  dist
  ```
- **Redirects/Rewrites**:
  Since this is a Single Page Application (SPA) using React Router, you must route all path requests back to `index.html`:
  - **Source Path**: `/*`
  - **Destination Path**: `/index.html`
  - **Action**: `Rewrite`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: `https://your-backend-app.onrender.com/api/` (must end with `/api/` and represent the URL of your Django backend web service on Render)

---

## 📜 License
This project is for educational and internship demonstration purposes.
