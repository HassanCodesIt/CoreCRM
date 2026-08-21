import { useState, useEffect } from 'react'
import { X, Briefcase, DollarSign, Calendar, FileText, Check } from 'lucide-react'
import { dealsApi } from '../../api/deals'

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']

export default function DealModal({ isOpen, onClose, onSave, deal = null }) {
  const [formData, setFormData] = useState({
    title: deal?.title || '',
    value: deal?.value || 0,
    currency: deal?.currency || 'INR',
    expected_close_date: deal?.expected_close_date || '',
    status: deal?.status || 'open',
    notes: deal?.notes || '',
    contact_id: deal?.contact_id || '',
    account_id: deal?.account_id || '',
    pipeline_id: deal?.pipeline_id || '',
    stage_id: deal?.stage_id || '',
  })
  const [loading, setLoading] = useState(false)
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: deal?.title || '',
        value: deal?.value || 0,
        currency: deal?.currency || 'INR',
        expected_close_date: deal?.expected_close_date || '',
        status: deal?.status || 'open',
        notes: deal?.notes || '',
        contact_id: deal?.contact_id || '',
        account_id: deal?.account_id || '',
        pipeline_id: deal?.pipeline_id || '',
        stage_id: deal?.stage_id || '',
      })
    }
  }, [isOpen, deal])

  useEffect(() => {
    if (!isOpen) return
    const loadPipelines = async () => {
      try {
        const res = await dealsApi.getPipelines()
        const pipes = res.data || []
        setPipelines(pipes)
        
        // Match deal's pipeline or use first pipeline
        let activePipe = null
        if (deal && deal.pipeline_id) {
          activePipe = pipes.find(p => p.id === deal.pipeline_id)
        }
        if (!activePipe && pipes.length > 0) {
          activePipe = pipes[0]
        }
        
        setSelectedPipeline(activePipe)
        setFormData(prev => ({
          ...prev,
          pipeline_id: prev.pipeline_id || (activePipe ? activePipe.id : ''),
          stage_id: prev.stage_id || (activePipe && activePipe.stages?.[0] ? activePipe.stages[0].id : '')
        }))
      } catch (err) {
        console.error('Failed to load pipelines in DealModal:', err)
      }
    }
    loadPipelines()
  }, [isOpen, deal])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const cleanedData = { ...formData }
      if (!cleanedData.expected_close_date) {
        cleanedData.expected_close_date = null
      }
      if (!cleanedData.contact_id) {
        cleanedData.contact_id = null
      }
      if (!cleanedData.account_id) {
        cleanedData.account_id = null
      }
      if (!cleanedData.notes) {
        cleanedData.notes = null
      }
      await onSave(cleanedData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white"><Briefcase className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{deal?.id ? 'Edit Deal' : 'New Deal'}</h2>
              <p className="text-xs text-gray-500">{deal?.id ? 'Update deal information' : 'Add a new deal to your pipeline'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deal Title *</label>
              <input type="text" required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="Enterprise Software License" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Value *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="number" required min="0" step="0.01" value={formData.value} onChange={e => setFormData(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="50000" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Currency</label>
              <select value={formData.currency} onChange={e => setFormData(p => ({ ...p, currency: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Expected Close Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="date" value={formData.expected_close_date} onChange={e => setFormData(p => ({ ...p, expected_close_date: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer">
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact ID</label>
              <input type="text" value={formData.contact_id} onChange={e => setFormData(p => ({ ...p, contact_id: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Account ID</label>
              <input type="text" value={formData.account_id} onChange={e => setFormData(p => ({ ...p, account_id: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pipeline *</label>
              <select required value={formData.pipeline_id} onChange={e => {
                const pipeId = e.target.value
                const pipe = pipelines.find(p => p.id === pipeId)
                setSelectedPipeline(pipe)
                setFormData(prev => ({
                  ...prev,
                  pipeline_id: pipeId,
                  stage_id: pipe && pipe.stages?.[0] ? pipe.stages[0].id : ''
                }))
              }} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer">
                <option value="">Select Pipeline</option>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Stage *</label>
              <select required value={formData.stage_id} onChange={e => setFormData(p => ({ ...p, stage_id: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer">
                <option value="">Select Stage</option>
                {(selectedPipeline?.stages || []).map(s => <option key={s.id} value={s.id}>{s.name || s.stage_name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium resize-none" placeholder="Additional notes about this deal..." />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : deal?.id ? 'Update Deal' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
