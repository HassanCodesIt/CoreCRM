import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Users, 
  Briefcase, 
  Calendar, 
  Activity as ActivityIcon,
  Plus, 
  MoreVertical,
  ChevronLeft,
  ExternalLink,
  DollarSign,
  TrendingUp,
  PieChart,
  CheckCircle
} from 'lucide-react'
import { accountsApi } from '../api/accounts'
import { contactsApi } from '../api/contacts'
import { dealsApi } from '../api/deals'
import { activitiesApi } from '../api/activities'
import TimelineList from '../components/shared/TimelineList'
import AccountModal from '../components/accounts/AccountModal'
import ContactModal from '../components/contacts/ContactModal'
import DealModal from '../components/deals/DealModal'
import MeetingModal from '../components/activities/MeetingModal'
import toast from 'react-hot-toast'

export default function AccountDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [account, setAccount] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('timeline')
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isLinkContactModalOpen, setIsLinkContactModalOpen] = useState(false)
  const [allContacts, setAllContacts] = useState([])
  const [selectedContactToLink, setSelectedContactToLink] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)

  const fetchAccount = async () => {
    try {
      const [response, timelineResponse, contactsResponse, dealsResponse, activitiesResponse] = await Promise.all([
        accountsApi.getById(id),
        accountsApi.getTimeline(id),
        accountsApi.getContacts(id),
        accountsApi.getDeals(id),
        activitiesApi.getAll({ entity_type: 'account', entity_id: id }),
      ])
      setAccount(response.data)
      setTimeline(timelineResponse.data || [])
      setContacts(contactsResponse.data?.items || contactsResponse.data?.data || [])
      setDeals(dealsResponse.data?.items || dealsResponse.data?.data || [])
      setActivities(activitiesResponse.data?.items || activitiesResponse.data?.data || [])
    } catch (error) {
      toast.error('Failed to load account')
      navigate('/accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccount()
  }, [id])

  const handleSaveAccount = async (formData) => {
    try {
      await accountsApi.update(id, formData)
      toast.success('Account updated successfully')
      setIsAccountModalOpen(false)
      fetchAccount()
    } catch (error) {
      toast.error('Failed to update account')
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete this account?')) return
    try {
      await accountsApi.delete(id)
      toast.success('Account deleted successfully')
      navigate('/accounts')
    } catch {
      toast.error('Failed to delete account')
    }
  }

  const handleSaveDeal = async (formData) => {
    try {
      await dealsApi.create({ ...formData, account_id: id })
      toast.success('Deal created successfully')
      setIsDealModalOpen(false)
      fetchAccount()
    } catch (error) {
      toast.error('Failed to create deal')
    }
  }

  const handleSaveContact = async (formData) => {
    try {
      if (selectedContact && selectedContact.id) {
        await contactsApi.update(selectedContact.id, formData)
        toast.success('Contact updated successfully')
      } else {
        await contactsApi.create({ ...formData, account_id: id, company_name: account.name })
        toast.success('Contact created successfully')
      }
      setIsContactModalOpen(false)
      setSelectedContact(null)
      fetchAccount()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save contact')
    }
  }

  const handleOpenLinkModal = async () => {
    try {
      const response = await contactsApi.getAll({ limit: 1000 })
      setAllContacts(response.data?.items || response.data?.data || [])
      setIsLinkContactModalOpen(true)
    } catch {
      toast.error('Failed to load contacts')
    }
  }

  const handleLinkContact = async () => {
    if (!selectedContactToLink) return
    try {
      await contactsApi.update(selectedContactToLink, { 
        account_id: id,
        company_name: account.name 
      })
      toast.success('Contact linked successfully')
      setIsLinkContactModalOpen(false)
      setSelectedContactToLink('')
      fetchAccount()
    } catch {
      toast.error('Failed to link contact')
    }
  }

  const getEngagementDetails = () => {
    const activityCount = timeline.filter(item => item.type === 'activity').length
    let percentage = 0
    let label = 'Cold'
    let text = ''

    if (activityCount === 0) {
      percentage = 15
      label = 'Cold'
      text = `No recent interactions. Interaction frequency is 40% lower than average for similar accounts in ${account?.industry || 'this industry'}.`
    } else if (activityCount === 1) {
      percentage = 35
      label = 'Weak'
      text = `Only 1 interaction. Interaction frequency is 20% lower than average for similar accounts in ${account?.industry || 'this industry'}.`
    } else if (activityCount === 2) {
      percentage = 60
      label = 'Medium'
      text = `2 interactions. Interaction frequency is matching the average for similar accounts in ${account?.industry || 'this industry'}.`
    } else if (activityCount === 3) {
      percentage = 80
      label = 'Good'
      text = `3 interactions. Interaction frequency is 15% higher than average for similar accounts in ${account?.industry || 'this industry'}.`
    } else {
      percentage = 95
      label = 'Strong'
      text = `${activityCount} interactions. Interaction frequency is 35% higher than average for similar accounts in ${account?.industry || 'this industry'}.`
    }

    return { percentage, label, text }
  }
  
  const engagement = account ? getEngagementDetails() : { percentage: 0, label: 'Cold', text: '' }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  if (!account) return null

  const tabs = [
    { id: 'timeline', name: 'Timeline', icon: ActivityIcon },
    { id: 'contacts', name: 'Contacts', icon: Users },
    { id: 'deals', name: 'Deals', icon: Briefcase },
    { id: 'activities', name: 'Activities', icon: Calendar },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link to="/accounts" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Accounts
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700 shadow-inner">
              <Building2 className="h-10 w-10" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  {account.name}
                </h1>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  account.account_type === 'customer' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                  'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {account.account_type || 'Account'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a href={account.website} target="_blank" rel="noreferrer" className="hover:text-indigo-600 font-medium">{account.website}</a>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {account.location || 'No Location'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setIsAccountModalOpen(true)} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm shadow-sm">
              Edit Account
            </button>
            <button onClick={() => setIsMeetingModalOpen(true)} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm shadow-sm">
              Add Activity
            </button>
            <button onClick={() => setIsDealModalOpen(true)} className="px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-100">
              New Deal
            </button>
            <button onClick={handleDeleteAccount} className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-rose-600 hover:bg-rose-50 shadow-sm transition-all" title="Delete Account">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50">
              <h2 className="font-bold text-gray-900 uppercase tracking-tighter text-xs">Account Details</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Industry</p>
                  <p className="text-sm font-medium text-gray-900">{account.industry}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Size</p>
                  <p className="text-sm font-medium text-gray-900">{account.employees_count || 'N/A'}+ Employees</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Annual Revenue</p>
                  <p className="text-sm font-medium text-gray-900">{account.annual_revenue ? `$${(account.annual_revenue / 1000000).toFixed(1)}M` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Account Health</h3>
               <PieChart className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                     <span className="text-gray-500 uppercase">Engagement</span>
                     <span className="text-indigo-600">{engagement.label}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${engagement.percentage}%` }} />
                  </div>
               </div>
               <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                  {engagement.text}
               </p>
            </div>
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
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <TimelineList items={timeline} emptyLabel="No timeline yet" />
              </div>
            )}
            {activeTab === 'contacts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Account Contacts ({contacts.length})</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleOpenLinkModal} className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-all flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      Link Existing
                    </button>
                    <button onClick={() => { setSelectedContact({ account_id: id, company_name: account.name }); setIsContactModalOpen(true) }} className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Create Contact
                    </button>
                  </div>
                </div>

                {contacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center">
                            {contact.first_name?.[0]}{contact.last_name?.[0]}
                          </div>
                          <div>
                            <Link to={`/contacts/${contact.id}`} className="font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                              {contact.first_name} {contact.last_name}
                            </Link>
                            <p className="text-xs text-gray-400 font-medium">{contact.job_title || 'No Title'}</p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 font-medium">
                              {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
                              {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => { setSelectedContact(contact); setIsContactModalOpen(true) }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                     <div className="h-16 w-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                        <Users className="h-6 w-6 text-orange-300" />
                     </div>
                     <h3 className="font-bold text-gray-900">Manage Account Contacts</h3>
                     <p className="text-sm text-gray-500 max-w-xs mt-1">Add and manage the people you work with at {account.name}.</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'deals' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Account Deals ({deals.length})</h3>
                  <button onClick={() => setIsDealModalOpen(true)} className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    New Deal
                  </button>
                </div>

                {deals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deals.map((deal) => (
                      <Link key={deal.id} to={`/deals/${deal.id}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all block">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-900 hover:text-indigo-600 transition-colors">{deal.title}</p>
                            <p className="text-xs text-gray-400 font-semibold mt-1">Stage: <span className="text-gray-600 uppercase text-[10px] bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{deal.stage || 'Prospecting'}</span></p>
                          </div>
                          <span className="text-sm font-black text-indigo-600">${parseFloat(deal.value || 0).toLocaleString()}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center">
                    <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                       <Briefcase className="h-6 w-6 text-gray-300" />
                    </div>
                    <h3 className="font-bold text-gray-900">No deals yet</h3>
                    <p className="text-sm text-gray-500 max-w-xs mt-1">Start tracking deals for this account to improve visibility.</p>
                    <button onClick={() => setIsDealModalOpen(true)} className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100">
                      <Plus className="h-3 w-3" />
                      Add Deal
                    </button>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'activities' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Account Activities ({activities.length})</h3>
                  <button onClick={() => setIsMeetingModalOpen(true)} className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Log Activity
                  </button>
                </div>

                {activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                            activity.activity_type === 'call' ? 'bg-blue-50 text-blue-600' :
                            activity.activity_type === 'meeting' ? 'bg-purple-50 text-purple-600' :
                            activity.activity_type === 'email' ? 'bg-amber-50 text-amber-600' :
                            'bg-indigo-50 text-indigo-600'
                          }`}>
                            {activity.activity_type === 'call' && <Phone className="h-4 w-4" />}
                            {activity.activity_type === 'meeting' && <Calendar className="h-4 w-4" />}
                            {activity.activity_type === 'email' && <Mail className="h-4 w-4" />}
                            {activity.activity_type === 'task' && <CheckCircle className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className={`font-bold text-gray-900 ${activity.is_completed ? 'line-through text-gray-400 opacity-60' : ''}`}>{activity.subject}</p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 font-medium">
                              <span>Due: {new Date(activity.due_date).toLocaleDateString()}</span>
                              {activity.assigned_to_name && <span>• Assigned: {activity.assigned_to_name}</span>}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => { if(!activity.is_completed) { activitiesApi.complete(activity.id).then(() => { toast.success('Activity completed'); fetchAccount() }) } }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activity.is_completed 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
                              : 'bg-white border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-400 hover:text-indigo-600'
                          }`}
                        >
                          {activity.is_completed ? 'Completed' : 'Upcoming'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center">
                    <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                       <Calendar className="h-6 w-6 text-gray-300" />
                    </div>
                    <h3 className="font-bold text-gray-900">No activities yet</h3>
                    <p className="text-sm text-gray-500 max-w-xs mt-1">Start tracking activities for this account to improve visibility.</p>
                    <button onClick={() => setIsMeetingModalOpen(true)} className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100">
                      <Plus className="h-3 w-3" />
                      Log Activity
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={handleSaveAccount}
        account={account}
      />
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => { setIsContactModalOpen(false); setSelectedContact(null) }}
        onSave={handleSaveContact}
        contact={selectedContact}
      />
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSave={handleSaveDeal}
        deal={{ account_id: id }}
      />
      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        initialData={{
          account_id: account.id,
          entity_type: 'account',
          entity_id: account.id,
          subject: `Meeting with ${account.name}`,
          assigned_to: account.owner_id || '',
        }}
        onSave={async (data) => {
          await activitiesApi.create(data)
          toast.success('Activity added successfully')
          fetchAccount()
        }}
      />

      {isLinkContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsLinkContactModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Link Existing Contact</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Contact</label>
                <select 
                  value={selectedContactToLink} 
                  onChange={(e) => setSelectedContactToLink(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium cursor-pointer"
                >
                  <option value="">Choose a contact...</option>
                  {allContacts
                    .filter(c => c.account_id !== id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.email || 'No email'})
                      </option>
                    ))
                  }
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsLinkContactModalOpen(false)} 
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleLinkContact}
                  disabled={!selectedContactToLink}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Link Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
