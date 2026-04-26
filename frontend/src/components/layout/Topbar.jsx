import { useState, useEffect, useRef } from 'react'
import { Search, Bell, Menu, User as UserIcon, LogOut, Settings, Briefcase, MessageSquare, User as ContactIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { searchApi } from '../../api/search'
import { notificationsApi } from '../../api/notifications'

export default function Topbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [showProfile, setShowProfile] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const searchRef = useRef(null)
  const notificationRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotificationStats = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        notificationsApi.getUnreadCount(),
        notificationsApi.list({ limit: 5 })
      ])
      setUnreadCount(countRes.data.count)
      setNotifications(listRes.data)
    } catch (error) {
      console.error('Failed to fetch notifications', error)
    }
  }

  useEffect(() => {
    fetchNotificationStats()
    const interval = setInterval(fetchNotificationStats, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      toast.error('Failed to mark all as read')
    }
  }

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await notificationsApi.markAsRead(notif.id)
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    }
    
    if (notif.reference_type && notif.reference_id) {
      const paths = {
        contact: `/contacts/${notif.reference_id}`,
        deal: `/deals/${notif.reference_id}`
      }
      navigate(paths[notif.reference_type])
      setShowNotifications(false)
    }
  }

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      setShowResults(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await searchApi.globalSearch(query)
        setResults(response.data)
        setShowResults(true)
      } catch (error) {
        console.error('Search failed', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleResultClick = (type, id) => {
    const paths = {
      contact: `/contacts/${id}`,
      deal: `/deals/${id}`,
      ticket: `/tickets/${id}`
    }
    navigate(paths[type])
    setShowResults(false)
    setQuery('')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-64 z-10 shadow-sm">
      <div className="h-full px-8 flex items-center justify-between">
        <div className="flex-1 max-w-lg relative" ref={searchRef}>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-4 w-4 ${loading ? 'text-indigo-500 animate-pulse' : 'text-gray-400'} group-focus-within:text-indigo-500 transition-colors`} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim() && setShowResults(true)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-100 rounded-2xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-400 sm:text-sm transition-all font-medium"
              placeholder="Search anything..."
            />
          </div>

          {showResults && results && (
            <div className="absolute mt-2 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="max-h-[70vh] overflow-y-auto">
                  {['contacts', 'deals', 'tickets'].map(category => {
                    const iconMap = {
                      contacts: ContactIcon,
                      deals: Briefcase,
                      tickets: MessageSquare
                    }
                    const Icon = iconMap[category]
                    const data = results[category] || []
                    
                    if (data.length === 0) return null

                    return (
                      <div key={category} className="mb-2">
                        <div className="px-4 py-2 border-b border-gray-50 mb-1">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{category}</p>
                        </div>
                        {data.map(item => (
                          <button
                            key={item.id}
                            onClick={() => handleResultClick(item.type, item.id)}
                            className="w-full flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors group text-left"
                          >
                            <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                               <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 truncate">
                                  {item.name || item.title || item.subject}
                               </p>
                               <p className="text-[10px] text-gray-500 font-medium truncate uppercase tracking-tighter">
                                  {item.email || item.stage || item.ticket_number}
                               </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                  {Object.values(results).every(v => v.length === 0) && (
                     <div className="px-6 py-12 text-center">
                        <p className="text-sm font-bold text-gray-400">No results found for "{query}"</p>
                     </div>
                  )}
               </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Bell className="h-5 w-5 text-gray-300" />
                      </div>
                      <p className="text-xs font-bold text-gray-400">No new notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map(notif => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`w-full p-5 text-left hover:bg-gray-50 transition-colors flex gap-4 ${!notif.is_read ? 'bg-indigo-50/30' : ''}`}
                        >
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                            notif.type === 'lead_assigned' ? 'bg-emerald-50 text-emerald-600' :
                            notif.type === 'deal_stage_changed' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-gray-50 text-gray-400'
                          }`}>
                            {notif.type === 'lead_assigned' ? <ContactIcon className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 mb-0.5">{notif.title}</p>
                            <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-2">{notif.body}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <div className="h-2 w-2 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100 text-center">
                  <button className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                    View all notifications
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-8 w-px bg-gray-100 mx-2" />

          <div className="relative">
            <button 
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 p-1 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
            >
              <img 
                src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'U')}&background=6366f1&color=fff`} 
                alt="" 
                className="h-9 w-9 rounded-xl shadow-md border-2 border-white ring-1 ring-gray-100"
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-black text-gray-900 tracking-tight">{user?.full_name}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{user?.role}</p>
              </div>
            </button>

            {showProfile && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowProfile(false)}
                />
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-[2rem] shadow-2xl border border-gray-100 py-3 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 py-2 border-b border-gray-50 mb-2">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Account Details</p>
                  </div>
                  <button className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors group">
                    <UserIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                    My Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors group">
                    <Settings className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                    Settings
                  </button>
                  <div className="h-px bg-gray-50 my-2 mx-5" />
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors group"
                  >
                    <LogOut className="h-4 w-4 text-rose-400 group-hover:text-rose-600" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
