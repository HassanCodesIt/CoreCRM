import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { activitiesApi } from '../api/activities'
import { usersApi } from '../api/users'
import { Calendar as CalendarIcon, Filter, Plus, Search, Users, RefreshCw, Sparkles, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import MeetingModal from '../components/activities/MeetingModal'
import toast from 'react-hot-toast'

const MEETING_TYPES = [
  { value: 'discovery', label: 'Discovery', color: '#6366f1', bg: '#f5f3ff', text: '#4338ca', border: '#e0e7ff' },
  { value: 'demo', label: 'Demo', color: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  { value: 'follow_up', label: 'Follow-up', color: '#10b981', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  { value: 'internal', label: 'Internal', color: '#8b5cf6', bg: '#faf5ff', text: '#6d28d9', border: '#e9d5ff' },
  { value: 'success', label: 'Success', color: '#f43f5e', bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }
]

export default function Scheduler() {
  const { user } = useAuthStore()
  const calendarRef = useRef(null)

  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [usersList, setUsersList] = useState([])
  
  // Modals & form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [initialModalData, setInitialModalData] = useState(null)

  // Custom UI view state
  const [currentView, setCurrentView] = useState('Week')
  const [miniDate, setMiniDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Filters State
  const [selectedTypes, setSelectedTypes] = useState(['discovery', 'demo', 'follow_up', 'internal', 'success'])
  const [filterOwner, setFilterOwner] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const response = await activitiesApi.getAll({ limit: 500, activity_type: 'meeting' })
      setMeetings(response.data?.items || response.data?.data || [])
    } catch (error) {
      toast.error('Failed to fetch meetings')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll()
      setUsersList(response.data?.items || response.data?.data || [])
    } catch (error) {
      if (user) {
        setUsersList([user])
      }
    }
  }

  useEffect(() => {
    fetchMeetings()
    fetchUsers()
  }, [])

  // View navigation handler
  const handleViewChange = (view) => {
    setCurrentView(view)
    if (calendarRef.current) {
      const api = calendarRef.current.getApi()
      if (view === 'Day') api.changeView('timeGridDay')
      else if (view === 'Week') api.changeView('timeGridWeek')
      else if (view === 'Month') api.changeView('dayGridMonth')
      else if (view === 'Agenda') api.changeView('listWeek')
    }
  }

  // Drag & drop reschedule
  const handleEventChange = async (changeInfo) => {
    const meetingId = changeInfo.event.id
    const start = changeInfo.event.start
    const end = changeInfo.event.end
    const duration = end 
      ? Math.round((end.getTime() - start.getTime()) / 60000) 
      : 30

    try {
      await activitiesApi.update(meetingId, {
        due_date: start.toISOString(),
        duration_minutes: duration
      })
      toast.success('Meeting rescheduled successfully')
      fetchMeetings()
    } catch (err) {
      toast.error('Failed to reschedule meeting')
      changeInfo.revert()
    }
  }

  // Handle slot click (Quick Create)
  const handleDateSelect = (selectInfo) => {
    setInitialModalData({
      due_date: selectInfo.startStr,
      duration_minutes: Math.round((selectInfo.end - selectInfo.start) / 60000),
      assigned_to: user?.id
    })
    setSelectedMeeting(null)
    setIsModalOpen(true)
    setSelectedDate(new Date(selectInfo.start))
  }

  // Handle meeting save
  const handleSaveMeeting = async (data) => {
    try {
      if (selectedMeeting) {
        await activitiesApi.update(selectedMeeting.id, data)
        toast.success('Meeting updated')
      } else {
        await activitiesApi.create(data)
        toast.success('Meeting scheduled')
      }
      fetchMeetings()
      setIsModalOpen(false)
    } catch (err) {
      toast.error('Failed to save meeting')
    }
  }

  // Handle meeting delete
  const handleDeleteMeeting = async (id) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return
    try {
      await activitiesApi.delete(id)
      toast.success('Meeting deleted')
      fetchMeetings()
      setIsModalOpen(false)
    } catch (err) {
      toast.error('Failed to delete meeting')
    }
  }

  const getMeetingStyles = (m) => {
    const typeCfg = MEETING_TYPES.find(t => t.value === m.meeting_type) || {
      color: '#9ca3af', bg: '#f3f4f6', text: '#1f2937', border: '#9ca3af'
    }
    const start = new Date(m.due_date)
    const end = new Date(start.getTime() + (m.duration_minutes || 30) * 60 * 1000)
    const now = new Date()
    const isActive = now >= start && now <= end
    const isPast = now > end

    let background = typeCfg.bg
    let text = typeCfg.text
    let border = typeCfg.border

    const isCompleted = m.is_completed || m.meeting_status === 'completed'
    const isCancelled = m.meeting_status === 'cancelled'

    if (isCancelled) {
      background = '#fee2e2'
      text = '#991b1b'
      border = '#f87171'
    }

    return {
      backgroundColor: background,
      borderColor: isActive ? '#6366f1' : border,
      textColor: text,
      classNames: [
        isCompleted ? 'opacity-60 line-through' : '',
        isCancelled ? 'opacity-50 line-through saturate-50' : '',
        isActive ? 'shadow-md shadow-indigo-50 font-bold border-2 ring-2 ring-indigo-500 ring-offset-1 z-10' : '',
        isPast && !isCompleted ? 'border-dashed' : ''
      ].join(' ')
    }
  }

  // Filter meetings
  const filteredMeetings = meetings.filter(m => {
    if (!selectedTypes.includes(m.meeting_type)) return false
    if (filterOwner && m.assigned_to !== filterOwner) return false
    if (filterStatus) {
      if (filterStatus === 'completed' && !m.is_completed && m.meeting_status !== 'completed') return false
      if (filterStatus === 'cancelled' && m.meeting_status !== 'cancelled') return false
      if (filterStatus === 'scheduled' && (m.is_completed || m.meeting_status === 'cancelled' || m.meeting_status === 'completed')) return false
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (m.subject || '').toLowerCase().includes(q) || (m.body || '').toLowerCase().includes(q)
    }
    return true
  })

  const events = filteredMeetings.map(m => {
    const start = new Date(m.due_date)
    const end = new Date(start.getTime() + (m.duration_minutes || 30) * 60 * 1000)
    const styles = getMeetingStyles(m)

    return {
      id: m.id,
      title: m.subject || 'Meeting',
      start: start.toISOString(),
      end: end.toISOString(),
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      textColor: styles.textColor,
      classNames: styles.classNames,
      extendedProps: m
    }
  })

  // Mini Calendar Navigation
  const changeMiniMonth = (offset) => {
    const nextDate = new Date(miniDate)
    nextDate.setMonth(miniDate.getMonth() + offset)
    setMiniDate(nextDate)
  }

  // Generate Mini Calendar days
  const getDaysInMonth = () => {
    const year = miniDate.getFullYear()
    const month = miniDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    const days = []
    // Pad previous month days
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const navigateToDate = (d) => {
    if (!d || !calendarRef.current) return
    const api = calendarRef.current.getApi()
    api.gotoDate(d)
    setSelectedDate(d)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-100px)]">
      {/* Sidebar Filters */}
      <div className="w-full lg:w-72 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-6 h-fit lg:h-full overflow-y-auto shrink-0">
        
        {/* Search */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl text-xs focus:ring-2 focus:ring-indigo-100 font-semibold text-gray-700"
            />
          </div>
        </div>

        {/* Interactive Meeting Type Checklist */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Meeting Types</label>
          <div className="space-y-2.5">
            {MEETING_TYPES.map((t) => {
              const isChecked = selectedTypes.includes(t.value)
              return (
                <button
                  key={t.value}
                  onClick={() => {
                    if (isChecked) {
                      setSelectedTypes(selectedTypes.filter(val => val !== t.value))
                    } else {
                      setSelectedTypes([...selectedTypes, t.value])
                    }
                  }}
                  className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-1.5 rounded-xl transition-all"
                >
                  <span className="text-xs font-bold text-gray-700">{t.label}</span>
                  <div
                    className={`h-5.5 w-5.5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isChecked 
                        ? 'bg-indigo-600 border-indigo-600' 
                        : 'border-gray-300'
                    }`}
                  >
                    {isChecked && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Mini Inline Calendar */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-gray-800 tracking-tight">
              {miniDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => changeMiniMonth(-1)} className="p-1 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-700">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => changeMiniMonth(1)} className="p-1 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-700">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-1.5 text-center text-[10px] font-semibold text-gray-400">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            {getDaysInMonth().map((d, idx) => {
              if (!d) return <span key={`empty-${idx}`} />
              const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString()
              const isToday = d.toDateString() === new Date().toDateString()
              return (
                <button
                  key={idx}
                  onClick={() => navigateToDate(d)}
                  className={`py-1 rounded-lg font-bold text-xs transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-100' 
                      : isToday 
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Teammate Availability Info */}
        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
          <div className="flex -space-x-2 shrink-0">
            <div className="h-6.5 w-6.5 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-indigo-700">AU</div>
            <div className="h-6.5 w-6.5 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-emerald-700">SM</div>
          </div>
          <span className="text-[10px] font-bold text-gray-400 leading-tight">
            3 teammates are also free during your Wed 2 PM slot.
          </span>
        </div>

      </div>

      {/* Main Calendar Card View */}
      <div className="flex-1 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
        {/* Top bar actions */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Calendar & Meetings</h1>
          
          {/* Custom view switcher */}
          <div className="flex bg-gray-100/80 p-1 rounded-full border border-gray-100 shadow-inner">
            {['Day', 'Week', 'Month', 'Agenda'].map((v) => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`px-4 py-1.5 mx-1 rounded-full text-xs font-bold transition-all ${
                  currentView === v 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMeetings}
              className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="Refresh Calendar"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => {
                setSelectedMeeting(null)
                setInitialModalData(null)
                setIsModalOpen(true)
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-md shadow-indigo-100 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              Schedule New
            </button>
          </div>
        </div>

        {/* FullCalendar wrapper */}
        <div className="flex-1 overflow-y-auto pr-1">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false} /* Hide default header */
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            slotDuration="00:30:00"
            allDaySlot={false}
            nowIndicator={true}
            select={handleDateSelect}
            eventClick={(clickInfo) => {
              setSelectedMeeting(clickInfo.event.extendedProps)
              setInitialModalData(null)
              setIsModalOpen(true)
              if (clickInfo.event.start) {
                setSelectedDate(new Date(clickInfo.event.start))
              }
            }}
            datesSet={(dateInfo) => {
              if (dateInfo.view.type === 'timeGridDay' && dateInfo.view.currentStart) {
                setSelectedDate(new Date(dateInfo.view.currentStart))
              }
            }}
            eventDrop={handleEventChange}
            eventResize={handleEventChange}
            height="100%"
          />
        </div>

        {/* AI Insight banner at bottom right */}
        <div className="flex items-center gap-2 bg-[#f5f3ff] text-indigo-700 text-xs px-4 py-2.5 rounded-full border border-indigo-100 font-bold self-end mt-4 shadow-sm">
          <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
          AI Insight: Optimal time for Success Calls is Thursday AM
        </div>
      </div>

      {/* Meeting Create/Edit Modal */}
      <MeetingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedMeeting(null)
          setInitialModalData(null)
        }}
        meeting={selectedMeeting}
        initialData={initialModalData}
        onSave={handleSaveMeeting}
        onDelete={handleDeleteMeeting}
      />

      {/* Custom FullCalendar Styling overrides */}
      <style>{`
        .fc .fc-timegrid-now-indicator-line {
          border-color: #6366f1 !important;
          border-top-width: 2px !important;
        }
        .fc .fc-timegrid-now-indicator-arrow {
          border-left-color: #6366f1 !important;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #f1f5f9 !important;
        }
        .fc-col-header-cell {
          background-color: #ffffff;
          padding: 8px 0 !important;
          border-bottom: 2px solid #f1f5f9 !important;
        }
        .fc-col-header-cell-cushion {
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase;
          color: #64748b !important;
          display: flex !important;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        /* Style highlighted current day */
        .fc-day-today {
          background-color: #f5f3ff/40 !important;
        }
        .fc-day-today .fc-col-header-cell-cushion {
          color: #6366f1 !important;
        }
        .fc-timegrid-slot {
          height: 3.5rem !important;
        }
        .fc-timegrid-axis-cushion {
          font-size: 10px !important;
          font-weight: 700 !important;
          color: #94a3b8 !important;
        }
      `}</style>
    </div>
  )
}
