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
  Plus, 
  MoreVertical,
  ChevronLeft,
  ExternalLink,
  DollarSign,
  TrendingUp,
  PieChart
} from 'lucide-react'
import { accountsApi } from '../api/accounts'
import toast from 'react-hot-toast'

export default function AccountDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('contacts')

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await accountsApi.getById(id)
        setAccount(response.data)
      } catch (error) {
        toast.error('Failed to load account')
        navigate('/accounts')
      } finally {
        setLoading(false)
      }
    }
    fetchAccount()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  if (!account) return null

  const tabs = [
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
            <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm shadow-sm">
              Edit Account
            </button>
            <button className="px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-100">
              New Deal
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
                     <span className="text-indigo-600">Strong</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-indigo-500 h-full" style={{ width: '85%' }} />
                  </div>
               </div>
               <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                  Interaction frequency is 24% higher than average for similar accounts in {account.industry}.
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
            {activeTab === 'contacts' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                 <div className="h-16 w-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-orange-300" />
                 </div>
                 <h3 className="font-bold text-gray-900">Manage Account Contacts</h3>
                 <p className="text-sm text-gray-500 max-w-xs mt-1">Add and manage the people you work with at {account.name}.</p>
              </div>
            )}
            {activeTab !== 'contacts' && (
              <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center">
                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                   <Briefcase className="h-6 w-6 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900">No {activeTab} yet</h3>
                <p className="text-sm text-gray-500 max-w-xs mt-1">Start tracking {activeTab} for this account to improve visibility.</p>
                <button className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100">
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
