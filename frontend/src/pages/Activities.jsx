import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Calendar, Phone, Mail, CheckCircle, Clock, MoreHorizontal, User, Download } from 'lucide-react'
import { activitiesApi } from '../api/activities'
import { exportToCSV } from '../utils/exportCSV'
import DataTable from '../components/shared/DataTable'
import ActivityModal from '../components/activities/ActivityModal'
import toast from 'react-hot-toast'

export default function Activities() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const [isCompleted, setIsCompleted] = useState('')
  const [isActivityModalOpen, setActivityModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const limit = 10

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit,
        activity_type: type || undefined,
        is_completed: isCompleted === '' ? undefined : isCompleted === 'true',
      }
        const response = await activitiesApi.getAll(params)
        setData(response.data?.items || response.data?.data || [])
        setTotal(response.data?.total || 0)
    } catch (error) {
      toast.error('Failed to fetch activities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [page, type, isCompleted])

  const handleComplete = async (id) => {
    try {
      await activitiesApi.complete(id)
      toast.success('Activity marked as complete')
      fetchActivities()
    } catch (error) {
      toast.error('Failed to update activity')
    }
  }

  const handleSaveActivity = async (formData) => {
    try {
      if (selectedActivity) {
        await activitiesApi.update(selectedActivity.id, formData)
        toast.success('Activity updated')
      } else {
        await activitiesApi.create(formData)
        toast.success('Activity created')
      }
      setActivityModalOpen(false)
      setSelectedActivity(null)
      fetchActivities()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save activity')
    }
  }

  const columns = [
    {
      key: 'activity_type',
      label: 'Type',
      render: (val) => (
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
          val === 'call' ? 'bg-blue-50 text-blue-600' :
          val === 'meeting' ? 'bg-purple-50 text-purple-600' :
          val === 'email' ? 'bg-amber-50 text-amber-600' :
          'bg-indigo-50 text-indigo-600'
        }`}>
          {val === 'call' && <Phone className="h-4 w-4" />}
          {val === 'meeting' && <Calendar className="h-4 w-4" />}
          {val === 'email' && <Mail className="h-4 w-4" />}
          {val === 'task' && <CheckCircle className="h-4 w-4" />}
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Subject',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className={`font-bold text-gray-900 ${row.is_completed ? 'line-through text-gray-400 opacity-60' : ''}`}>
            {val}
          </div>
          <div className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">
             {row.related_to_type ? `${row.related_to_type}: ID...` : 'General'}
          </div>
        </div>
      ),
    },
    { 
      key: 'due_date', 
      label: 'Due Date',
      render: (val) => (
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
           <Clock className="h-3 w-3 text-gray-400" />
           {new Date(val).toLocaleDateString()}
        </div>
      )
    },
    { 
      key: 'assigned_to_name', 
      label: 'Assignee',
      render: (val) => (
        <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-black text-gray-500 border border-gray-200 shadow-sm">
               {val?.[0] || 'U'}
            </div>
            <span className="text-xs font-semibold text-gray-700">{val || 'Unassigned'}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => (
        <button 
          onClick={(e) => { e.stopPropagation(); if(!row.is_completed) handleComplete(row.id) }}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            row.is_completed 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
              : 'bg-white border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-400 hover:text-indigo-600'
          }`}
        >
          {row.is_completed ? 'Completed' : 'Upcoming'}
        </button>
      )
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
          <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
             <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Activities</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track calls, meetings, and follow-up tasks.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => exportToCSV(data, 'activities', ['subject', 'type', 'due_date', 'is_completed', 'assigned_to_name', 'related_to_type', 'created_at'])} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => { setSelectedActivity(null); setActivityModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="h-4 w-4" />
            Log Activity
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search activities..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-[11px] font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer text-gray-500"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="email">Email</option>
            <option value="task">Task</option>
          </select>
          <select 
            className="pl-3 pr-8 py-2 bg-gray-50 border-none rounded-xl text-[11px] font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer text-gray-500"
            value={isCompleted}
            onChange={(e) => setIsCompleted(e.target.value)}
          >
            <option value="">Any Status</option>
            <option value="false">Upcoming</option>
            <option value="true">Completed</option>
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
      />

      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        onSave={handleSaveActivity}
        activity={selectedActivity}
      />
    </div>
  )
}
