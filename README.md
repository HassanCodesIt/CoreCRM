# 🚀 CoreCRM - AI-Powered Enterprise CRM & Sales Automation

CoreCRM is a modern, high-performance Customer Relationship Management (CRM) platform built with **FastAPI**, **React 18**, and **AI Copilot** integration. Designed for modern revenue and support teams, CoreCRM delivers intelligent lead scoring, automated deal pipeline management, custom field support, appointment scheduling, and AI-assisted customer communication.

---

## ✨ Key Features

### 🤖 AI Copilot & Smart Email Generator
- **Contextual AI Assistant**: Interactive sidebar powered by LLMs (Groq / OpenAI) for real-time CRM query processing, deal coaching, and lead summarization.
- **AI Email Composer**: Generate personalized sales outreach, follow-ups, and customer responses with configurable tones and objectives.

### 🎯 Lead & Contact Intelligence
- **Lead Lifecycle Management**: Track leads from discovery to conversion with automated lead scoring and SLA monitoring.
- **Rotting Lead Alerts**: Automated background scheduler identifies stale leads needing immediate follow-up.
- **Import & Merge Engine**: Batch CSV import wizard with duplicate contact detection and single-click record merging.
- **Custom Metadata**: Dynamically define custom fields and properties for tailored contact attributes.

### 📊 Pipelines & Deals Management
- **Interactive Kanban Board**: Drag-and-drop deal management across customizable pipeline stages powered by `@dnd-kit`.
- **Deal Stage History**: Audit trail of every deal transition, win/loss analytics, and revenue forecasting.
- **Account Aggregation**: Unified view linking accounts to contacts, past activities, notes, and open deals.

### 📅 Built-in Appointment Scheduler
- **Interactive Calendar**: Full calendar view (`@fullcalendar`) for meetings, tasks, and team schedules.
- **Public Client Booking**: Dedicated public booking URL (`/booking/:slug`) allowing clients to self-schedule slots.

### 🎫 Support & Ticket Desk
- **Omnichannel Service Desk**: Centralized ticket workspace with priority routing, SLA tracking, status updates, and customer attachment management.
- **Public Ticket Submission**: Embeddable customer portal for quick support request generation.

### 📈 Reports, Analytics & Leaderboards
- **Executive Dashboards**: Real-time interactive charts built with Recharts highlighting deal conversions, revenue trends, and team activity streams.
- **Sales Leaderboards**: Gamified performance metrics tracking agent response times and closed deals.
- **Exportable Reports**: Generate detailed audit and performance metrics for executive reporting.

---

## 🛠️ Tech Stack & Architecture

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Database ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async Engine)
- **Database**: SQLite (Development) / PostgreSQL via `asyncpg` (Production)
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Background Jobs**: [APScheduler](https://apscheduler.readthedocs.io/)
- **AI Engine**: Groq SDK / OpenAI API
- **Auth & Security**: OAuth2 with JWT tokens (`python-jose`), `passlib` with `bcrypt`

### Frontend
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: Tailwind CSS + Radix UI components
- **State & Data Fetching**: TanStack React Query v5 + Zustand
- **Drag & Drop**: `@dnd-kit/core` & `@dnd-kit/sortable`
- **Calendar**: FullCalendar React
- **Icons & Charts**: Lucide React & Recharts

---

## 📁 Repository Structure

```
CoreCRM/
├── backend/
│   ├── app/
│   │   ├── core/           # Auth, security, and app configurations
│   │   ├── models/         # SQLAlchemy Async ORM data models
│   │   ├── routers/        # FastAPI endpoint routes (Leads, Deals, AI, Tickets, etc.)
│   │   ├── scheduler/      # Background jobs (Rotting leads, SLA timers)
│   │   ├── schemas/        # Pydantic data validation & serialization schemas
│   │   └── services/       # Core business logic (AI generation, deduplication, audit logs)
│   ├── main.py             # Application entrypoint & FastAPI setup
│   ├── seed.py             # Database seed script for initial testing data
│   └── requirements.txt    # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios HTTP client endpoints
│   │   ├── components/     # UI components (Kanban, Modals, AI Sidebar, Tables)
│   │   ├── pages/          # Application views (Dashboard, Deals, Leads, Scheduler)
│   │   ├── store/          # Global application state (Auth state)
│   │   └── main.jsx        # Frontend entrypoint
│   ├── package.json        # Frontend Node dependencies & scripts
│   └── vite.config.js      # Vite bundler configuration
└── README.md
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.x or higher
- **npm** or **yarn**

---

### 1. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows**:
     ```bash
     python -m venv .venv
     .venv\Scripts\activate
     ```
   - **macOS/Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `.env` file inside the `backend/` directory:
   ```env
   SECRET_KEY=your_super_secret_jwt_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   DATABASE_URL=sqlite+aiosqlite:///./crm_dev.db
   GROQ_API_KEY=your_groq_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. **Seed Initial Database (Optional)**:
   ```bash
   python seed.py
   ```

6. **Start the FastAPI Backend Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The API documentation will be accessible at [http://localhost:8000/docs](http://localhost:8000/docs).*

---

### 2. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file inside the `frontend/` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Start the Frontend Development Server**:
   ```bash
   npm run dev
   ```
   *Access the web application at [http://localhost:5173](http://localhost:5173).*

---

## 🧪 Running Tests

To run frontend component and utility unit tests:
```bash
cd frontend
npm test
```

---

## 🤝 Contributing

Contributions are always welcome! Feel free to open an issue or submit a pull request:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
