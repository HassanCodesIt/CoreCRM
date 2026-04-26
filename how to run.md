# Antigravity CRM

A modern, high-performance CRM with AI-powered sales intelligence, built with FastAPI (Python) and React (Vite).

## 🚀 Quick Start Guide

Follow these steps to set up and run the CRM from scratch.

### 1. Backend Setup (FastAPI)

Prerequisites: Python 3.10+ installed.

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (if not exists)
# Fill in your SECRET_KEY and GROQ_API_KEY
# Use the provided .env as a template

# Seed the database with demo data (Clears existing data)
python seed.py

# Run the backend server
uvicorn app.main:app --reload
```

The backend API will be available at: `http://localhost:8000`

---

### 2. Frontend Setup (React + Vite)

Prerequisites: Node.js 18+ installed.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend application will be available at: `http://localhost:5173`

---

### 3. Default Login Credentials

After seeding the database, use the following credentials to log in:

- **Admin**: `admin@crm.com` / `admin123`
- **Manager**: `manager@crm.com` / `manager123`
- **Rep**: `rep@crm.com` / `rep123`

---

## ✨ Features

- **AI Sales Intelligence**: Real-time sales insights powered by Llama 3 via Groq.
- **RBAC (Role-Based Access Control)**: Different menus and permissions for Admin, Manager, and Rep.
- **Dynamic Dashboard**: Responsive charts, funnels, and real-time metrics.
- **Full Module Suite**: Contacts, Accounts, Deals, Tickets, Activities, and Campaigns.
- **Premium Design**: Modern, glassmorphism-inspired UI with smooth micro-animations.
