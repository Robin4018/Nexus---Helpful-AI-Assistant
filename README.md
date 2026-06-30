# Nexus AI - Intelligent Workspace

Nexus AI is a high-fidelity, focus-driven chat application built with **React (Vite)** and **Django**. It features the premium **Nexus-AI** design system, integrating a charcoal-amber aesthetic with advanced glassmorphism and motion transitions.

## Features

- **Premium Design**: Built the Nexus-AI interface using **Tailwind CSS**.
- **Intelligent AI**: Powered by **Google Gemini API** (`gemini-2.5-flash`) for fast, multimodal responses.
- **Document Analysis**: Upload documents (PDFs, Word documents, Text, Markdown) to get instant context-aware answers and citations.
- **Seamless UX & Motion**: Global page transitions and list entries animated with **Framer Motion**.
- **Full Mobile Responsiveness**: Adapts dynamically to all device screens, featuring a slide-in sidebar drawer and click-to-close blurred backdrops on mobile.
- **Secure Authentication**: JWT-based user login and signup with protected routes.
- **Self-Service Password Recovery**: Password reset system using secure email tokens.
- **Self-Service Account Deletion**: Users can permanently delete their account. The server automatically cleans up all their uploaded files from the disk before deleting database entries.

---

## Tech Stack

- **Frontend**: React with Vite, Tailwind CSS, Framer Motion, Lucide React, Sonner Toast.
- **Backend**: Django, Django REST Framework, SimpleJWT, python-docx, pypdf.
- **Database**: SQLite (Development) / PostgreSQL (Production).
- **AI Engine**: Google Gemini client.

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
2. Install dependencies:
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
