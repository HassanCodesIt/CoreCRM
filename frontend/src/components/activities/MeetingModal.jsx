import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, Tag, AlertCircle, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { contactsApi } from '../../api/contacts'
import { leadsApi } from '../../api/leads'
import { accountsApi } from '../../api/accounts'
import { dealsApi } from '../../api/deals'
import { activitiesApi } from '../../api/activities'
import toast from 'react-hot-toast'

const MEETING_TYPES = [
  { value: 'discovery', label: 'Discovery Call', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'demo', label: 'Product Demo', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'follow_up', label: 'Follow-up Call', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'internal', label: 'Internal Meeting', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'success', label: 'Customer Success', color: 'bg-rose-50 text-rose-700 border-rose-200' }
]

const MEETING_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const REMINDER_OPTIONS = [
  { value: 0, label: 'No Reminder' },
  { value: 15, label: '15 Minutes Before' },
  { value: 30, label: '30 Minutes Before' },
  { value: 60, label: '1 Hour Before' },
  { value: 1440, label: '1 Day Before' }
]

export default function MeetingModal({
  isOpen,
  onClose,
  onSave,
  meeting = null,
  initialData = null,
  onDelete = null
}) {
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    due_date: '',
    duration_minutes: 30,
    location: '',
    meeting_type: 'discovery',
    meeting_status: 'scheduled',
    meeting_outcome: '',
    reminder_trigger_minutes: 0,
    is_completed: false,
    entity_type: 'contact',
    entity_id: '',
    contact_id: '',
    lead_id: '',
    account_id: '',
    deal_id: ''
  })

  const [contacts, setContacts] = useState([])
  const [leads, setLeads] = useState([])
  const [accounts, setAccounts] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(false)

  // Load select options
  useEffect(() => {
    if (!isOpen) return
    
    const fetchRelations = async () => {
      try {
        const [cRes, lRes, aRes, dRes] = await Promise.all([
          contactsApi.getAll({ limit: 100 }),
          leadsApi.getAll({ limit: 100 }),
          accountsApi.getAll({ limit: 100 }),
          dealsApi.getAll({ limit: 100 })
        ])
        setContacts(cRes.data?.items || cRes.data?.data || [])
        setLeads(lRes.data?.items || lRes.data?.data || [])
        setAccounts(aRes.data?.items || aRes.data?.data || [])
        setDeals(dRes.data?.items || dRes.data?.data || [])
      } catch (err) {
        console.error('Failed to fetch relations', err)
      }
    }
    
    fetchRelations()
  }, [isOpen])

  // Populate form data
  useEffect(() => {
    if (meeting) {
      // Format date for datetime-local input
      let formattedDate = ''
      if (meeting.due_date) {
        const d = new Date(meeting.due_date)
        const pad = (num) => String(num).padStart(2, '0')
        formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      }

      setFormData({
        subject: meeting.subject || '',
        body: meeting.body || '',
        due_date: formattedDate,
        duration_minutes: meeting.duration_minutes || 30,
        location: meeting.location || '',
        meeting_type: meeting.meeting_type || 'discovery',
        meeting_status: meeting.meeting_status || (meeting.is_completed ? 'completed' : 'scheduled'),
        meeting_outcome: meeting.meeting_outcome || '',
        reminder_trigger_minutes: meeting.reminder_trigger_minutes || 0,
        is_completed: meeting.is_completed || false,
        entity_type: meeting.entity_type || 'contact',
        entity_id: meeting.entity_id || '',
        contact_id: meeting.contact_id || '',
        lead_id: meeting.lead_id || '',
        account_id: meeting.account_id || '',
        deal_id: meeting.deal_id || ''
      })
    } else if (initialData) {
      let formattedDate = ''
      if (initialData.due_date) {
        const d = new Date(initialData.due_date)
        const pad = (num) => String(num).padStart(2, '0')
        formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      }
      setFormData(prev => ({
        ...prev,
        ...initialData,
        due_date: formattedDate || prev.due_date
      }))
    } else {
      setFormData({
        subject: '',
        body: '',
        due_date: '',
        duration_minutes: 30,
        location: '',
        meeting_type: 'discovery',
        meeting_status: 'scheduled',
        meeting_outcome: '',
        reminder_trigger_minutes: 0,
        is_completed: false,
        entity_type: 'contact',
        entity_id: '',
        contact_id: '',
        lead_id: '',
        account_id: '',
        deal_id: ''
      })
    }
  }, [meeting, initialData, isOpen])

  if (!isOpen) return null

  const handleRelationChange = (type, val) => {
    setFormData(prev => {
      const update = { ...prev }
      update[`${type}_id`] = val
      
      // Auto-set primary entity relation
      if (val) {
        update.entity_type = type
        update.entity_id = val
      }
      return update
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.subject.trim()) {
      toast.error('Subject is required')
      return
    }
    if (!formData.due_date) {
      toast.error('Start time is required')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        activity_type: 'meeting',
        // Sync is_completed with meeting_status
        is_completed: formData.meeting_status === 'completed',
        contact_id: formData.contact_id || null,
        lead_id: formData.lead_id || null,
        account_id: formData.account_id || null,
        deal_id: formData.deal_id || null,
        entity_id: formData.entity_id || 'general',
        entity_type: formData.entity_type || 'general'
      }
      if (payload.is_completed && !payload.completed_at) {
        payload.completed_at = new Date().toISOString()
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      toast.error('Failed to save meeting')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkStatus = async (status) => {
    setFormData(prev => ({
      ...prev,
      meeting_status: status,
      is_completed: status === 'completed'
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{meeting ? 'Edit Meeting Details' : 'Schedule Meeting'}</h2>
              <p className="text-xs text-gray-500">{meeting ? 'Update scheduling and outcome details' : 'Configure calendar slots and CRM relations'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meeting Title *</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium"
                placeholder="Product Demo & Architecture Q&A"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meeting Type *</label>
              <select
                value={formData.meeting_type}
                onChange={e => setFormData(p => ({ ...p, meeting_type: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-semibold appearance-none cursor-pointer"
              >
                {MEETING_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status *</label>
              <select
                value={formData.meeting_status}
                onChange={e => setFormData(p => ({ ...p, meeting_status: e.target.value, is_completed: e.target.value === 'completed' }))}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-semibold appearance-none cursor-pointer"
              >
                {MEETING_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Start Time *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="datetime-local"
                  required
                  value={formData.due_date}
                  onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Duration (Minutes)</label>
              <select
                value={formData.duration_minutes}
                onChange={e => setFormData(p => ({ ...p, duration_minutes: parseInt(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={90}>1.5 Hours</option>
                <option value={120}>2 Hours</option>
              </select>
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Location / Meeting Link</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium"
                  placeholder="Google Meet Link, Phone, or Physical Address"
                />
              </div>
            </div>

            {/* Reminders */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reminders</label>
              <select
                value={formData.reminder_trigger_minutes}
                onChange={e => setFormData(p => ({ ...p, reminder_trigger_minutes: parseInt(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer"
              >
                {REMINDER_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Empty space for grid alignment */}
            <div></div>

            {/* Divider */}
            <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">CRM Entity Relationships</h4>
            </div>

            {/* Contact */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Linked Contact</label>
              <select
                value={formData.contact_id}
                onChange={e => handleRelationChange('contact', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer"
              >
                <option value="">-- None --</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>

            {/* Lead */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Linked Lead</label>
              <select
                value={formData.lead_id}
                onChange={e => handleRelationChange('lead', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer"
              >
                <option value="">-- None --</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                ))}
              </select>
            </div>

            {/* Account */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Linked Account</label>
              <select
                value={formData.account_id}
                onChange={e => handleRelationChange('account', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer"
              >
                <option value="">-- None --</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Deal */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Linked Deal</label>
              <select
                value={formData.deal_id}
                onChange={e => handleRelationChange('deal', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer"
              >
                <option value="">-- None --</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>

            {/* Notes / Description */}
            <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meeting Agenda / Notes</label>
              <textarea
                value={formData.body}
                onChange={e => setFormData(p => ({ ...p, body: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium resize-none"
                placeholder="Key talking points, agendas, or questions from customer..."
              />
            </div>

            {/* Meeting Outcomes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meeting Outcome & Next Steps</label>
              <textarea
                value={formData.meeting_outcome}
                onChange={e => setFormData(p => ({ ...p, meeting_outcome: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium resize-none"
                placeholder="What was decided? Next tasks logged?"
              />
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <div>
              {meeting && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(meeting.id)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {loading ? 'Saving...' : meeting ? 'Save Meeting' : 'Schedule Meeting'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
