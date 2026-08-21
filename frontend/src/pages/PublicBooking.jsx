import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getHostDetails, getAvailability, bookMeeting } from '../api/scheduler'
import { Calendar, Clock, Video, CheckCircle, ChevronRight, AlertCircle, Building2, User, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PublicBooking() {
  const { userId } = useParams()
  const [host, setHost] = useState(null)
  const [loadingHost, setLoadingHost] = useState(true)
  const [hostError, setHostError] = useState(null)

  // Availability calendar state
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')

  // Booking details form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [subject, setSubject] = useState('Discovery Meeting')
  const [notes, setNotes] = useState('')
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(null)

  // Generate next 10 business days on load
  useEffect(() => {
    const list = []
    let curr = new Date()
    // Start from tomorrow
    curr.setDate(curr.getDate() + 1)
    
    while (list.length < 10) {
      const day = curr.getDay()
      if (day !== 0 && day !== 6) { // Skip weekends
        const yyyy = curr.getFullYear()
        const mm = String(curr.getMonth() + 1).padStart(2, '0')
        const dd = String(curr.getDate()).padStart(2, '0')
        list.push({
          dateStr: `${yyyy}-${mm}-${dd}`,
          displayDay: curr.toLocaleDateString(undefined, { weekday: 'short' }),
          displayMonth: curr.toLocaleDateString(undefined, { month: 'short' }),
          displayDate: curr.getDate(),
        })
      }
      curr.setDate(curr.getDate() + 1)
    }
    setDates(list)
    if (list.length > 0) {
      setSelectedDate(list[0].dateStr)
    }
  }, [])

  // Fetch host details
  useEffect(() => {
    const fetchHost = async () => {
      setLoadingHost(true)
      try {
        const details = await getHostDetails(userId)
        setHost(details)
      } catch (err) {
        setHostError('The booking page you are looking for is invalid or the host is unavailable.')
      } finally {
        setLoadingHost(false)
      }
    }
    if (userId) {
      fetchHost()
    }
  }, [userId])

  // Fetch availability when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!userId || !selectedDate) return
      setLoadingSlots(true)
      setSelectedSlot('')
      try {
        const available = await getAvailability(userId, selectedDate)
        setSlots(available)
      } catch (err) {
        toast.error('Failed to load available times')
      } finally {
        setLoadingSlots(false)
      }
    }
    fetchSlots()
  }, [userId, selectedDate])

  const handleBook = async (e) => {
    e.preventDefault()
    if (!selectedDate || !selectedSlot) {
      toast.error('Please select a date and time slot first')
      return
    }
    if (!name || !email || !subject) {
      toast.error('Please fill in all required fields')
      return
    }

    setBookingInProgress(true)
    try {
      const res = await bookMeeting({
        user_id: userId,
        name,
        email,
        phone: phone || undefined,
        company: company || undefined,
        date: selectedDate,
        slot: selectedSlot,
        subject,
        notes: notes || undefined,
      })
      setBookingSuccess({
        date: selectedDate,
        slot: selectedSlot,
      })
      toast.success('Meeting booked successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to book meeting')
    } finally {
      setBookingInProgress(false)
    }
  }

  const formatSlotTime = (timeStr) => {
    const [h, m] = timeStr.split(':')
    const hr = parseInt(h)
    const ampm = hr >= 12 ? 'PM' : 'AM'
    const displayHr = hr % 12 || 12
    return `${displayHr}:${m} ${ampm}`
  }

  const formatSuccessDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (loadingHost) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 font-bold">Loading schedule page...</p>
        </div>
      </div>
    )
  }

  if (hostError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Link Invalid</h2>
          <p className="text-sm text-gray-500">{hostError}</p>
        </div>
      </div>
    )
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl max-w-md w-full text-center space-y-6">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="h-10 w-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Meeting Confirmed!</h2>
            <p className="text-sm text-gray-500">
              Your calendar invitation and details have been registered.
            </p>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3 text-left">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-bold text-gray-800">
                {formatSuccessDate(bookingSuccess.date)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-bold text-gray-800">
                {formatSlotTime(bookingSuccess.slot)} (30 min)
              </span>
            </div>
            <div className="flex items-center gap-3 border-t border-gray-100 pt-3 mt-3">
              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-black text-gray-600">
                {host.full_name[0]}
              </div>
              <div className="text-xs">
                <p className="font-bold text-gray-800">Host: {host.full_name}</p>
                <p className="text-gray-400">{host.email}</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase">
            Powered by CoreCRM Scheduler
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl max-w-4xl w-full grid grid-cols-1 md:grid-cols-5 overflow-hidden">
        {/* Left Column: Host Details */}
        <div className="md:col-span-2 bg-indigo-900 text-white p-8 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img
                src={host.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(host.full_name)}&background=ffffff&color=4f46e5`}
                alt={host.full_name}
                className="h-16 w-16 rounded-2xl object-cover border-2 border-indigo-400 shadow-lg"
              />
              <div>
                <h3 className="font-black text-lg leading-tight">{host.full_name}</h3>
                <p className="text-xs text-indigo-200">Sales Representative</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-indigo-800">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-indigo-300" />
                <span className="text-sm font-semibold text-indigo-100">30 Min Discovery Meeting</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-indigo-300 mt-0.5" />
                <span className="text-sm text-indigo-200 leading-relaxed">
                  Select a slot on the calendar. An invitation with joining details will be generated.
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">
            CoreCRM — AI-Powered Scheduling
          </div>
        </div>

        {/* Right Column: Date & Slot & Form */}
        <div className="md:col-span-3 p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Select Date & Time</h2>

          {/* Date Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {dates.map((d) => (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDate(d.dateStr)}
                className={`flex flex-col items-center justify-center px-4 py-3 rounded-2xl transition-all duration-200 min-w-[70px] ${
                  selectedDate === d.dateStr
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-[10px] uppercase font-black tracking-wide opacity-80">{d.displayDay}</span>
                <span className="text-lg font-black">{d.displayDate}</span>
                <span className="text-[10px] font-bold">{d.displayMonth}</span>
              </button>
            ))}
          </div>

          {/* Time Slot Selector */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Available Slots</h4>
            {loadingSlots ? (
              <div className="py-6 text-center text-sm text-gray-400">Loading open slots...</div>
            ) : slots.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                No slots available on this day. Please select another date.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedSlot === slot
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {formatSlotTime(slot)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Booking Details Form */}
          {selectedSlot && (
            <form onSubmit={handleBook} className="space-y-4 pt-4 border-t border-gray-100 animate-fadeIn">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Details</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="Email Address *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <input
                  type="text"
                  required
                  placeholder="Meeting Topic *"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-bold text-gray-800"
                />
              </div>

              <div className="space-y-1">
                <textarea
                  placeholder="Any notes or topics to prepare?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={bookingInProgress}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-lg shadow-indigo-100 transition-all"
              >
                {bookingInProgress ? 'Booking Meeting...' : 'Confirm Meeting Booking'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
