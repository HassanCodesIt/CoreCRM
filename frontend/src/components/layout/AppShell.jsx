import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-64">
        <Topbar />
        <main className="pt-16 min-h-screen">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
