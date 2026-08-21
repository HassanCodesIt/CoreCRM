import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Building2, Mail, Phone, Calendar, TrendingUp, Sparkles, ArrowRightLeft, Clock, Activity as ActivityIcon, Plus, Edit3, Check, X } from 'lucide-react'
import { leadsApi } from '../api/leads'
import { activitiesApi } from '../api/activities'
import MeetingModal from '../components/activities/MeetingModal'
import AICard from '../components/leads/AICard'
import AIEmailGenerator from '../components/leads/AIEmailGenerator'
import AIInsights from '../components/leads/AIInsights'
import toast from 'react-hot-toast'
import { useLeadSLA } from '../hooks/useLeads'
import { useAuthStore } from '../store/authStore'

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)

  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [scoreEvents, setScoreEvents] = useState([])
  const [summary, setSummary] = useState('')
  const [qualification, setQualification] = useState(null)
  const [insights, setInsights] = useState(null)
  const [slaDue, setSlaDue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState({ summary: false, qualify: false, insights: false })
  const { data: sla, isLoading: slaLoading } = useLeadSLA(id)
  const [now, setNow] = useState(Date.now())
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)

  const [isCustomScoreModalOpen, setIsCustomScoreModalOpen] = useState(false)
  const [customScoreAction, setCustomScoreAction] = useState('')
  const [customScoreDelta, setCustomScoreDelta] = useState(10)

  const [isEditingScore, setIsEditingScore] = useState(false)
  const [editedScore, setEditedScore] = useState(0)

  useEffect(() => {
    if (!sla) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [sla])

  const fetchLead = async () => {
    try {
      const results = await Promise.allSettled([
        leadsApi.getById(id),
        leadsApi.getActivities(id),
        leadsApi.getScoreEvents(id),
      ])
      const [leadRes, actsRes, scoresRes] = results
      if (leadRes.status === 'fulfilled') setLead(leadRes.value.data)
      else { toast.error('Failed to load lead'); navigate('/leads'); return }
      if (actsRes.status === 'fulfilled') setActivities(actsRes.value.data || [])
      if (scoresRes.status === 'fulfilled') setScoreEvents(scoresRes.value.data || [])
      // SLA data fetch per-lead
    } catch {
      toast.error('Failed to load lead')
      navigate('/leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLead()
  }, [id])

  

  const generateSummary = async () => {
    setAiLoading(p => ({ ...p, summary: true }))
    try {
      const res = await leadsApi.getAISummary(id)
      setSummary(res.data.summary)
    } catch {
      toast.error('AI summary failed')
    } finally {
      setAiLoading(p => ({ ...p, summary: false }))
    }
  }

  const runQualification = async () => {
    setAiLoading(p => ({ ...p, qualify: true }))
    try {
      const res = await leadsApi.qualifyLead(id)
      setQualification(res.data)
    } catch {
      toast.error('AI qualification failed')
    } finally {
      setAiLoading(p => ({ ...p, qualify: false }))
    }
  }

  const loadInsights = async () => {
    setAiLoading(p => ({ ...p, insights: true }))
    try {
      const res = await leadsApi.getInsights(id)
      setInsights(res.data)
    } catch {
      toast.error('AI insights failed')
    } finally {
      setAiLoading(p => ({ ...p, insights: false }))
    }
  }

  const applyScore = async (action) => {
    try {
      await leadsApi.updateScore(id, action)
      toast.success('Lead score updated')
      await fetchLead()
    } catch {
      toast.error('Failed to update score')
    }
  }

  const handleCustomScoreSubmit = async () => {
    if (!customScoreAction.trim()) {
      toast.error('Action name is required')
      return
    }
    try {
      await leadsApi.updateScore(id, customScoreAction.trim(), customScoreDelta)
      toast.success('Custom score event added')
      setIsCustomScoreModalOpen(false)
      setCustomScoreAction('')
      setCustomScoreDelta(10)
      await fetchLead()
    } catch {
      toast.error('Failed to add custom score')
    }
  }

  const handleSaveTotalScore = async () => {
    try {
      await leadsApi.update(id, { score: editedScore })
      toast.success('Total score updated')
      setIsEditingScore(false)
      await fetchLead()
    } catch {
      toast.error('Failed to update total score')
    }
  }

  const convertLead = async () => {
    try {
      const res = await leadsApi.convert(id, { create_contact: true, create_account: true, create_deal: true })
      toast.success(res.data.message || 'Lead converted successfully')
      await fetchLead()
    } catch {
      toast.error('Lead conversion failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!lead) return null

  // SLA countdown is rendered in the SLA card using current time

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/leads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Leads
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMeetingModalOpen(true)} className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all">
            Schedule Meeting
          </button>
          <button onClick={convertLead} disabled={lead.status === 'converted'} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            Convert Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{lead.company_name || lead.company || 'No company'}</span>
                  <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{lead.email || 'No email'}</span>
                  <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{lead.phone || 'No phone'}</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700">{lead.status}</span>
              {slaDue && (() => {
                const remaining = Math.max(0, Math.floor((slaDue - Date.now()) / 1000));
                const h = Math.floor(remaining / 3600);
                const m = Math.floor((remaining % 3600) / 60);
                const s = remaining % 60;
                const color = remaining > 0 ? 'text-green-600' : 'text-red-600'
                return <span className={`ml-2 text-xs font-semibold ${color}`}>{remaining > 0 ? `SLA ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : 'SLA breached'}</span>
              })()}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-indigo-50 rounded-xl p-3 relative group">
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Score</div>
                {isEditingScore ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input type="number" className="w-16 px-1.5 py-0.5 text-sm font-black bg-white border border-indigo-300 rounded text-indigo-700 focus:outline-none" value={editedScore} onChange={e => setEditedScore(parseInt(e.target.value) || 0)} />
                    <button onClick={handleSaveTotalScore} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"><Check className="h-3 w-3" /></button>
                    <button onClick={() => setIsEditingScore(false)} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-black text-indigo-700">{lead.score}</div>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <button onClick={() => { setIsEditingScore(true); setEditedScore(lead.score) }} className="p-1 opacity-0 group-hover:opacity-100 text-indigo-500 hover:bg-indigo-100 rounded transition-all"><Edit3 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Source</div>
                <div className="text-sm font-bold text-emerald-700">{lead.source || 'N/A'}</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <div className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Owner</div>
                <div className="text-sm font-bold text-amber-700">{lead.owner_name || 'Unassigned'}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => applyScore('email_opened')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50">+10 Opened Email</button>
              <button onClick={() => applyScore('link_clicked')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50">+20 Clicked Link</button>
              <button onClick={() => applyScore('demo_requested')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50">+50 Requested Demo</button>
              <button onClick={() => applyScore('inactive')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50">-10 Inactive</button>
              <button onClick={() => setIsCustomScoreModalOpen(true)} className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Custom Score</button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Activity Timeline</h2>
            <div className="relative pl-7 space-y-5">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
              {activities.length === 0 ? (
                <div className="text-sm text-gray-500">No activity yet.</div>
              ) : activities.map(item => (
                <div key={item.id} className="relative">
                  <div className="absolute -left-7 top-0 h-6 w-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                    <ActivityIcon className="h-3 w-3 text-indigo-600" />
                  </div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{new Date(item.created_at).toLocaleString()}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{item.subject}</p>
                  <p className="text-sm text-gray-600">{item.content || ''}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Score Events</h2>
            <div className="space-y-2">
              {scoreEvents.length === 0 ? (
                <div className="text-sm text-gray-500">No score events yet.</div>
              ) : scoreEvents.map(evt => (
                <div key={evt.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{evt.action}</div>
                    <div className="text-xs text-gray-500">{new Date(evt.created_at).toLocaleString()}</div>
                  </div>
                  <div className={`text-sm font-black ${evt.score_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {evt.score_delta >= 0 ? '+' : ''}{evt.score_delta}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <AICard title="AI Lead Summary" loading={aiLoading.summary} onRefresh={generateSummary}>
            {summary || 'Click refresh to generate lead summary from notes and interactions.'}
          </AICard>

          <AICard title="AI Qualification Assistant" loading={aiLoading.qualify} onRefresh={runQualification}>
            {qualification ? (
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-indigo-600">{qualification.qualification}</div>
                <div className="text-sm text-gray-700">{qualification.reasoning}</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  {(qualification.score_factors || []).map((f, idx) => <li key={idx}>- {f}</li>)}
                </ul>
              </div>
            ) : 'Click refresh to classify this lead as Hot, Warm, or Cold.'}
          </AICard>

          <AICard title="AI Insights" loading={aiLoading.insights} onRefresh={loadInsights}>
            {insights ? <AIInsights insights={insights} /> : 'Click refresh to predict conversion probability and best outreach strategy.'}
          </AICard>

      <AIEmailGenerator recipientId={id} recipientType="lead" />
      {sla && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">SLA</span>
          {typeof now === 'number' && (
            <span className={`text-sm font-semibold ${sla?.status === 'breached' ? 'text-red-600' : 'text-green-600'}`}>
              {(() => {
                const due = new Date(sla.response_due_at).getTime()
                const diff = due - now
                if (diff <= 0) return 'Breached'
                const sec = Math.floor(diff / 1000)
                const h = Math.floor(sec / 3600)
                const m = Math.floor((sec % 3600) / 60)
                const s = sec % 60
                return `Due in ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              })()}
            </span>
          )}
        </div>
      )}
        </div>
      </div>
      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        initialData={{
          lead_id: lead.id,
          entity_type: 'lead',
          entity_id: lead.id,
          subject: `Meeting with ${lead.name}`,
          assigned_to: lead.owner_id || ''
        }}
        onSave={async (data) => {
          await activitiesApi.create(data)
          toast.success('Meeting scheduled successfully')
          fetchLead()
        }}
      />
      {isCustomScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCustomScoreModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Custom Score Event</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Action Name</label>
                <input type="text" placeholder="e.g. Attended Webinar" className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" value={customScoreAction} onChange={e => setCustomScoreAction(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Points Delta (+ or -)</label>
                <input type="number" placeholder="e.g. 15 or -10" className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" value={customScoreDelta} onChange={e => setCustomScoreDelta(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setIsCustomScoreModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100">Cancel</button>
              <button onClick={handleCustomScoreSubmit} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">Add Score</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
