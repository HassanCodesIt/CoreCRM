import { useState } from 'react'
import { X, User, Mail, Phone, Building2, Globe, Tag, FileText, Zap, ChevronDown } from 'lucide-react'

const SOURCES = ['organic', 'paid_search', 'social_media', 'email', 'referral', 'campaign', 'api', 'manual', 'imported']
const STATUSES = ['new', 'contacted', 'qualified', 'nurturing', 'unqualified', 'converted']

export default function LeadModal({ isOpen, onClose, onSave, lead }) {
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    company: lead?.company || '',
    job_title: lead?.job_title || '',
    website: lead?.website || '',
    industry: lead?.industry || '',
    status: lead?.status || 'new',
    source: lead?.source || 'manual',
    notes: lead?.notes || '',
    tags: lead?.tags || [],
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white"><User className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{lead ? 'Edit Lead' : 'New Lead'}</h2>
              <p className="text-xs text-gray-500">{lead ? 'Update lead information' : 'Add a new lead to your pipeline'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="John Doe" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="john@company.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="+1 234 567 8900" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Company</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="Acme Corp" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Job Title</label>
              <div className="relative">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={formData.job_title} onChange={e => setFormData(p => ({ ...p, job_title: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="VP of Engineering" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="url" value={formData.website} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="https://acme.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Industry</label>
              <input type="text" value={formData.industry} onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="Technology" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Source</label>
              <select value={formData.source} onChange={e => setFormData(p => ({ ...p, source: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer">
                {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                    <Tag className="h-3 w-3" />{tag}<button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-rose-600"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} className="flex-1 px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="Add a tag..." />
                <button type="button" onClick={addTag} className="px-4 py-2 bg-gray-50 text-sm font-bold rounded-xl hover:bg-gray-100">Add</button>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium resize-none" placeholder="Additional notes about this lead..." />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}