import { useState, useEffect } from 'react'
import { Plus, Search, Megaphone, Target, Users, TrendingUp, MoreHorizontal, Calendar, ArrowRight, Trash2, Edit3, Filter, Download } from 'lucide-react'
import { campaignsApi } from '../api/campaigns'
import { exportToCSV } from '../utils/exportCSV'
import DataTable from '../components/shared/DataTable'
import CampaignModal from '../components/campaigns/CampaignModal'
import toast from 'react-hot-toast'

export default function Campaigns() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const limit = 10

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
        const response = await campaignsApi.getAll({ page, limit, search, status: statusFilter || undefined })
        setData(response.data?.items || response.data?.data || [])
        setTotal(response.data?.total || 0)
    } catch (error) {
      toast.error('Failed to fetch campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns()
    }, 300)
    return () => clearTimeout(timer)
  }, [page, search, statusFilter])

  const handleSave = async (formData) => {
    try {
      if (selectedCampaign) {
        await campaignsApi.update(selectedCampaign.id, formData)
        toast.success('Campaign updated')
      } else {
        await campaignsApi.create(formData)
        toast.success('Campaign created')
      }
      setIsModalOpen(false)
      fetchCampaigns()
    } catch (error) {
      toast.error('Failed to save campaign')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    try {
      await campaignsApi.delete(id)
      toast.success('Campaign deleted')
      fetchCampaigns()
    } catch (error) {
      toast.error('Delete failed')
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Campaign Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm flex-shrink-0">
             <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-gray-900 block truncate max-w-[200px]">{val}</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{row.type}</span>
          </div>
        </div>
      ),
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
          val === 'active' ? 'text-emerald-600 bg-emerald-50' :
          val === 'planning' ? 'text-blue-600 bg-blue-50' :
          val === 'draft' ? 'text-gray-400 bg-gray-50 border border-gray-100' :
          'text-gray-600 bg-gray-50'
        }`}>
          {val}
        </span>
      )
    },
    { 
      key: 'budget', 
      label: 'Budget',
      render: (val) => (
        <span className="font-mono text-xs font-bold text-gray-700">
           ${val?.toLocaleString() || '0'}
        </span>
      )
    },
    {
      key: 'start_date',
      label: 'Ends On',
      render: (_, row) => (
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
           <Calendar className="h-3.5 w-3.5" />
           {row.end_date ? new Date(row.end_date).toLocaleDateString() : 'No end date'}
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
           <button 
             onClick={() => { setSelectedCampaign(row); setIsModalOpen(true); }}
             className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
           >
              <Edit3 className="h-4 w-4" />
           </button>
           <button 
             onClick={() => handleDelete(row.id)}
             className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
           >
              <Trash2 className="h-4 w-4" />
           </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
             <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Campaign Management</h1>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">Track marketing ROI and lead generation efforts.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => exportToCSV(data, 'campaigns', ['name', 'type', 'status', 'budget', 'start_date', 'end_date', 'leads_count', 'converted_count', 'created_at'])} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button 
            onClick={() => { setSelectedCampaign(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
               <TrendingUp className="h-6 w-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Budget</p>
               <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                  ${data.reduce((acc, curr) => acc + (curr.status === 'active' ? curr.budget : 0), 0).toLocaleString()}
               </h3>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
               <Users className="h-6 w-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campaigns</p>
               <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{total}</h3>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
               <Megaphone className="h-6 w-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Now</p>
               <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{data.filter(d => d.status === 'active').length}</h3>
            </div>
         </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search campaigns by name..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer font-bold text-gray-600"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <button className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={data}
        loading={loading}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
      />

      <CampaignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        campaign={selectedCampaign}
      />
    </div>
  )
}
