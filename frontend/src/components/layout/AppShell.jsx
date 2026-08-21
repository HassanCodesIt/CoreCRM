import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AICopilotSidebar from './AICopilotSidebar'

export default function AppShell() {
  const [copilotOpen, setCopilotOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main content — shift left when copilot is open on wide screens */}
      <div
        className="pl-64 transition-all duration-300"
        style={{ paddingRight: copilotOpen ? '24rem' : '0' }}
      >
        <Topbar />
        <main className="pt-16 min-h-screen">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Copilot sidebar */}
      <AICopilotSidebar isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />

      {/* Floating sparkle button — hidden while copilot is open */}
      {!copilotOpen && (
        <button
          id="ai-copilot-toggle"
          onClick={() => setCopilotOpen(true)}
          title="Open AI Copilot"
          className="fixed bottom-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        >
          <Sparkles className="h-4 w-4" />
          AI Copilot
        </button>
      )}
    </div>
  )
}
