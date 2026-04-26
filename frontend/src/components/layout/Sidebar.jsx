import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  UserPlus,
  Building2, 
  Briefcase, 
  Trello, 
  Ticket, 
  Calendar, 
  Megaphone, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Leads', href: '/leads', icon: UserPlus },
  { name: 'Accounts', href: '/accounts', icon: Building2 },
  { name: 'Deals', href: '/deals', icon: Briefcase },
  { name: 'Tickets', href: '/tickets', icon: Ticket },
  { name: 'Activities', href: '/activities', icon: Calendar },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

export default function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuthStore()

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-20">
      <div className="flex items-center h-16 px-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Antigravity CRM</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                {item.name}
              </div>
              {isActive && <ChevronRight className="h-4 w-4 text-indigo-400" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <Link 
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors mb-2"
        >
          <Settings className="h-5 w-5 text-gray-400" />
          Settings
        </Link>
        
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
          <img 
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'U')}&background=6366f1&color=fff`} 
            alt="User avatar" 
            className="h-10 w-10 rounded-xl object-cover shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
