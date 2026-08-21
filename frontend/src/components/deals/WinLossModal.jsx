import { useState } from 'react'
import { X, Trophy, XCircle, DollarSign, Tag, FileText } from 'lucide-react'

const REASON_CATEGORIES = [
  'pricing',
  'competitor',
  'no_response',
  'bad_fit',
  'timing',
  'churned',
  'other',
]

export function canSubmitWinLoss(outcome, reasonCategory) {
  return ['won', 'lost'].includes(outcome) && Boolean(reasonCategory)
}

export default function WinLossModal({ isOpen, onClose, onSubmit, deal }) {
  const [formData, setFormData] = useState({
    status: '',
    reason_category: '',
    reason_notes: '',
    amount_final: deal?.value || '',
  })
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmitWinLoss(formData.status, formData.reason_category)) return
    setLoading(true)
    try {
      await onSubmit({
        status: formData.status,
        reason_category: formData.reason_category,
        reason_notes: formData.reason_notes,
        amount_final: formData.amount_final ? parseFloat(formData.amount_final) : null,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Close Deal</h2>
              <p className="text-xs text-gray-500">{deal?.title || 'Record outcome'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Outcome *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, status: 'won' }))}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  formData.status === 'won'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-emerald-200'
                }`}
              >
                <Trophy className="h-4 w-4" />
                Won
              </button>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, status: 'lost' }))}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  formData.status === 'lost'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-rose-200'
                }`}
              >
                <XCircle className="h-4 w-4" />
                Lost
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              <Tag className="h-3 w-3 inline mr-1" />
              Reason Category *
            </label>
            <select
              value={formData.reason_category}
              onChange={e => setFormData(p => ({ ...p, reason_category: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer"
            >
              <option value="">Select reason</option>
              {REASON_CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              <FileText className="h-3 w-3 inline mr-1" />
              Reason Notes
            </label>
            <textarea
              value={formData.reason_notes}
              onChange={e => setFormData(p => ({ ...p, reason_notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium resize-none"
              placeholder="Additional context..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              <DollarSign className="h-3 w-3 inline mr-1" />
              Final Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount_final}
              onChange={e => setFormData(p => ({ ...p, amount_final: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium"
              placeholder={deal?.value?.toString() || '0'}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canSubmitWinLoss(formData.status, formData.reason_category)}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Close Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
