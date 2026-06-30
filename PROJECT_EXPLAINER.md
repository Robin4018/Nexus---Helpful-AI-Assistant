# 🚀 Welcome to Nexus AI: The Ultimate Project Guide!

Hello! Imagine you are building a **Super-Smart AI Assistant Robot** that can talk, read documents, remember your name, and help you reset your password when you forget it. This guide is written to explain how all the pieces of this project fit together—so simply that a 6th-grade student could explain it to their class!

---

## 🍔 The "Restaurant" Analogy: How It Works

To understand this project, think of it like a **Premium Restaurant**:

1. **The Dining Area (The Frontend - React)**: This is where the customer sits. It has a beautiful menu card, nice chairs (buttons, inputs), and takes orders. The customer doesn't see the kitchen; they only see the pretty dining tables.
2. **The Waiter (API Calls - Axios)**: The waiter takes the order from the dining table and runs it to the kitchen, and then brings the hot food back to the customer.
3. **The Kitchen (The Backend - Django)**: This is where the chefs work. When an order arrives, they cook it. They fetch ingredients from the pantry, combine them, and prepare the final dish.
4. **The Pantry/Fridge (The Database - SQLite/PostgreSQL)**: This is where all the food ingredients are safely stored. It remembers all registered users, past chat history, and uploaded files.
5. **The Recipes Expert (Google Gemini AI)**: When the chef gets a tricky cooking order (like "Summarize this PDF file"), the chef picks up the phone and calls a world-class recipes expert (the Gemini AI model) to get the answer.

---

## 📂 Folders Explained (The Major Sections)

Here is what the big folders inside your project do:

| Folder Name | Path | What is it? | Necessary? | Why is it used? |
| :--- | :--- | :--- | :--- | :--- |
| **`backend/`** | [backend/](file:///c:/Users/Lenovo/Desktop/Techjays/backend) | The Chef's Master Office | **YES** | Contains the core configuration settings and main router for the Django kitchen. |
| **`chat/`** | [chat/](file:///c:/Users/Lenovo/Desktop/Techjays/chat) | The Cooking Station | **YES** | The heart of the backend. It contains the actual logic for chat databases, AI connections, and user accounts. |
| **`frontend/`** | [frontend/](file:///c:/Users/Lenovo/Desktop/Techjays/frontend) | The Beautiful Dining Room | **YES** | Contains the React application that draws the screens, buttons, and user interface. |
| **`media/`** | [media/](file:///c:/Users/Lenovo/Desktop/Techjays/media) | The File Storage Locker | **YES** | A temporary storage folder where files uploaded by users (PDFs, images) are saved on the server. |
| **`venv/`** | [venv/](file:///c:/Users/Lenovo/Desktop/Techjays/venv) | The Chef's Toolbox | **YES (for local development)** | A "virtual environment" containing the exact Python tools and libraries required to run this project. We do not upload this to GitHub. |

---

## 📄 Root-Level Files (The Control Panel)

These files sit in the main project folder. They are like the manuals and setup instructions for our restaurant.

### 1. [`.env`](file:///c:/Users/Lenovo/Desktop/Techjays/.env)
* **What it is**: The Secret Diary.
* **Is it Necessary?**: **YES (locally)**. 
* **Why it's used**: It stores secret values (like the `GEMINI_API_KEY` and database passwords) so they are not shared publicly on GitHub.

### 2. [`.gitignore`](file:///c:/Users/Lenovo/Desktop/Techjays/.gitignore)
* **What it is**: The "Do Not Pack" Packing List.
* **Is it Necessary?**: **YES**. 
* **Why it's used**: Tells Git which files to ignore (like private keys, database caches, or large folders) when saving the project to GitHub.

### 3. [`.python-version`](file:///c:/Users/Lenovo/Desktop/Techjays/.python-version)
* **What it is**: The Tool Ruler.
* **Is it Necessary?**: **YES (for deployment)**.
* **Why it's used**: Forces hosting services like Render to use the correct Python version (like `3.12.3`) instead of buggy pre-release versions.

### 4. [`Procfile`](file:///c:/Users/Lenovo/Desktop/Techjays/Procfile)
* **What it is**: The Server's Starting Bell.
* **Is it Necessary?**: **YES (for hosting)**.
* **Why it's used**: Tells Render exactly how to start our backend server code when deploying live.

### 5. [`requirements.txt`](file:///c:/Users/Lenovo/Desktop/Techjays/requirements.txt)
* **What it is**: The Ingredients Shopping List.
* **Is it Necessary?**: **YES**. 
* **Why it's used**: Lists all Python libraries and helper tools that the computer needs to install to make the backend run.

### 6. [`db.sqlite3`](file:///c:/Users/Lenovo/Desktop/Techjays/db.sqlite3)
* **What it is**: The Local Notebook.
* **Is it Necessary?**: **NO (in production)**. 
* **Why it's used**: A simple, local file-based database for development. In production, we use a much stronger database called PostgreSQL.

### 7. [`manage.py`](file:///c:/Users/Lenovo/Desktop/Techjays/manage.py)
* **What it is**: The Chef's Magic Wand.
* **Is it Necessary?**: **YES**. 
* **Why it's used**: A script that lets us run commands (like starting the server, updating the database, or creating superusers).

### 8. [`README.md`](file:///c:/Users/Lenovo/Desktop/Techjays/README.md)
* **What it is**: The Welcome Manual.
* **Is it Necessary?**: **NO (but highly recommended)**.
* **Why it's used**: Contains human-readable instructions on how to install and run the project for other developers.

---

## 🍳 Backend Files Detail (`backend/` folder)

These files set up the core rules and gateways for Django.

* **[`backend/__init__.py`](file:///c:/Users/Lenovo/Desktop/Techjays/backend/__init__.py)**: 
  * *What & Why*: An empty file that tells Python, "Hey, treat this folder as a package of scripts!" (Necessary: Yes).
* **[`backend/settings.py`](file:///c:/Users/Lenovo/Desktop/Techjays/backend/settings.py)**: 
  * *What & Why*: The **Master Rulebook**. Tells Django which database to connect to, what security headers to use, and how to send emails. (Necessary: Yes).
* **[`backend/urls.py`](file:///c:/Users/Lenovo/Desktop/Techjays/backend/urls.py)**: 
  * *What & Why*: The **Main Gatekeeper**. Routes main URL requests to correct sections (e.g. sends `/api/` traffic to the `chat` application). (Necessary: Yes).
* **[`backend/wsgi.py`](file:///c:/Users/Lenovo/Desktop/Techjays/backend/wsgi.py) & [`backend/asgi.py`](file:///c:/Users/Lenovo/Desktop/Techjays/backend/asgi.py)**: 
  * *What & Why*: The **Translators** that help our Python app talk to web server hosts (Gunicorn) to serve users online. (Necessary: Yes).

---

## 💬 Chat Application Backend (`chat/` folder)

This is where the actual backend features (chat, databases, and files) are built.

* **[`chat/admin.py`](file:///c:/Users/Lenovo/Desktop/Techjays/chat/admin.py)**: 
  * *What & Why*: Registers our models so that they show up in Django's built-in Admin Panel dashboard. (Necessary: No, but helpful for administrators).
* **[`chat/apps.py`](file:///c:/Users/Lenovo/Desktop/Techjays/chat/apps.py)**: 
  * *What & Why*: Core application configuration file. It registers our email signals on startup. (Necessary: Yes).
* **[`chat/models.py`](file:///c:/Users/Lenovo/Desktop/Techjays/chat/models.py)**: 
  * *What & Why*: The **Blueprint of the Pantry**. It defines how our data is stored (Conversations, Messages, and Uploaded Files columns). (Necessary: Yes).
* **[`chat/serializers.py`](file:///c:/Users/Lenovo/Desktop/Techjays/chat/serializers.py)**: 
  * *What & Why*: The **JSON Translators**. Converts Django database rows into clean text formats (JSON) that React can understand. (Necessary: Yes).
* **[`chat/signals.py`](file:///c:/Users/Lenovo/Desktop/Techjays/chat/signals.py)**: 
  * *What & Why*: The **Email Postman**. Listens for password reset events and automatically formats and triggers a Gmail reset link email. (Necessary: Yes, for self-service password reset).
* **[`chat/urls.py`](file:///c:/Users/Lenovo/Desktop/Techjays/chat/urls.py)**: 
  * *What & Why*: The **Internal Maps**. Directs API requests (like `/api/signup/`, `/api/login/`, and `/api/conversations/`) to their corresponding views. (Necessary: Yes).
* **[`chat/utils.py`](file:///c:/Users/Lenovo/Desktop/Techjays/chat/utils.py)**: 
  * *What & Why*: The **Smart Toolkit**. Contains helper functions to read PDF or Word documents and extract text so the AI can analyze them. (Necessary: Yes).
* **[`chat/views.py`](file:///c:/Users/Lenovo/Desktop/Techjays/chat/views.py)**: 
  * *What & Why*: The **Chef's Recipe Book**. These are the handlers that get executed when URLs are visited (like handling chat logic, registering users, or querying Gemini AI). (Necessary: Yes).
* **`chat/migrations/`**: 
  * *What & Why*: A folder containing database migration instructions. (Necessary: Yes).

---

## 🖥️ Frontend Files Detail (`frontend/` folder)

This folder contains the React user interface.

* **[`frontend/index.html`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/index.html)**: 
  * *What & Why*: The single HTML frame that loads our React application. Every screen you see is drawn inside this single page! (Necessary: Yes).
* **[`frontend/package.json`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/package.json)**: 
  * *What & Why*: The dependency list for React. It lists all JavaScript libraries (like Lucide icons, Tailwind, Framer Motion) required for the frontend app. (Necessary: Yes).
* **[`frontend/vite.config.js`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/vite.config.js)**: 
  * *What & Why*: Configuration script for Vite—our superfast compiler that builds and bundles the frontend. (Necessary: Yes).
* **[`frontend/eslint.config.js`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/eslint.config.js)**: 
  * *What & Why*: A style-checker tool that makes sure our javascript code is typed cleanly and follows standard rules. (Necessary: No, but good for code quality).

---

## 🎨 Frontend Source Files Detail (`frontend/src/` folder)

These files define what is shown on screen and how it functions.

* **[`frontend/src/main.jsx`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/main.jsx)**: 
  * *What & Why*: The entrypoint script that boots up React and hooks it into `index.html`. (Necessary: Yes).
* **[`frontend/src/App.jsx`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/App.jsx)**: 
  * *What & Why*: The **Traffic Router**. It handles screen transitions (routing) between Login, Signup, Forgot Password, Reset Password, and Chat pages. (Necessary: Yes).
* **[`frontend/src/index.css`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/index.css)**: 
  * *What & Why*: The **Color and Style Catalog**. Defines Tailwind tokens, glassmorphism templates, animations, scrollbars, and overall premium design system. (Necessary: Yes).
* **[`frontend/src/api/axios.js`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/api/axios.js)**: 
  * *What & Why*: The **Phone line**. Configures Axios to send backend network calls automatically prepending authentication headers (JWT keys). (Necessary: Yes).
* **[`frontend/src/context/AuthContext.jsx`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/context/AuthContext.jsx)**: 
  * *What & Why*: The **Identity Card**. Retains user status, handles login and signup requests, and stores the user's session tokens so they stay signed in. (Necessary: Yes).
* **[`frontend/src/lib/utils.js`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/lib/utils.js)**: 
  * *What & Why*: Small helper library for tailwind class modifications. (Necessary: Yes).

### 🖥️ Page Components (`frontend/src/pages/` folder)

These define the user interfaces.

* **[`LoginPage.jsx`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/pages/LoginPage.jsx)**: 
  * *What & Why*: The workspace sign-in screen, featuring full mobile responsiveness, password hide/show eye-toggles, and a redirect trigger. (Necessary: Yes).
* **[`SignupPage.jsx`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/pages/SignupPage.jsx)**: 
  * *What & Why*: The registration screen where users can build a workspace account (also features mobile layouts and visibility toggles). (Necessary: Yes).
* **[`ForgotPasswordPage.jsx`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/pages/ForgotPasswordPage.jsx)**: 
  * *What & Why*: The password recovery screen. Requests a reset token to be emailed to their registered address. (Necessary: Yes).
* **[`ResetPasswordPage.jsx`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/pages/ResetPasswordPage.jsx)**: 
  * *What & Why*: The screen loaded from reset links where users choose a new secure password. (Necessary: Yes).
* **[`ChatPage.jsx`](file:///c:/Users/Lenovo/Desktop/Techjays/frontend/src/pages/ChatPage.jsx)**: 
  * *What & Why*: The **Ultimate Workspace Dashboard**. It displays conversations, outputs message bubbles, lets users upload documents, handles AI typing loops, and includes a secure slide-out drawer on mobile screens and a "Delete Account" button. (Necessary: Yes).

---

## 💡 Quick Summary

Every file in this project has a specific job:
* The **Frontend** files build the visual interface.
* The **Backend** files build the database connections and AI integration.
* The **Configuration** files make sure that when you put this online (Render), the server knows how to deploy it correctly.
