import { useState, useEffect } from 'react'
import { X, Building2, Globe, Phone, MapPin, DollarSign, Users, FileText, Check } from 'lucide-react'

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Education', 'Other']

const normalizeWebsiteUrl = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export default function AccountModal({ isOpen, onClose, onSave, account = null }) {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    website: account?.website || '',
    industry: account?.industry || '',
    employee_count: account?.employees_count || account?.employee_count || '',
    annual_revenue: account?.annual_revenue || '',
    phone: account?.phone || '',
    address: account?.address || '',
    city: account?.city || '',
    state: account?.state || '',
    country: account?.country || '',
    status: account?.status || 'active',
    notes: account?.notes || '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: account?.name || '',
        website: account?.website || '',
        industry: account?.industry || '',
        employee_count: account?.employees_count || account?.employee_count || '',
        annual_revenue: account?.annual_revenue || '',
        phone: account?.phone || '',
        address: account?.address || '',
        city: account?.city || '',
        state: account?.state || '',
        country: account?.country || '',
        status: account?.status || 'active',
        notes: account?.notes || '',
      })
    }
  }, [isOpen, account])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...formData }
      payload.website = normalizeWebsiteUrl(payload.website)
      
      // Clean up empty fields to null
      if (payload.employee_count === '') payload.employee_count = null
      if (payload.annual_revenue === '') payload.annual_revenue = null
      if (!payload.website) payload.website = null
      if (!payload.phone) payload.phone = null
      if (!payload.address) payload.address = null
      if (!payload.city) payload.city = null
      if (!payload.state) payload.state = null
      if (!payload.country) payload.country = null
      if (!payload.notes) payload.notes = null

      await onSave(payload)
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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white"><Building2 className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{account ? 'Edit Account' : 'New Account'}</h2>
              <p className="text-xs text-gray-500">{account ? 'Update account information' : 'Add a new company account'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Company Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="Acme Corporation" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" inputMode="url" autoComplete="url" value={formData.website} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="acme.com or https://acme.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Industry</label>
              <select value={formData.industry} onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer">
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Employee Count</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="number" min="0" value={formData.employee_count} onChange={e => setFormData(p => ({ ...p, employee_count: parseInt(e.target.value) || '' }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="100" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Annual Revenue</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="number" min="0" step="0.01" value={formData.annual_revenue} onChange={e => setFormData(p => ({ ...p, annual_revenue: parseFloat(e.target.value) || '' }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="1000000" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="+1 234 567 8900" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} rows={2} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium resize-none" placeholder="123 Business Ave, Suite 100" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">City</label>
              <input type="text" value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="San Francisco" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">State</label>
              <input type="text" value={formData.state} onChange={e => setFormData(p => ({ ...p, state: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="CA" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Country</label>
              <input type="text" value={formData.country} onChange={e => setFormData(p => ({ ...p, country: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium" placeholder="United States" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium resize-none" placeholder="Additional notes about this account..." />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
