# Nexus AI - Intelligent Workspace

Nexus AI is a high-fidelity, focus-driven chat application built with **React (Vite)** and **Django**. It features the premium **Nexus-AI** design system, integrating a charcoal-amber aesthetic with advanced glassmorphism and motion transitions.

## Features

- **Premium Design**: Built the Nexus-AI interface using **Tailwind CSS v4**.
- **Intelligent AI**: Powered by **Google Gemini API** (`gemini-2.5-flash-lite`) for fast, multimodal-ready responses.
- **Seamless UX**: Global page transitions powered by **Framer Motion** and **AnimatePresence**.
- **Advanced UI Components**:
  - Custom glassmorphism sidebar and chat area.
  - **Sonner** toast notifications for status updates.
  - Custom Nexus-styled deletion confirmation modals.
  - Multi-turn conversation awareness and persistence.
- **Secure Auth**: JWT-based authentication (Login/Signup) with protected workspace routing.
- **Markdown Support**: Rich text rendering for AI responses includes code highlighting and styled typography.

## Tech Stack

- **Frontend**: React with Vite, Tailwind CSS, Framer Motion, Lucide React, Sonner.
- **Backend**: Django, Django REST Framework, SimpleJWT.
- **Database**: SQLite.
- **AI Engine**: Google Gemini.

---

## Local Setup

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

## 📜 License
This project is for educational and internship demonstration purposes.
