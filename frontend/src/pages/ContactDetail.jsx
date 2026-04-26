import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
import AttachmentTab from '../components/shared/AttachmentTab'
import toast from 'react-hot-toast'

export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('timeline')

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const response = await contactsApi.getById(id)
        setContact(response.data)
      } catch (error) {
        toast.error('Failed to load contact')
        navigate('/contacts')
      } finally {
        setLoading(false)
      }
    }
    fetchContact()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

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
              {contact.first_name[0]}{contact.last_name[0]}
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
            <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm shadow-sm">
              Edit Profile
            </button>
            <button className="px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-100">
              New Activity
            </button>
            <button className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-gray-600 shadow-sm transition-colors">
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
                  <a href={contact.linkedin_url} className="text-sm font-medium text-indigo-600 hover:underline">View Profile</a>
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900 uppercase tracking-tighter text-xs">Activity History</h3>
                  <button className="text-indigo-600 text-xs font-bold hover:underline">View All</button>
                </div>
                
                <div className="relative pl-8 space-y-10">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
                  
                  <div className="relative">
                    <div className="absolute -left-8 top-0 h-7 w-7 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center shadow-sm">
                      <Mail className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Yesterday at 2:45 PM</p>
                      <h4 className="text-sm font-bold text-gray-900">Prospecting Email Sent</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Sent a follow-up email regarding the enterprise subscription plan. Tracked: Opened 1x.
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-8 top-0 h-7 w-7 rounded-full bg-green-100 border-4 border-white flex items-center justify-center shadow-sm">
                      <Phone className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Mar 12, 2026</p>
                      <h4 className="text-sm font-bold text-gray-900">Discovery Call Completed</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Discussed core pain points. Lead is interested in automated reporting features.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'attachments' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <AttachmentTab referenceType="contact" referenceId={id} />
              </div>
            )}
            {activeTab !== 'timeline' && activeTab !== 'attachments' && (
              <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-12 text-center">
                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                   <ActivityIcon className="h-6 w-6 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900">No {activeTab} yet</h3>
                <p className="text-sm text-gray-500 max-w-xs mt-1">Start by adding a new {activeTab.slice(0, -1)} to track this contact's progress.</p>
                <button className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 hover:scale-105 transition-transform">
                  <Plus className="h-3 w-3" />
                  Add {activeTab.slice(0, -1)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
