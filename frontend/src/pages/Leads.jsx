import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, User, TrendingUp, LayoutList, Trello, ChevronRight, Phone, Mail, Building2, Calendar, Tag, MoreHorizontal, Trash2, Edit3, ArrowRight, Sparkles, Download } from 'lucide-react'
import { exportToCSV } from '../utils/exportCSV'
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, defaultDropAnimationSideEffects } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { leadsApi } from '../api/leads'
import DataTable from '../components/shared/DataTable'
import LeadModal from '../components/leads/LeadModal'
import toast from 'react-hot-toast'

// Kanban stages (four columns as per specification)
const STATUSES = [
  { id: 'new', title: 'New', color: 'bg-blue-500', border: 'border-blue-200' },
  { id: 'contacted', title: 'Contacted', color: 'bg-amber-500', border: 'border-amber-200' },
  { id: 'qualified', title: 'Qualified', color: 'bg-emerald-500', border: 'border-emerald-200' },
  { id: 'lost', title: 'Lost', color: 'bg-rose-500', border: 'border-rose-200' },
]

const SOURCES = ['organic', 'paid_search', 'social_media', 'email', 'referral', 'campaign', 'api', 'manual', 'imported']

export default function Leads() {
  const navigate = useNavigate()
  const [view, setView] = useState(() => localStorage.getItem('leadView') || 'list')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [stats, setStats] = useState({ total: 0, by_status: {}, avg_score: 0 })
  const [selectedIds, setSelectedIds] = useState([])
  const limit = view === 'list' ? 10 : 100

  // Status updates are handled inline to avoid strict dependency on react-query mutation API

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const response = await leadsApi.getAll({ 
        page: view === 'list' ? page : 1, 
        limit: view === 'list' ? limit : 100, 
        search: search || undefined, 
        status: statusFilter || undefined, 
        source: sourceFilter || undefined 
      })
      if (view === 'list') {
        setData(response.data?.items || response.data?.data || [])
        setTotal(response.data?.total || 0)
      } else {
        const allLeads = response.data?.items || []
        const stages = {}
        STATUSES.forEach(s => { stages[s.id] = [] })
        allLeads.forEach(lead => {
          if (stages[lead.status]) {
            stages[lead.status].push(lead)
          }
        })
        setData(stages)
        setTotal(allLeads.length)
      }
      const statsRes = await leadsApi.getStats()
      setStats(statsRes.data)
    } catch (error) {
      toast.error(`Failed to fetch leads: ${error?.message ?? 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => fetchLeads(), 300)
    return () => clearTimeout(timer)
  }, [page, search, statusFilter, sourceFilter, view])

  useEffect(() => {
    localStorage.setItem('leadView', view)
  }, [view])

  const handleDragStart = (event) => setActiveId(event.active.id)

  const handleDragOver = (event) => {
    const { over } = event
    if (!over) return
    const isOverColumn = STATUSES.some(s => s.id === over.id)
    if (!isOverColumn) return
    const activeLead = Object.values(data).flat().find(l => l.id === activeId)
    if (!activeLead || activeLead.status === over.id) return
    setData(prev => {
      const newData = { ...prev }
      newData[activeLead.status] = newData[activeLead.status].filter(l => l.id !== activeId)
      newData[over.id] = [...(newData[over.id] || []), { ...activeLead, status: over.id }]
      return newData
    })
  }

  const handleDragEnd = async (event) => {
    const { over } = event
    setActiveId(null)
    if (!over) { fetchLeads(); return }
    const isOverColumn = STATUSES.some(s => s.id === over.id)
    if (!isOverColumn) { fetchLeads(); return }
    const lead = Object.values(data).flat().find(l => l.id === activeId)
  if (lead) {
      // Optimistic update
      const previousData = JSON.parse(JSON.stringify(data))
      const nextStatus = over.id
      setData(prev => {
        const newData = { ...prev }
        const oldList = newData[lead.status] ? [...newData[lead.status]] : []
        const idx = oldList.findIndex(l => l.id === lead.id)
        if (idx >= 0) oldList.splice(idx, 1)
        newData[lead.status] = oldList
        const movedLead = { ...lead, status: nextStatus }
        newData[nextStatus] = [...(newData[nextStatus] || []), movedLead]
        return newData
      })
      try {
        await leadsApi.updateStatus(lead.id, { status: nextStatus })
        toast.success(`Lead moved to ${STATUSES.find(s => s.id === nextStatus)?.title}`)
        fetchLeads()
      } catch {
        setData(previousData)
        toast.error('Failed to update status')
        fetchLeads()
      }
    }
  }

  const handleSave = async (formData) => {
    try {
      if (selectedLead) {
        await leadsApi.update(selectedLead.id, formData)
        toast.success('Lead updated')
      } else {
        await leadsApi.create(formData)
        toast.success('Lead created')
      }
      setIsModalOpen(false)
      fetchLeads()
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save lead') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return
    try {
      await leadsApi.delete(id)
      toast.success('Lead deleted')
      fetchLeads()
    } catch { toast.error('Delete failed') }
  }

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return
    try {
      let payload = { ids: selectedIds, action }
      if (action === 'change_status') {
        const nextStatus = prompt('Enter status: new, contacted, qualified, nurturing, unqualified, converted')
        if (!nextStatus) return
        payload = { ...payload, value: nextStatus }
      }
      await leadsApi.bulkUpdate(payload)
      toast.success(`${selectedIds.length} leads updated`)
      setSelectedIds([])
      fetchLeads()
    } catch { toast.error('Bulk action failed') }
  }

  const listColumns = [
    {
      key: 'name', label: 'Lead', sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {val?.[0]?.toUpperCase() || 'L'}
          </div>
          <div>
            <div className="font-bold text-gray-900">{val}</div>
            <div className="text-[10px] text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'company', label: 'Company', sortable: true, render: (val, row) => row.company_name || row.company || <span className="text-gray-400">—</span> },
    { key: 'source', label: 'Source', render: (val) => (
      <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">{val?.replace('_', ' ') || '—'}</span>
    )},
    { key: 'status', label: 'Status', render: (val) => {
      const s = STATUSES.find(x => x.id === val)
      return <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${val === 'qualified' ? 'bg-emerald-50 text-emerald-700' : val === 'converted' ? 'bg-indigo-50 text-indigo-700' : val === 'unqualified' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{s?.title || val}</span>
    }},
    { key: 'score', label: 'Score', sortable: true, render: (val, row) => (
      <div className="flex items-center gap-2">
        <TrendingUp className={`h-3 w-3 ${val > 50 ? 'text-emerald-500' : val > 20 ? 'text-amber-500' : 'text-gray-400'}`} />
        <span className="font-bold text-gray-900">{val}</span>
      </div>
    )},
    { key: 'owner_name', label: 'Owner', render: (val) => val || <span className="text-gray-400">Unassigned</span> },
    { key: 'created_at', label: 'Created', sortable: true, render: (val) => new Date(val).toLocaleDateString() },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setSelectedLead(row); setIsModalOpen(true) }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 className="h-4 w-4" /></button>
        <button onClick={() => navigate(`/leads/${row.id}`)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><ChevronRight className="h-4 w-4" /></button>
        <button onClick={() => handleDelete(row.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leads</h1>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">Manage and qualify your potential customers.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}><LayoutList className="h-4 w-4" /></button>
            <button onClick={() => setView('pipeline')} className={`p-2 rounded-lg transition-all ${view === 'pipeline' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}><Trello className="h-4 w-4" /></button>
          </div>
          <button onClick={() => {
            const allLeads = Array.isArray(data) ? data : Object.values(data).flat()
            if (allLeads.length > 0) {
              exportToCSV(allLeads, 'leads', ['name', 'email', 'company', 'phone', 'source', 'status', 'score', 'owner_name', 'created_at'])
            } else {
              toast.error('No data to export')
            }
          }} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => { setSelectedLead(null); setIsModalOpen(true) }} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Plus className="h-4 w-4" /> New Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><User className="h-5 w-5" /></div>
          <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Leads</p><h3 className="text-xl font-black text-gray-900">{stats.total}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp className="h-5 w-5" /></div>
          <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Score</p><h3 className="text-xl font-black text-gray-900">{stats.avg_score}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Sparkles className="h-5 w-5" /></div>
          <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qualified</p><h3 className="text-xl font-black text-gray-900">{stats.by_status?.qualified || 0}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><ArrowRight className="h-5 w-5" /></div>
          <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Converted</p><h3 className="text-xl font-black text-gray-900">{stats.by_status?.converted || 0}</h3></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search leads by name, email, company..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <select className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer font-bold text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <select className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer font-bold text-gray-600" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
            <option value="">All Sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-xl">
          <span className="text-sm font-bold text-indigo-700">{selectedIds.length} selected</span>
          <button onClick={() => handleBulkAction('change_status')} className="px-3 py-1 text-xs font-bold bg-white rounded-lg border border-gray-200 hover:bg-gray-50">Change Status</button>
          <button onClick={() => handleBulkAction('delete')} className="px-3 py-1 text-xs font-bold bg-white rounded-lg border border-gray-200 hover:bg-rose-50 hover:text-rose-600">Delete</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : view === 'list' ? (
        <DataTable columns={listColumns} data={Array.isArray(data) ? data : []} loading={loading} total={total} page={page} limit={limit} onPageChange={setPage} onRowClick={row => navigate(`/leads/${row.id}`)} selectedIds={selectedIds} onSelectRow={id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} onSelectAll={checked => setSelectedIds(checked ? (Array.isArray(data) ? data.map(d => d.id) : []) : [])} />
      ) : (
        <div className="h-[calc(100vh-340px)] overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-4 h-full min-w-max">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              {STATUSES.map(stage => (
                <StageColumn key={stage.id} stage={stage} leads={data[stage.id] || []} onLeadClick={id => navigate(`/leads/${id}`)} onLeadEdit={lead => { setSelectedLead(lead); setIsModalOpen(true) }} />
              ))}
              <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                {activeId ? <LeadCard lead={Object.values(data).flat().find(l => l.id === activeId)} isOverlay /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      )}

      <LeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} lead={selectedLead} />
    </div>
  )
}

function StageColumn({ stage, leads, onLeadClick, onLeadEdit }) {
  return (
    <div className="w-72 flex flex-col h-full">
      <div className="flex items-center justify-between px-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
          <h3 className="font-bold text-gray-900 text-[10px] uppercase tracking-widest">{stage.title}</h3>
          <span className="bg-white border border-gray-100 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">{leads.length}</span>
        </div>
      </div>
      <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
        <div className={`flex-1 bg-gray-50/50 rounded-2xl p-2 space-y-2 border-2 border-dashed ${stage.border} overflow-y-auto custom-scrollbar min-h-[200px]`}>
          {leads.map(lead => <SortableLeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead.id)} onEdit={() => onLeadEdit(lead)} />)}
          {leads.length === 0 && <div className="h-16 flex items-center justify-center text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">No leads</div>}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableLeadCard({ lead, onClick, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })
  const style = { transform: CSS.Translate.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <LeadCard lead={lead} isDragging={isDragging} onEdit={onEdit} />
    </div>
  )
}

function LeadCard({ lead, isDragging, isOverlay, onEdit }) {
  if (!lead) return null
  return (
    <div className={`bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all group ${isDragging ? 'opacity-30' : 'hover:border-indigo-300 hover:shadow-md'} ${isOverlay ? 'shadow-xl ring-2 ring-indigo-500 rotate-2' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">{lead.name?.[0]?.toUpperCase()}</div>
        <button onClick={e => { e.stopPropagation(); onEdit?.() }} className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-all"><Edit3 className="h-3 w-3" /></button>
      </div>
      <p className="text-sm font-bold text-gray-900 truncate">{lead.name}</p>
      <p className="text-[10px] text-gray-500 truncate">{lead.company_name || lead.company || lead.email}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400"><TrendingUp className="h-3 w-3" />{lead.score}</div>
        <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 border border-white shadow-sm flex items-center justify-center text-[8px] font-black text-white">{lead.owner_name?.[0] || '?'}</div>
      </div>
    </div>
  )
}
