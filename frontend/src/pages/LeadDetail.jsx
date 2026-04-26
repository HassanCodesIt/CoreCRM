import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Building2, Mail, Phone, Calendar, TrendingUp, Sparkles, ArrowRightLeft, Clock, Activity as ActivityIcon } from 'lucide-react'
import { leadsApi } from '../api/leads'
import AICard from '../components/leads/AICard'
import AIEmailGenerator from '../components/leads/AIEmailGenerator'
import AIInsights from '../components/leads/AIInsights'
import toast from 'react-hot-toast'

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [scoreEvents, setScoreEvents] = useState([])
  const [summary, setSummary] = useState('')
  const [qualification, setQualification] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState({ summary: false, qualify: false, insights: false })

  const fetchLead = async () => {
    try {
      const [leadRes, actsRes, scoresRes] = await Promise.all([
        leadsApi.getById(id),
        leadsApi.getActivities(id),
        leadsApi.getScoreEvents(id),
      ])
      setLead(leadRes.data)
      setActivities(actsRes.data || [])
      setScoreEvents(scoresRes.data || [])
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/leads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Leads
        </Link>
        <button onClick={convertLead} disabled={lead.status === 'converted'} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
          Convert Lead
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{lead.company || 'No company'}</span>
                  <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{lead.email || 'No email'}</span>
                  <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{lead.phone || 'No phone'}</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700">{lead.status}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-indigo-50 rounded-xl p-3">
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Score</div>
                <div className="text-2xl font-black text-indigo-700">{lead.score}</div>
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

          <AIEmailGenerator leadId={id} />
        </div>
      </div>
    </div>
  )
}
