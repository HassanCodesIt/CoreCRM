import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Download, MoreHorizontal, Building2, ExternalLink } from 'lucide-react'
import { accountsApi } from '../api/accounts'
import DataTable from '../components/shared/DataTable'
import toast from 'react-hot-toast'

export default function Accounts() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const limit = 10

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit,
        search: search || undefined,
        industry: industry || undefined,
      }
      const response = await accountsApi.getAll(params)
      setData(response.data.data)
      setTotal(response.data.total)
    } catch (error) {
      toast.error('Failed to fetch accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAccounts()
    }, 300)
    return () => clearTimeout(timer)
  }, [page, search, industry])

  const columns = [
    {
      key: 'name',
      label: 'Account Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{val}</div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              {row.website && (
                <a href={row.website} target="_blank" rel="noreferrer" className="hover:text-indigo-600 flex items-center gap-0.5">
                  {new URL(row.website).hostname}
                  <ExternalLink className="h-2 w-2" />
                </a>
              )}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'industry', label: 'Industry' },
    { 
      key: 'account_type', 
      label: 'Type',
      render: (val) => (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
          val === 'customer' ? 'bg-indigo-50 text-indigo-700' :
          val === 'prospect' ? 'bg-amber-50 text-amber-700' :
          'bg-gray-50 text-gray-700'
        }`}>
          {val || 'N/A'}
        </span>
      )
    },
    { key: 'location', label: 'Location' },
    { 
      key: 'annual_revenue', 
      label: 'Revenue',
      render: (val) => val ? `$${(val / 1000000).toFixed(1)}M` : '-'
    },
    {
      key: 'actions',
      label: '',
      render: () => <MoreHorizontal className="h-4 w-4 text-gray-400" />
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Accounts</h1>
          <p className="text-gray-500 mt-1">Manage partner companies and corporate clients.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search accounts by name..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">All Industries</option>
            <option value="Technology">Technology</option>
            <option value="Finance">Finance</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Retail">Retail</option>
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
        onRowClick={(row) => navigate(`/accounts/${row.id}`)}
      />
    </div>
  )
}
