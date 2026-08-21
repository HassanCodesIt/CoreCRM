import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Linkedin, 
  Calendar, 
  Clock, 
  Plus, 
  MoreVertical,
  ChevronLeft,
  Trophy,
  Activity as ActivityIcon,
  MessageSquare,
  FileText,
  Paperclip
} from 'lucide-react'
import { contactsApi } from '../api/contacts'
import { useContact, useContactTimeline, useContactNotes, useAddContactNote } from '../hooks/useContacts'
import CustomFields from '../components/contacts/CustomFields'
import AttachmentTab from '../components/shared/AttachmentTab'
import AIEmailGenerator from '../components/leads/AIEmailGenerator'
import MeetingModal from '../components/activities/MeetingModal'
import ActivityModal from '../components/activities/ActivityModal'
import ContactModal from '../components/contacts/ContactModal'
import { activitiesApi } from '../api/activities'
import toast from 'react-hot-toast'

export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('timeline')
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  
  // Note states
  const [noteContent, setNoteContent] = useState('')
  const [notePinned, setNotePinned] = useState(false)
  
  const contactQuery = useContact(id)
  const timelineQuery = useContactTimeline(id)
  const notesQuery = useContactNotes(id)
  const addNoteMutation = useAddContactNote(id)

  const handleNoteSubmit = async (e) => {
    e.preventDefault()
    if (!noteContent.trim()) return
    try {
      await addNoteMutation.mutateAsync({
        content: noteContent,
        is_pinned: notePinned
      })
      setNoteContent('')
      setNotePinned(false)
      toast.success('Note added successfully')
    } catch (error) {
      toast.error('Failed to add note')
    }
  }
  const dealsQuery = useQuery({
    queryKey: ['contacts', id, 'deals'],
    queryFn: async () => {
      const response = await contactsApi.getDeals(id)
      return response.data?.items || []
    },
    enabled: Boolean(id),
  })
  const ticketsQuery = useQuery({
    queryKey: ['contacts', id, 'tickets'],
    queryFn: async () => {
      const response = await contactsApi.getTickets(id)
      return response.data?.items || []
    },
    enabled: Boolean(id),
  })

  const handleSaveContact = async (formData) => {
    try {
      await contactsApi.update(id, formData)
      toast.success('Contact updated successfully')
      setIsContactModalOpen(false)
      contactQuery.refetch()
    } catch {
      toast.error('Failed to update contact')
    }
  }

  const handleDeleteContact = async () => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return
    try {
      await contactsApi.delete(id)
      toast.success('Contact deleted successfully')
      navigate('/contacts')
    } catch {
      toast.error('Failed to delete contact')
    }
  }

  useEffect(() => {
    if (contactQuery.isError) {
      toast.error('Failed to load contact')
      navigate('/contacts')
    }
  }, [contactQuery.isError, navigate])

  if (contactQuery.isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  const contact = contactQuery.data
  if (!contact) return null

  const tabs = [
    { id: 'timeline', name: 'Timeline', icon: ActivityIcon },
    { id: 'deals', name: 'Deals', icon: Trophy },
    { id: 'tickets', name: 'Tickets', icon: MessageSquare },
    { id: 'notes', name: 'Notes', icon: FileText },
    { id: 'attachments', name: 'Attachments', icon: Paperclip },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link to="/contacts" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Contacts
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
        <div className="h-20 w-20 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl shadow-inner">
          {contact.first_name?.[0] || ''}{contact.last_name?.[0] || ''}
        </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  {contact.first_name} {contact.last_name}
                </h1>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  contact.contact_stage === 'lead' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' :
                  contact.contact_stage === 'qualified' ? 'bg-green-50 text-green-700 shadow-sm border border-green-100' :
                  contact.contact_stage === 'customer' ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100' :
                  'bg-gray-50 text-gray-700 border border-gray-100'
                }`}>
                  {contact.contact_stage}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {contact.account_name || 'No Account'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Last contacted 2 days ago
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMeetingModalOpen(true)} className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-100 transition-all text-sm shadow-sm">
              Schedule Meeting
            </button>
            <button onClick={() => setIsContactModalOpen(true)} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm shadow-sm">
              Edit Profile
            </button>
            <button onClick={() => setIsActivityModalOpen(true)} className="px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-100">
              New Activity
            </button>
            <button onClick={handleDeleteContact} className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-rose-600 hover:bg-rose-50 shadow-sm transition-all" title="Delete Contact">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 uppercase tracking-tighter text-xs">Contact Information</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                  <p className="text-sm font-medium text-gray-900">{contact.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{contact.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Linkedin className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">LinkedIn</p>
                  <a href={contact.linkedin_url || '#'} className="text-sm font-medium text-indigo-600 hover:underline">{contact.linkedin_url ? 'View Profile' : 'N/A'}</a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Location</p>
                  <p className="text-sm font-medium text-gray-900">{contact.location || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <CustomFields contactId={id} />

          <AIEmailGenerator recipientId={id} recipientType="contact" />

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-200">Lead Health</h3>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-4xl font-extrabold tracking-tighter">{contact.lead_score}%</span>
              <span className="text-xs text-indigo-200 mb-1 font-medium">Likely to close</span>
            </div>
            <div className="mt-4 w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${contact.lead_score}%` }} />
            </div>
            <p className="mt-4 text-xs text-indigo-100/80 leading-relaxed font-medium">
              Based on email sentiment and 12 recent interactions across multiple channels.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-tight rounded-2xl transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                {tab.name}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'timeline' && (
              <div className="space-y-6 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                  <div>
                    <h3 className="font-bold text-gray-900 uppercase tracking-tighter text-xs">Activity History</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{timelineQuery.data?.length || 0} total items</p>
                  </div>
                  <button 
                    onClick={() => setIsActivityModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-100 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Log Activity
                  </button>
                </div>
                
                {timelineQuery.isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => <div key={item} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)}
                  </div>
                ) : (timelineQuery.data || []).length > 0 ? (
                  <div className="relative pl-8 space-y-8">
                    <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
                    {(timelineQuery.data || []).map((item, index) => {
                      const iconClass = item.type === 'deal' ? 'bg-purple-100 text-purple-600' : item.type === 'ticket' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                      const title = item.data?.subject || item.data?.title || item.data?.activity_type || item.type
                      const description = item.data?.body || item.data?.status || item.data?.priority || ''
                      return (
                        <div key={`${item.type}-${item.data?.id || index}`} className="relative">
                          <div className={`absolute -left-8 top-0 h-7 w-7 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${iconClass}`}>
                            <ActivityIcon className="h-3 w-3" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">{new Date(item.timestamp).toLocaleString()}</p>
                            <h4 className="text-sm font-bold text-gray-900">{title}</h4>
                            {description && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                    No timeline items yet.
                  </div>
                )}
              </div>
            )}
            {activeTab === 'attachments' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <AttachmentTab referenceType="contact" referenceId={id} />
              </div>
            )}
            {activeTab === 'deals' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                {(dealsQuery.data || []).map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{deal.title}</p>
                      <p className="text-xs text-gray-500">{deal.status}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{deal.value ? `$${deal.value}` : '-'}</span>
                  </div>
                ))}
                {!dealsQuery.isLoading && (dealsQuery.data || []).length === 0 && <p className="text-sm text-gray-500">No deals yet.</p>}
              </div>
            )}
            {activeTab === 'tickets' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                {(ticketsQuery.data || []).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{ticket.subject}</p>
                      <p className="text-xs text-gray-500">{ticket.priority}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-gray-50 text-xs font-bold text-gray-600">{ticket.status}</span>
                  </div>
                ))}
                {!ticketsQuery.isLoading && (ticketsQuery.data || []).length === 0 && <p className="text-sm text-gray-500">No tickets yet.</p>}
              </div>
            )}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                {/* Note Creation Form */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-tighter">Add Note</h3>
                  <form onSubmit={handleNoteSubmit} className="space-y-3">
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Write a note about this contact..."
                      className="w-full min-h-[100px] p-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium text-gray-800 placeholder-gray-400 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notePinned}
                          onChange={(e) => setNotePinned(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        Pin this note to top
                      </label>
                      <button
                        type="submit"
                        disabled={addNoteMutation.isPending || !noteContent.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Save Note
                      </button>
                    </div>
                  </form>
                </div>

                {/* Notes List */}
                <div className="space-y-4">
                  {notesQuery.isLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-24 bg-gray-50 rounded-3xl animate-pulse" />
                      ))}
                    </div>
                  ) : (notesQuery.data || []).length > 0 ? (
                    <div className="space-y-4">
                      {(notesQuery.data || []).map((note) => (
                        <div
                          key={note.id}
                          className={`bg-white p-6 rounded-3xl border shadow-sm transition-all duration-300 relative group ${
                            note.is_pinned 
                              ? 'border-indigo-100 bg-gradient-to-r from-indigo-50/30 to-transparent' 
                              : 'border-gray-50'
                          }`}
                        >
                          {note.is_pinned && (
                            <div className="absolute top-6 right-6 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              Pinned
                            </div>
                          )}
                          <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                  {new Date(note.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">
                                {note.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
                      <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 text-gray-300">
                        <FileText className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">No notes added yet</h3>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">Use the form above to save important details about this contact.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        initialData={{
          contact_id: contact.id,
          entity_type: 'contact',
          entity_id: contact.id,
          subject: `Meeting with ${contact.first_name} ${contact.last_name}`,
          assigned_to: contact.owner_id || ''
        }}
        onSave={async (data) => {
          await activitiesApi.create(data)
          toast.success('Meeting scheduled successfully')
          timelineQuery.refetch()
        }}
      />
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        entityType="contact"
        entityId={contact.id}
        onSave={async (data) => {
          await activitiesApi.create(data)
          toast.success('Activity logged successfully')
          setIsActivityModalOpen(false)
          timelineQuery.refetch()
        }}
      />
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSave={handleSaveContact}
        contact={contact}
      />
    </div>
  )
}
