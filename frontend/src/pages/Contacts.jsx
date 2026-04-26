import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Download, MoreHorizontal, X, Phone, MessageSquare, Upload } from 'lucide-react'
import { contactsApi } from '../api/contacts'
import DataTable from '../components/shared/DataTable'
import CSVImportModal from '../components/contacts/CSVImportModal'
import toast from 'react-hot-toast'

const SOURCES = ['Web', 'Referral', 'Inbound Call', 'Social Media', 'Trade Show', 'Other']

export default function Contacts() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [selectedSources, setSelectedSources] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [isImportModalOpen, setImportModalOpen] = useState(false)
  const limit = 10

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit,
        search: search || undefined,
        stage: stage || undefined,
        source: selectedSources.length > 0 ? selectedSources.join(',') : undefined
      }
      const response = await contactsApi.getAll(params)
      setData(response.data.data)
      setTotal(response.data.total)
    } catch (error) {
      toast.error('Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts()
    }, 300)
    return () => clearTimeout(timer)
  }, [page, search, stage, selectedSources])

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(data.map(item => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleBulkUpdate = async (action, value) => {
    try {
      await contactsApi.bulkUpdate({ ids: selectedIds, action, value })
      toast.success('Bulk update successful')
      setSelectedIds([])
      fetchContacts()
    } catch (error) {
      toast.error('Bulk update failed')
    }
  }

  const toggleSource = (source) => {
    setSelectedSources(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    )
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs">
            {row.first_name?.[0]}{row.last_name?.[0]}
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.first_name} {row.last_name}</div>
            <div className="text-xs text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'job_title', label: 'Job Title' },
    { 
      key: 'contact_stage', 
      label: 'Stage',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          val === 'lead' ? 'bg-blue-50 text-blue-700' :
          val === 'qualified' ? 'bg-green-50 text-green-700' :
          val === 'customer' ? 'bg-purple-50 text-purple-700' :
          'bg-gray-50 text-gray-700'
        }`}>
          {val}
        </span>
      )
    },
    { key: 'lead_source', label: 'Source' },
    { 
      key: 'lead_score', 
      label: 'Score',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-12 bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full" style={{ width: `${val}%` }} />
          </div>
          <span className="text-xs font-medium text-gray-600">{val}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Phone className="h-4 w-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            <MessageSquare className="h-4 w-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Contacts</h1>
          <p className="text-gray-500 mt-1">Manage your relationships and sales pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 p-1 bg-indigo-50 rounded-xl border border-indigo-100 mr-2">
              <span className="text-xs font-bold text-indigo-700 px-2">{selectedIds.length} Selected</span>
              <select 
                className="text-xs font-bold bg-white border-none rounded-lg py-1 px-2 focus:ring-0 cursor-pointer"
                onChange={(e) => handleBulkUpdate('change_status', e.target.value)}
                value=""
              >
                <option value="" disabled>Change Status</option>
                <option value="lead">Lead</option>
                <option value="qualified">Qualified</option>
                <option value="customer">Customer</option>
              </select>
              <button 
                onClick={() => handleBulkUpdate('delete', true)}
                className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          )}
          <button 
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name, email..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <select 
              className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              <option value="">All Stages</option>
              <option value="lead">Lead</option>
              <option value="qualified">Qualified</option>
              <option value="customer">Customer</option>
            </select>
            <button className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Source Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pt-1.5 mr-2">Lead Source:</span>
          {SOURCES.map(source => (
            <button
              key={source}
              onClick={() => toggleSource(source)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedSources.includes(source) 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {source}
            </button>
          ))}
          {selectedSources.length > 0 && (
            <button 
              onClick={() => setSelectedSources([])}
              className="px-2 py-1 text-gray-400 hover:text-rose-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
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
        onRowClick={(row) => navigate(`/contacts/${row.id}`)}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
      />

      <CSVImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setImportModalOpen(false)} 
        onImportSuccess={fetchContacts} 
      />
    </div>
  )
}
