import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, MoreHorizontal, MessageSquare, AlertCircle, Clock, CheckCircle2, Download } from 'lucide-react'
import { ticketsApi } from '../api/tickets'
import { exportToCSV } from '../utils/exportCSV'
import DataTable from '../components/shared/DataTable'
import TicketModal from '../components/tickets/TicketModal'
import toast from 'react-hot-toast'

export default function Tickets() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const limit = 10

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit,
        status: status || undefined,
        priority: priority || undefined,
      }
        const response = await ticketsApi.getAll(params)
        setData(response.data?.items || response.data?.data || [])
        setTotal(response.data?.total || 0)
    } catch (error) {
      toast.error('Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [page, status, priority])

  const handleSaveTicket = async (formData) => {
    try {
      if (selectedTicket) {
        await ticketsApi.update(selectedTicket.id, formData)
        toast.success('Ticket updated')
      } else {
        await ticketsApi.create(formData)
        toast.success('Ticket created')
      }
      setTicketModalOpen(false)
      setSelectedTicket(null)
      fetchTickets()
    } catch (error) {
      toast.error('Failed to save ticket')
    }
  }

  const columns = [
    {
      key: 'ticket_number',
      label: 'ID',
      render: (val) => <span className="font-mono text-[10px] font-bold text-gray-400">{val}</span>
    },
    {
      key: 'subject',
      label: 'Subject',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 line-clamp-1">{val}</span>
          <span className="text-[10px] text-gray-400 font-medium uppercase">{row.category || 'Support'}</span>
        </div>
      ),
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => (
        <div className="flex items-center gap-1.5">
          {val === 'open' && <AlertCircle className="h-3 w-3 text-blue-500" />}
          {val === 'pending' && <Clock className="h-3 w-3 text-amber-500" />}
          {val === 'resolved' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
            val === 'open' ? 'text-blue-600 bg-blue-50' :
            val === 'pending' ? 'text-amber-600 bg-amber-50' :
            val === 'resolved' ? 'text-emerald-600 bg-emerald-50' :
            'text-gray-600 bg-gray-50'
          }`}>
            {val}
          </span>
        </div>
      )
    },
    { 
      key: 'priority', 
      label: 'Priority',
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
          val === 'high' ? 'text-rose-600 bg-rose-50' :
          val === 'medium' ? 'text-amber-600 bg-amber-50' :
          'text-emerald-600 bg-emerald-50'
        }`}>
          {val}
        </span>
      )
    },
    { 
      key: 'created_at', 
      label: 'Created',
      render: (val) => new Date(val).toLocaleDateString()
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
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
             <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Support Tickets</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage customer inquiries and technical issues.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => exportToCSV(data, 'tickets', ['ticket_number', 'subject', 'description', 'status', 'priority', 'assigned_to', 'created_at'])} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => { setSelectedTicket(null); setTicketModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="h-4 w-4" />
            Create Ticket
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search tickets by subject..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-[11px] font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer text-gray-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
          <select 
            className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-[11px] font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer text-gray-500"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
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
        onRowClick={(row) => navigate(`/tickets/${row.id}`)}
      />

      <TicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        onSave={handleSaveTicket}
        ticket={selectedTicket}
      />
    </div>
  )
}
