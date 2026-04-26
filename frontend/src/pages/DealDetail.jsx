import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  Briefcase, 
  DollarSign, 
  Target, 
  Calendar, 
  MoreVertical,
  ChevronLeft,
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Activity as ActivityIcon,
  MessageSquare,
  FileText,
  User,
  Paperclip
} from 'lucide-react'
import { dealsApi } from '../api/deals'
import AttachmentTab from '../components/shared/AttachmentTab'
import toast from 'react-hot-toast'

export default function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [deal, setDeal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const response = await dealsApi.getById(id)
        setDeal(response.data)
      } catch (error) {
        toast.error('Failed to load deal')
        navigate('/deals')
      } finally {
        setLoading(false)
      }
    }
    fetchDeal()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  if (!deal) return null

  const STAGE_COLORS = {
    prospecting: 'bg-blue-500',
    qualified: 'bg-indigo-500',
    proposal: 'bg-violet-500',
    negotiation: 'bg-amber-500',
    closed_won: 'bg-emerald-500',
    closed_lost: 'bg-rose-500'
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Target },
    { id: 'timeline', name: 'Timeline', icon: ActivityIcon },
    { id: 'notes', name: 'Notes', icon: FileText },
    { id: 'attachments', name: 'Attachments', icon: Paperclip },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link to="/deals" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" />
          Back to Deals
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className={`absolute top-0 right-0 h-1 w-full ${STAGE_COLORS[deal.stage]}`} />
          
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-700 shadow-inner">
              <Briefcase className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {deal.title}
                </h1>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${STAGE_COLORS[deal.stage]}`}>
                  {deal.stage.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-indigo-600">
                  <DollarSign className="h-4 w-4" />
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currency || 'USD' }).format(deal.value)}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {deal.account_name || 'Individual'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm shadow-sm">
              Update Stage
            </button>
            <button className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-100">
              New Activity
            </button>
            <button className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-gray-600 shadow-sm transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
         <div className="flex items-center justify-between gap-1">
            {Object.keys(STAGE_COLORS).map((stage, i) => {
               const isCurrent = deal.stage === stage;
               const isPast = Object.keys(STAGE_COLORS).indexOf(deal.stage) > i;
               return (
                  <div key={stage} className="flex-1 flex flex-col items-center gap-2">
                     <div className={`h-2 w-full rounded-full transition-all duration-500 ${
                        isCurrent ? STAGE_COLORS[stage] : isPast ? 'bg-indigo-200' : 'bg-gray-100'
                     }`} />
                     <span className={`text-[9px] font-black uppercase tracking-tighter ${
                        isCurrent ? 'text-indigo-600' : 'text-gray-400'
                     }`}>
                        {stage.replace('_', ' ')}
                     </span>
                  </div>
               )
            })}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Tabs & Details */}
        <div className="lg:col-span-8 space-y-6">
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

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 min-h-[400px]">
             {activeTab === 'overview' && (
                <div className="space-y-8">
                   <section>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Description</h3>
                      <p className="text-sm text-gray-600 leading-relaxed font-medium">
                         {deal.description || 'No detailed description provided for this deal.'}
                      </p>
                   </section>

                   <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                      <div>
                         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confidence Level</h3>
                         <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-gray-900">{deal.probability}%</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                               <div className="bg-emerald-500 h-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${deal.probability}%` }} />
                            </div>
                         </div>
                      </div>
                      <div>
                         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Expected Close</h3>
                         <div className="flex items-center gap-2 text-gray-900 font-bold">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                            {new Date(deal.close_date).toLocaleDateString()}
                         </div>
                      </div>
                   </div>
                </div>
             )}
             {activeTab === 'attachments' && (
                <AttachmentTab referenceType="deal" referenceId={id} />
             )}
             {activeTab !== 'overview' && activeTab !== 'attachments' && (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                   <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                      <Target className="h-6 w-6 text-gray-300 text-shadow" />
                   </div>
                   <h3 className="font-bold text-gray-900 text-shadow">No {activeTab} logs yet</h3>
                   <p className="text-sm text-gray-500 max-w-xs mt-1">Start by adding a new {activeTab.slice(0, -1)} to track this deal's momentum.</p>
                </div>
             )}
          </div>
        </div>

        {/* Right Side: Quick Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-200">Weighted Value</h3>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-4xl font-black tracking-tighter shadow-sm">
                 ${((deal.value * deal.probability) / 100 / 1000).toFixed(1)}k
              </span>
              <span className="text-xs text-indigo-200 mb-1 font-bold">Forecasted</span>
            </div>
            <p className="mt-6 text-xs text-indigo-100/80 leading-relaxed font-bold tracking-tight">
               Estimated revenue based on current pipeline stage and historical conversion rates.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
             <h2 className="font-bold text-gray-900 uppercase tracking-tighter text-xs">People Involved</h2>
             
             <div className="space-y-4">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-700 font-black text-xs">
                      {deal.owner_name?.[0] || 'U'}
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Deal Owner</p>
                      <p className="text-sm font-bold text-gray-900">{deal.owner_name || 'System'}</p>
                   </div>
                </div>
                
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-700 font-black text-xs">
                      <Building2 className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Decision Makers</p>
                      <p className="text-sm font-bold text-gray-990">{deal.account_name || 'Individual'}</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
