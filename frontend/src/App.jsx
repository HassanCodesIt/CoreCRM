import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import Accounts from './pages/Accounts'
import AccountDetail from './pages/AccountDetail'
import Deals from './pages/Deals'
import DealDetail from './pages/DealDetail'
import Tickets from './pages/Tickets'
import TicketDetail from './pages/TicketDetail'
import Activities from './pages/Activities'
import Campaigns from './pages/Campaigns'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppShell />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="contacts/:id" element={<ContactDetail />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/:id" element={<AccountDetail />} />
          <Route path="deals" element={<Deals />} />
          <Route path="deals/:id" element={<DealDetail />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="activities" element={<Activities />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
