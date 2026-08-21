import { useState, useEffect } from 'react'
import { dashboardApi } from '../api/dashboard'
import { reportsApi } from '../api/reports'
import LeaderboardWidget from '../components/dashboard/LeaderboardWidget'
import toast from 'react-hot-toast'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { FileText, Download, Filter, Calendar, ChevronDown } from 'lucide-react'
import { exportToCSV } from '../utils/exportCSV'

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [topReps, setTopReps] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [exportEntity, setExportEntity] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [repsRes, metricsRes] = await Promise.all([
          dashboardApi.getTopReps(),
          reportsApi.getMetrics()
        ])
        setTopReps(repsRes.data?.items || repsRes.data || [])
        setMetrics(metricsRes.data)
      } catch (error) {
        toast.error('Failed to load reports data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleExport = async () => {
    if (!exportEntity) return toast.error('Select an entity to export')
    if (exportEntity === 'top_reps') {
      if (topReps.length === 0) return toast.error('No top reps data to export')
      const exportData = topReps.map(rep => ({
        ...rep,
        conversion_rate: rep.deal_count > 0 ? ((rep.won_count / rep.deal_count) * 100).toFixed(1) + '%' : '0%'
      }))
      exportToCSV(exportData, 'top_reps_report', ['full_name', 'deal_count', 'total_value', 'won_count', 'conversion_rate'])
      return
    }

    setExporting(true)
    try {
      const res = await reportsApi.exportEntity(exportEntity)
      if (res.data && res.data.length > 0) {
        exportToCSV(res.data, `${exportEntity}_export`, Object.keys(res.data[0]))
      } else {
        toast.error(`No data found for ${exportEntity}`)
      }
    } catch (error) {
      toast.error(`Failed to export ${exportEntity}`)
    } finally {
      setExporting(false)
    }
  }

  const revenueData = [
    { month: 'Jan', revenue: 45000, targets: 40000 },
    { month: 'Feb', revenue: 52000, targets: 45000 },
    { month: 'Mar', revenue: 48000, targets: 50000 },
    { month: 'Apr', revenue: 61000, targets: 55000 },
    { month: 'May', revenue: 55000, targets: 58000 },
    { month: 'Jun', revenue: 67000, targets: 60000 },
  ]

  const leadSources = metrics?.lead_sources || []
  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
             <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics & Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">Deep dive into your business performance.</p>
          </div>
        </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
               <Calendar className="h-4 w-4" />
               Last 6 Months
            </button>
            <div className="relative group">
              <select 
                className="pl-4 pr-10 py-2 bg-indigo-600 text-white font-bold rounded-xl appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                value={exportEntity}
                onChange={(e) => setExportEntity(e.target.value)}
                disabled={exporting}
              >
                <option value="" disabled>Export Data</option>
                <option value="contacts">Export Contacts</option>
                <option value="leads">Export Leads</option>
                <option value="deals">Export Deals</option>
                <option value="tickets">Export Tickets</option>
                <option value="top_reps">Export Top Reps</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white pointer-events-none" />
            </div>
            <button 
              onClick={handleExport}
              disabled={exporting || !exportEntity}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
               <Download className="h-4 w-4" />
               {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
      </div>

      <div className="w-full">
         <LeaderboardWidget reps={topReps} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Main Revenue Chart */}
         <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-8 tracking-tight">Revenue vs Target</h3>
            <div className="h-[400px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                     <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                     />
                     <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                     <Bar dataKey="targets" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Distribution */}
         <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-8 tracking-tight">Lead Source Distribution</h3>
            <div className="flex-1 min-h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={leadSources}
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                     >
                        {leadSources.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="space-y-4 mt-8">
               {leadSources.map((source, i) => (
                  <div key={i} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{source.name}</span>
                     </div>
                     <span className="text-sm font-black text-gray-900">{source.value}</span>
                  </div>
               ))}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {/* Micro Stats */}
         {[
            { label: 'Avg. Deal Size', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(metrics?.avg_deal_size || 0), color: '#6366f1' },
            { label: 'Win Rate', value: `${(metrics?.win_rate || 0).toFixed(1)}%`, color: '#10b981' },
            { label: 'Avg. Sales Cycle', value: `${(metrics?.sales_cycle_days || 0).toFixed(1)} Days`, color: '#f59e0b' }
         ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 h-full w-1 transition-all duration-300 group-hover:w-2" style={{ backgroundColor: stat.color }} />
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
               <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</h3>
            </div>
         ))}
      </div>
    </div>
  )
}
