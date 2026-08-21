import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Briefcase,
  TrendingUp,
  LayoutList,
  Trello,
  ChevronRight,
  DollarSign,
  Calendar,
  Building2,
  Download,
  BarChart3,
  ChevronDown
} from 'lucide-react'
import { exportToCSV } from '../utils/exportCSV'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { dealsApi } from '../api/deals'
import DataTable from '../components/shared/DataTable'
import DealModal from '../components/deals/DealModal'
import WinLossModal from '../components/deals/WinLossModal'
import RottenBadge from '../components/deals/RottenBadge'
import DealVelocityChart from '../components/deals/DealVelocityChart'
import StageFunnelChart from '../components/deals/StageFunnelChart'
import toast from 'react-hot-toast'

export default function Deals() {
  const navigate = useNavigate()
  const [view, setView] = useState(() => {
    const savedView = localStorage.getItem('dealView')
    return savedView === 'list' ? 'list' : 'board'
  })
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [pipelineStages, setPipelineStages] = useState([])
  const [stagesLoading, setStagesLoading] = useState(true)
  const [pipelines, setPipelines] = useState([])
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [winLossModalOpen, setWinLossModalOpen] = useState(false)
  const [winLossDeal, setWinLossDeal] = useState(null)
  const [velocityData, setVelocityData] = useState([])
  const [funnelData, setFunnelData] = useState([])
  
  const limit = view === 'list' ? 10 : 100

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchDeals = async () => {
    setLoading(true)
    try {
      const params = {
        page: view === 'list' ? page : 1,
        limit: view === 'list' ? limit : 100,
        q: search || undefined,
        pipeline_id: selectedPipelineId || undefined,
        ...(view === 'list' && stage ? { stage_id: stage } : {}),
      }
      const response = await dealsApi.getAll(params)
      const items = response.data?.items || response.data?.data || []
      setData(items)
      setTotal(response.data?.total || 0)
    } catch (error) {
      console.error('Fetch failed:', error)
      toast.error('Failed to fetch deals')
    } finally {
      setLoading(false)
    }
  }

  const fetchPipeline = async () => {
    setStagesLoading(true)
    try {
      const res = await dealsApi.getPipelines()
      const pipes = res.data || []
      setPipelines(pipes)
      if (pipes.length > 0) {
        const selected = selectedPipelineId
          ? pipes.find(p => p.id === selectedPipelineId)
          : pipes[0]
        if (selected) {
          setSelectedPipelineId(selected.id)
          const stages = (selected.stages || []).map(s => ({
            id: s.id,
            title: s.name || s.stage_name || 'Unknown',
            color: 'bg-indigo-500',
            border: 'border-indigo-200'
          }))
          setPipelineStages(stages)
        }
      }
    } catch (err) {
      console.error('Failed to fetch pipeline:', err)
    } finally {
      setStagesLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals()
  }, [page, search, stage, view, selectedPipelineId])

  useEffect(() => {
  fetchPipeline()
  }, [])

  const handlePipelineChange = (pipelineId) => {
    setSelectedPipelineId(pipelineId)
    setStage('')
    setPage(1)
    const selected = pipelines.find(p => p.id === pipelineId)
    if (selected) {
      const stages = (selected.stages || []).map(s => ({
        id: s.id,
        title: s.name || s.stage_name || 'Unknown',
        color: 'bg-indigo-500',
        border: 'border-indigo-200'
      }))
      setPipelineStages(stages)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const [velRes, funRes] = await Promise.allSettled([
        dealsApi.getVelocity(),
        selectedPipelineId ? dealsApi.getFunnel(selectedPipelineId) : Promise.resolve({ data: { stages: [] } }),
      ])
      if (velRes.status === 'fulfilled') setVelocityData(velRes.value.data?.pipelines || [])
      if (funRes.status === 'fulfilled') setFunnelData(funRes.value.data?.stages || [])
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedPipelineId])

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeDeal = data.find(d => d.id === active.id)
    const overId = over.id

    const isOverColumn = pipelineStages.some(s => s.id === overId)
    const overDeal = data.find(d => d.id === overId)
    const overColumnId = isOverColumn ? overId : overDeal?.stage_id

    if (activeDeal && overColumnId && activeDeal.stage_id !== overColumnId) {
      setData(prev => prev.map(d => d.id === active.id ? { ...d, stage_id: overColumnId } : d))
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
      fetchDeals()
      return
    }

    const activeDeal = data.find(d => d.id === active.id)
    const overId = over.id
    const isOverColumn = pipelineStages.some(s => s.id === overId)
    const overColumnId = isOverColumn ? overId : data.find(d => d.id === overId)?.stage_id

    if (activeDeal && overColumnId) {
      const targetStageTitle = pipelineStages.find(s => s.id === overColumnId)?.title || ''
      const isClosingStage = targetStageTitle.toLowerCase().includes('won') || targetStageTitle.toLowerCase().includes('lost')

      if (isClosingStage) {
        setData(prev => prev.map(d => d.id === active.id ? { ...d, stage_id: overColumnId } : d))
        setWinLossDeal(activeDeal)
        setWinLossModalOpen(true)
        return
      }

      try {
        await dealsApi.moveDealStage(activeDeal.id, { stage_id: overColumnId })
        toast.success(`Deal moved to ${targetStageTitle || 'Unknown'}`)
      } catch (error) {
        toast.error('Failed to update deal stage')
        fetchDeals()
      }
    }
  }

  const handleCloseDeal = async (payload) => {
    if (!winLossDeal) return
    try {
      await dealsApi.closeDeal(winLossDeal.id, payload)
      toast.success(`Deal closed as ${payload.status}`)
      setWinLossModalOpen(false)
      setWinLossDeal(null)
      fetchDeals()
    } catch (error) {
      toast.error('Failed to close deal')
    }
  }

  const handleSaveDeal = async (formData) => {
    try {
      if (selectedDeal) {
        await dealsApi.update(selectedDeal.id, formData)
        toast.success('Deal updated')
      } else {
        await dealsApi.create(formData)
        toast.success('Deal created')
      }
      setDealModalOpen(false)
      setSelectedDeal(null)
      fetchDeals()
    } catch (error) {
      toast.error('Failed to save deal')
    }
  }

  const listColumns = [
    {
      key: 'title',
      label: 'Deal Title',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 shadow-sm">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-gray-900">{val}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              {row.account_name || 'Individual'}
            </div>
          </div>
        </div>
      ),
    },
    { 
      key: 'value', 
      label: 'Value',
      render: (val, row) => (
        <span className="font-bold text-gray-900">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: row.currency || 'INR' }).format(val)}
        </span>
      )
    },
    { 
      key: 'stage_id', 
      label: 'Stage',
      render: (val) => (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
          val === 'closed_won' ? 'bg-emerald-50 text-emerald-700' :
          val === 'closed_lost' ? 'bg-rose-50 text-rose-700' :
          'bg-indigo-50 text-indigo-700'
        }`}>
          {pipelineStages.find(s => s.id === val)?.title || val || 'Unknown'}
        </span>
      )
    },
    { 
      key: 'probability', 
      label: 'Prob.',
      render: (val) => (
        <div className="flex items-center gap-2">
          <TrendingUp className={`h-3 w-3 ${val > 50 ? 'text-green-500' : 'text-amber-500'}`} />
          <span className="text-sm font-medium">{val}%</span>
        </div>
      )
    },
    { 
      key: 'close_date', 
      label: 'Expected Close',
      render: (val, row) => {
        const closeDate = val || row.expected_close_date || row.actual_close_date
        return closeDate ? new Date(closeDate).toLocaleDateString() : 'Not set'
      }
    },
    {
      key: 'actions',
      label: '',
      render: (val, row) => (
        <button onClick={(e) => { e.stopPropagation(); navigate(`/deals/${row.id}`) }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      )
    }
  ]

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const selectedVelocityData = selectedPipelineId
    ? velocityData.filter(p => p.pipeline_id === selectedPipelineId)
    : velocityData

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight text-shadow-sm">Deals & Pipeline</h1>
          <p className="text-gray-500 mt-1">Manage your sales opportunities and track conversion.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <button
              onClick={() => {
                setView('board')
                localStorage.setItem('dealView', 'board')
              }}
              className={`p-2 rounded-lg transition-all ${view === 'board' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              title="Board View"
            >
              <Trello className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setView('list')
                localStorage.setItem('dealView', 'list')
              }}
              className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              title="List View"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
          {pipelines.length > 1 && (
            <div className="relative">
              <select
                value={selectedPipelineId}
                onChange={e => handlePipelineChange(e.target.value)}
                className="pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-100"
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          )}
          <button
            onClick={() => exportToCSV(data, 'deals', ['title', 'value', 'stage_name', 'company_name', 'contact_name', 'owner_name', 'probability', 'expected_close_date', 'created_at'])}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => { setSelectedDeal(null); setDealModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus className="h-4 w-4" />
            New Deal
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search deals..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {view === 'list' && (
          <div className="flex items-center gap-2">
            <select 
              className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer font-medium"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              <option value="">All Stages</option>
              {pipelineStages.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Pipeline Analytics</h2>
              <p className="text-xs text-gray-500 font-medium">
                {selectedPipeline?.name ? `${selectedPipeline.name} funnel and stage velocity` : 'Funnel and velocity by sales stage'}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <StageFunnelChart stages={funnelData} />
          <DealVelocityChart data={selectedVelocityData} />
        </div>
      </section>

      {loading || stagesLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <>
          {view === 'list' ? (
            <DataTable 
              columns={listColumns}
              data={Array.isArray(data) ? data : []}
              loading={loading}
              total={total}
              page={page}
              limit={limit}
              onPageChange={setPage}
              onRowClick={(row) => navigate(`/deals/${row.id}`)}
            />
          ) : (
            <div className="h-[calc(100vh-280px)] overflow-x-auto pb-4 custom-scrollbar">
              <div className="flex gap-6 h-full min-w-max">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  {pipelineStages.length > 0 ? pipelineStages.map((stage) => (
                    <StageColumn 
                      key={stage.id} 
                      stage={stage} 
                      deals={Array.isArray(data) ? data.filter(d => d.stage_id === stage.id) : []} 
                      onDealClick={(id) => navigate(`/deals/${id}`)}
                    />
                  )) : (
                    <div className="h-[calc(100vh-280px)] flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-500 font-medium">No pipeline found</p>
                        <p className="text-sm text-gray-400 mt-2">Please check backend has default pipeline set up.</p>
                      </div>
                    </div>
                  )}

                  <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                      styles: { active: { opacity: '0.5' } },
                    }),
                  }}>
                    {activeId ? (
                      <DealCard deal={Array.isArray(data) ? data.find(d => d.id === activeId) : null} isOverlay={true} />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          )}
        </>
      )}

      <DealModal
      isOpen={dealModalOpen}
      onClose={() => setDealModalOpen(false)}
      onSave={handleSaveDeal}
      deal={selectedDeal}
    />

    <WinLossModal
      isOpen={winLossModalOpen}
      onClose={() => { setWinLossModalOpen(false); setWinLossDeal(null); fetchDeals() }}
      onSubmit={handleCloseDeal}
      deal={winLossDeal}
    />
    </div>
  )
}

function StageColumn({ stage, deals, onDealClick }) {
  return (
    <div className="w-80 flex flex-col h-full">
      <div className="flex items-center justify-between px-3 mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${stage.color} shadow-sm`} />
          <h3 className="font-bold text-gray-900 text-[10px] uppercase tracking-widest">{stage.title}</h3>
          <span className="bg-white border border-gray-100 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
            {deals.length}
          </span>
        </div>
        <div className="text-[10px] font-black text-gray-400">
           ₹{(deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0) / 1000).toFixed(1)}k
        </div>
      </div>

      <SortableContext
        id={stage.id}
        items={deals.map(d => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div 
          className={`flex-1 bg-gray-50/30 rounded-[2rem] p-3 space-y-3 border-2 border-dashed ${stage.border} overflow-y-auto custom-scrollbar`}
        >
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal.id)} />
          ))}
          {deals.length === 0 && (
            <div className="h-24 flex items-center justify-center text-[10px] font-bold text-gray-300 uppercase tracking-widest italic pt-8">
               No deals here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableDealCard({ deal, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <DealCard deal={deal} isDragging={isDragging} />
    </div>
  );
}

function DealCard({ deal, isDragging, isOverlay }) {
  if (!deal) return null;
  
  return (
    <div className={`
      bg-white p-4 rounded-3xl border border-gray-100 shadow-sm 
      transition-all duration-200 group cursor-pointer;
      ${isDragging ? 'opacity-30' : 'hover:border-indigo-300 hover:shadow-md'}
      ${isOverlay ? 'shadow-2xl ring-2 ring-indigo-500 rotate-2' : ''}
    `}>
        <div className="flex justify-between items-start mb-3">
        <p className="text-sm font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
          {deal.title}
        </p>
        <RottenBadge isRotting={deal.is_rotting} />
      </div>
       
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50/50 rounded-xl w-fit">
           <DollarSign className="h-3 w-3 text-indigo-500" />
           <span className="text-xs font-black text-indigo-700">
             {new Intl.NumberFormat('en-IN', { style: 'currency', currency: deal.currency || 'INR', maximumFractionDigits: 0 }).format(deal.value)}
           </span>
        </div>
         
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 truncate max-w-[140px]">
              <Building2 className="h-3 w-3" />
              {deal.account_name || 'Individual'}
           </div>
           <div className="flex items-center gap-1 text-[10px] font-black text-gray-800">
              <TrendingUp className={`h-3 w-3 ${(deal.probability ?? deal.ai_health_score ?? 0) > 50 ? 'text-green-500' : 'text-amber-500'}`} />
              {deal.probability ?? deal.ai_health_score ?? 0}%
           </div>
        </div>
      </div>
       
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
         <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
            <Calendar className="h-3 w-3" />
            {deal.close_date || deal.expected_close_date || deal.actual_close_date
              ? new Date(deal.close_date || deal.expected_close_date || deal.actual_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'No date'}
         </div>
         <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 border-2 border-white shadow-sm flex items-center justify-center text-[8px] font-black text-white">
            {deal.owner_name?.[0] || 'U'}
         </div>
      </div>
    </div>
  )
}
