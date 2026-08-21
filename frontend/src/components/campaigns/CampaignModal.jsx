import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CampaignModal({ isOpen, onClose, onSave, campaign = null }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'email',
    status: 'draft',
    start_date: '',
    end_date: '',
    budget: 0,
    description: ''
  })

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        type: campaign.type || 'email',
        status: campaign.status || 'draft',
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        budget: campaign.budget || 0,
        description: campaign.description || ''
      })
    } else {
      setFormData({
        name: '',
        type: 'email',
        status: 'draft',
        start_date: '',
        end_date: '',
        budget: 0,
        description: ''
      })
    }
  }, [campaign, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: formData.name,
      campaign_type: formData.type || 'email',
      status: formData.status || 'draft',
      scheduled_at: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      description: formData.description || '',
      subject: formData.name,
      body: formData.description || 'Campaign details'
    }
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {campaign ? 'Edit Campaign' : 'New Campaign'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Campaign Name</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Summer Newsletter 2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Type</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium appearance-none cursor-pointer"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="email">Email</option>
                  <option value="social">Social Media</option>
                  <option value="ads">Paid Ads</option>
                  <option value="event">Event</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Status</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium appearance-none cursor-pointer"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="draft">Draft</option>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Start Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">End Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Budget ($)</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value)})}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Description</label>
              <textarea 
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Campaign goals and details..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-100 hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              {campaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
