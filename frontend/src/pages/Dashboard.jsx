import { useState, useEffect } from 'react'
import { 
  Users, 
  Briefcase, 
  MessageSquare, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Calendar,
  DollarSign,
  UserPlus,
  Mail,
  CheckCircle,
  Phone,
  Sparkles
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { dashboardApi } from '../api/dashboard'
import RecentLeadsPanel from '../components/dashboard/RecentLeadsPanel'
import FunnelChart from '../components/dashboard/FunnelChart'
import LeaderboardWidget from '../components/dashboard/LeaderboardWidget'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [pipelineData, setPipelineData] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [dealsSoon, setDealsSoon] = useState([])
  const [ticketStats, setTicketStats] = useState(null)
  const [recentLeads, setRecentLeads] = useState([])
  const [funnelData, setFunnelData] = useState([])
  const [topReps, setTopReps] = useState([])
  const [aiInsight, setAiInsight] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [sumRes, pipeRes, actRes, dealRes, tickRes, leadsRes, funnelRes, repsRes, aiInsightRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getPipeline(),
        dashboardApi.getActivities(),
        dashboardApi.getDealsClosingSoon(),
        dashboardApi.getTickets(),
        dashboardApi.getRecentLeads(),
        dashboardApi.getFunnel(),
        dashboardApi.getTopReps(),
        dashboardApi.getAIInsight()
      ])
      setSummary(sumRes.data)
      setPipelineData(Object.entries(pipeRes.data).map(([name, data]) => ({ 
        name: name.replace('_', ' '), 
        value: data.count 
      })))
      setRecentActivities(actRes.data)
      setDealsSoon(dealRes.data)
      setTicketStats(tickRes.data)
      setRecentLeads(leadsRes.data)
      setFunnelData(funnelRes.data)
      setTopReps(repsRes.data)
      setAiInsight(aiInsightRes.data.insight)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']

  const stats = [
    { 
      label: 'All-Time Revenue', 
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(summary?.total_revenue || 0), 
      icon: DollarSign, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      trend: `$${(summary?.revenue_this_month / 1000 || 0).toFixed(1)}k this month`,
      trendUp: true
    },
    { 
      label: 'Active Deals', 
      value: summary?.total_deals || 0, 
      icon: Briefcase, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50',
      trend: '+3.2%',
      trendUp: true
    },
    { 
      label: 'New Contacts', 
      value: summary?.total_contacts || 0, 
      icon: Users, 
      color: 'text-violet-600', 
      bg: 'bg-violet-50',
      trend: '+18.4%',
      trendUp: true
    },
    { 
      label: 'Leads This Month', 
      value: summary?.leads_this_month || 0, 
      icon: UserPlus, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50',
      trend: 'New',
      trendUp: true
    },
    { 
      label: 'Conversion Rate', 
      value: `${summary?.conversion_rate || 0}%`, 
      icon: TrendingUp, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      trend: 'Opt',
      trendUp: true
    },
    { 
      label: 'Open Tickets', 
      value: ticketStats?.by_status?.open || 0, 
      icon: MessageSquare, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50',
      trend: '-2.5%',
      trendUp: false
    },
  ]

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Growth Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Real-time performance metrics and sales intelligence.</p>
      </div>

      {/* AI Insight Banner */}
      {aiInsight && (
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 p-[1px] rounded-[2rem] shadow-lg shadow-indigo-100 animate-gradient-x">
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-[1.95rem] flex items-center gap-6">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-indigo-200 shadow-lg shrink-0">
              <Sparkles className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-indigo-600 tracking-widest uppercase bg-indigo-50 px-2 py-0.5 rounded-full">AI Sales Intelligence</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Active Insight</span>
              </div>
              <p className="text-gray-800 font-bold tracking-tight text-lg italic">
                "{aiInsight}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} shadow-inner group-hover:scale-110 transition-transform`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black ${stat.trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.trend}
              </div>
            </div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1 tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Pipeline Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="text-lg font-bold text-gray-900 tracking-tight">Sales Pipeline</h3>
               <p className="text-xs text-gray-500 font-medium">Deal distribution by stage</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl">
               <TrendingUp className="h-3 w-3 text-emerald-500" />
               <span className="text-[10px] font-black text-emerald-600 uppercase">On Track</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pipelineData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900, color: '#1e293b' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6366f1" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorVal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Support Overview */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-6">Support Distribution</h3>
           <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                       data={[
                          { name: 'Open', value: ticketStats?.open_count || 1 },
                          { name: 'Pending', value: ticketStats?.pending || 1 },
                          { name: 'Resolved', value: ticketStats?.resolved || 1 },
                       ]}
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value"
                    >
                       {COLORS.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                    </Pie>
                    <Tooltip />
                 </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                 <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-gray-600">Avg. Resolution</span>
                 </div>
                 <span className="text-xs font-black text-gray-900">{ticketStats?.avg_resolution_hours || 0}h</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-rose-50 rounded-2xl">
                 <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold text-rose-600">SLA Breaches</span>
                 </div>
                 <span className="text-xs font-black text-rose-700">{ticketStats?.sla_breach_count || 0}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Funnel Chart - Full Width */}
      <div className="w-full">
         <FunnelChart data={funnelData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Leads - Spans 2 columns */}
        <div className="lg:col-span-2">
           <RecentLeadsPanel leads={recentLeads} />
        </div>
        
        {/* Leaderboard - Spans 1 column */}
        <div>
           <LeaderboardWidget reps={topReps} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Recent Interactions</h3>
              <button className="text-[10px] font-black text-indigo-600 uppercase hover:underline underline-offset-4">View All</button>
           </div>
           <div className="space-y-6">
              {recentActivities.slice(0, 5).map((activity, i) => (
                 <div key={i} className="flex items-start gap-4 group">
                    <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                       {activity.activity_type === 'call' && <Phone className="h-4 w-4 text-blue-500" />}
                       {activity.activity_type === 'meeting' && <Calendar className="h-4 w-4 text-purple-500" />}
                       {activity.activity_type === 'email' && <Mail className="h-4 w-4 text-amber-500" />}
                       {activity.activity_type === 'task' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-black text-indigo-600">
                             {activity.creator_name?.charAt(0)}
                          </div>
                          <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{activity.subject}</p>
                       </div>
                       <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-tight">
                          {activity.creator_name} • {new Date(activity.created_at).toLocaleDateString()}
                       </p>
                    </div>
                    {activity.is_completed && <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                 </div>
              ))}
              {recentActivities.length === 0 && <p className="text-center text-gray-400 text-xs py-8">No recent activities found.</p>}
           </div>
        </div>

        {/* Deals Closing Soon */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Deals Closing Soon</h3>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
           </div>
           <div className="space-y-4">
              {dealsSoon.slice(0, 5).map((deal, i) => (
                 <div key={i} className="p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-colors cursor-pointer border border-transparent hover:border-indigo-100 group">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{deal.title}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{deal.account_name || 'Individual'}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-gray-900">${(deal.value / 1000).toFixed(1)}k</p>
                          <p className="text-[10px] font-black text-emerald-500 uppercase mt-1">{deal.probability}% Prob.</p>
                       </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          Closes {new Date(deal.close_date).toLocaleDateString()}
                       </div>
                       <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${deal.probability}%` }} />
                       </div>
                    </div>
                 </div>
              ))}
              {dealsSoon.length === 0 && <p className="text-center text-gray-400 text-xs py-8">No high-probability deals closing soon.</p>}
           </div>
        </div>
      </div>
    </div>
  )
}
