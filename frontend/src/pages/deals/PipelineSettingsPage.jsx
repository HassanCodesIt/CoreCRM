import { useState, useEffect } from 'react'
import { Plus, Trash2, Settings, ChevronRight, Skull, Edit2, Check, X } from 'lucide-react'
import { dealsApi } from '../../api/deals'
import toast from 'react-hot-toast'

export default function PipelineSettingsPage() {
  const [pipelines, setPipelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedPipeline, setExpandedPipeline] = useState(null)
  const [newPipelineName, setNewPipelineName] = useState('')
  const [showCreatePipeline, setShowCreatePipeline] = useState(false)
  const [newStageName, setNewStageName] = useState({})
  const [editingPipelineId, setEditingPipelineId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const fetchPipelines = async () => {
    setLoading(true)
    try {
      const res = await dealsApi.getPipelines()
      setPipelines(res.data || [])
    } catch (err) {
      console.error('Failed to fetch pipelines:', err)
      toast.error('Failed to load pipelines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPipelines() }, [])

  const handleCreatePipeline = async (e) => {
    e.preventDefault()
    if (!newPipelineName.trim()) return
    try {
      await dealsApi.createPipeline({ name: newPipelineName, is_default: false, currency: 'USD', stages: [] })
      toast.success('Pipeline created')
      setNewPipelineName('')
      setShowCreatePipeline(false)
      fetchPipelines()
    } catch (err) {
      toast.error('Failed to create pipeline')
    }
  }

  const handleRenamePipeline = async (pipelineId) => {
    if (!editingName.trim()) { setEditingPipelineId(null); return }
    try {
      await dealsApi.updatePipeline(pipelineId, { name: editingName })
      toast.success('Pipeline renamed')
      setEditingPipelineId(null)
      fetchPipelines()
    } catch (err) {
      toast.error('Failed to rename pipeline')
    }
  }

  const handleDeletePipeline = async (pipelineId) => {
    if (!confirm('Delete this pipeline? This cannot be undone.')) return
    try {
      await dealsApi.deletePipeline(pipelineId)
      toast.success('Pipeline deleted')
      fetchPipelines()
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.error('Cannot delete pipeline with open deals')
      } else {
        toast.error('Failed to delete pipeline')
      }
    }
  }

  const handleAddStage = async (pipelineId) => {
    const name = newStageName[pipelineId]
    if (!name?.trim()) return
    try {
      await dealsApi.addStage(pipelineId, { name, order: 99 })
      toast.success('Stage added')
      setNewStageName(p => ({ ...p, [pipelineId]: '' }))
      fetchPipelines()
    } catch (err) {
      toast.error('Failed to add stage')
    }
  }

  const handleUpdateRottingDays = async (pipelineId, rottingDays) => {
    try {
      await dealsApi.updatePipeline(pipelineId, { rotting_days: parseInt(rottingDays) || 14 })
      toast.success('Rotting threshold updated')
      fetchPipelines()
    } catch (err) {
      toast.error('Failed to update rotting days')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pipeline Settings</h1>
          <p className="text-gray-500 mt-1">Manage your sales pipelines and stages.</p>
        </div>
        <button
          onClick={() => setShowCreatePipeline(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
        >
          <Plus className="h-4 w-4" />
          New Pipeline
        </button>
      </div>

      {showCreatePipeline && (
        <form onSubmit={handleCreatePipeline} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pipeline Name</label>
            <input
              type="text"
              required
              value={newPipelineName}
              onChange={e => setNewPipelineName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium"
              placeholder="e.g. Sales Pipeline"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => { setShowCreatePipeline(false); setNewPipelineName('') }} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">Create</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {pipelines.map(pipeline => (
          <div key={pipeline.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedPipeline(expandedPipeline === pipeline.id ? null : pipeline.id)}
            >
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-gray-400" />
                {editingPipelineId === pipeline.id ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRenamePipeline(pipeline.id)}
                      className="px-3 py-1.5 bg-gray-50 border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-100"
                      autoFocus
                    />
                    <button onClick={() => handleRenamePipeline(pipeline.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditingPipelineId(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded-lg"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <h3 className="text-sm font-bold text-gray-900">{pipeline.name}</h3>
                )}
                {pipeline.is_default && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Default</span>
                )}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Skull className="h-3 w-3" />
                  {pipeline.rotting_days || 14}d rotting
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setEditingPipelineId(pipeline.id); setEditingName(pipeline.name) }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDeletePipeline(pipeline.id)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${expandedPipeline === pipeline.id ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {expandedPipeline === pipeline.id && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rotting Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={pipeline.rotting_days || 14}
                    onChange={e => handleUpdateRottingDays(pipeline.id, e.target.value)}
                    className="w-20 px-3 py-1.5 bg-gray-50 border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="text-xs text-gray-400 font-medium">days</span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stages</h4>
                  {pipeline.stages?.map((stage, i) => (
                    <div key={stage.id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                      <span className="text-[10px] font-black text-gray-400 w-6">{i + 1}</span>
                      <span className="text-sm font-bold text-gray-900 flex-1">{stage.name}</span>
                      <button
                        onClick={async () => {
                          try {
                            await dealsApi.deleteStage(pipeline.id, stage.id)
                            toast.success('Stage removed')
                            fetchPipelines()
                          } catch (err) {
                            toast.error('Cannot delete stage with deals')
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-rose-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!pipeline.stages || pipeline.stages.length === 0) && (
                    <p className="text-xs text-gray-400 py-4 text-center">No stages yet</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStageName[pipeline.id] || ''}
                    onChange={e => setNewStageName(p => ({ ...p, [pipeline.id]: e.target.value }))}
                    placeholder="New stage name"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium"
                    onKeyDown={e => e.key === 'Enter' && handleAddStage(pipeline.id)}
                  />
                  <button
                    onClick={() => handleAddStage(pipeline.id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {pipelines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 font-medium">No pipelines found</p>
            <p className="text-sm text-gray-400 mt-2">Create your first pipeline to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
