## Deployment (Render)

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