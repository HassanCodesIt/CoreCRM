import { useState, useEffect, useRef } from 'react'
import { X, Phone, Mail, Calendar, CheckCircle, FileText, Check, Search } from 'lucide-react'
import { contactsApi } from '../../api/contacts'

const ACTIVITY_TYPES = ['call', 'meeting', 'email', 'task']

export default function ActivityModal({ isOpen, onClose, onSave, activity = null, entityType = '', entityId = '' }) {
  const [formData, setFormData] = useState({
    entity_type: activity?.entity_type || entityType,
    entity_id: activity?.entity_id || entityId,
    activity_type: activity?.activity_type || 'call',
    subject: activity?.subject || '',
    body: activity?.body || '',
    due_date: activity?.due_date || '',
    is_completed: activity?.is_completed || false,
    contact_id: activity?.contact_id || (entityType === 'contact' ? entityId : ''),
  })
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contacts, setContacts] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    // If opening for a specific contact
    if (entityType === 'contact' && entityId) {
      contactsApi.getById(entityId).then(res => {
        setSelectedContact(res.data)
        setFormData(p => ({
          ...p,
          entity_type: 'contact',
          entity_id: entityId,
          contact_id: entityId
        }))
      }).catch(err => console.error(err))
    } else if (activity?.contact_id || (activity?.entity_type === 'contact' && activity?.entity_id)) {
      const cId = activity.contact_id || activity.entity_id
      contactsApi.getById(cId).then(res => {
        setSelectedContact(res.data)
      }).catch(err => console.error(err))
    } else {
      setSelectedContact(null)
      setSearchQuery('')
      setFormData({
        entity_type: entityType,
        entity_id: entityId,
        activity_type: 'call',
        subject: '',
        body: '',
        due_date: '',
        is_completed: false,
        contact_id: entityType === 'contact' ? entityId : '',
      })
    }
  }, [isOpen, entityType, entityId, activity])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setContacts([])
      return
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await contactsApi.getAll({ search: searchQuery, limit: 10 })
        setContacts(res.data?.items || res.data?.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.contact_id) {
      alert("Please select a contact.")
      return
    }
    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white"><Calendar className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{activity ? 'Edit Activity' : 'New Activity'}</h2>
              <p className="text-xs text-gray-500">{activity ? 'Update activity information' : 'Log a new activity'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
          <div className="grid grid-cols-2 gap-4">
            
            {selectedContact ? (
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact *</label>
                <div className="flex items-center justify-between p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-sm">
                      {selectedContact.first_name?.[0]}{selectedContact.last_name?.[0]}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{selectedContact.first_name} {selectedContact.last_name}</span>
                  </div>
                  {(!entityId || entityType !== 'contact') && (
                    <button 
                      type="button" 
                      onClick={() => { 
                        setSelectedContact(null)
                        setSearchQuery('')
                        setFormData(p => ({ ...p, entity_id: '', entity_type: '', contact_id: '' })) 
                      }} 
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="col-span-2 relative" ref={dropdownRef}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact * (Search & Select)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" 
                    placeholder="Search contact by name..." 
                  />
                </div>
                {showDropdown && (searchQuery.trim() !== '' || searching) && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                    {searching ? (
                      <div className="p-3 text-xs text-gray-400 text-center font-medium animate-pulse">Searching...</div>
                    ) : contacts.length === 0 ? (
                      <div className="p-3 text-xs text-gray-400 text-center font-medium">No matching contacts found</div>
                    ) : (
                      contacts.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedContact(c)
                            setShowDropdown(false)
                            setFormData(p => ({
                              ...p,
                              entity_type: 'contact',
                              entity_id: c.id,
                              contact_id: c.id
                            }))
                          }}
                          className="w-full text-left p-2.5 hover:bg-indigo-50 rounded-xl flex items-center gap-2 transition-colors"
                        >
                          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-black">
                            {c.first_name?.[0]}{c.last_name?.[0]}
                          </div>
                          <span className="text-xs font-bold text-gray-800">{c.first_name} {c.last_name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Subject *</label>
              <input type="text" required value={formData.subject} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="Follow-up call with prospect" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Activity Type *</label>
              <select value={formData.activity_type} onChange={e => setFormData(p => ({ ...p, activity_type: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer">
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="datetime-local" value={formData.due_date} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea value={formData.body} onChange={e => setFormData(p => ({ ...p, body: e.target.value }))} rows={4} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium resize-none" placeholder="Activity details and notes..." />
              </div>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_completed} onChange={e => setFormData(p => ({ ...p, is_completed: e.target.checked }))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                <span className="text-sm font-medium text-gray-700">Mark as completed</span>
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : activity ? 'Update Activity' : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
