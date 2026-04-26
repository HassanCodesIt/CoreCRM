import { Sparkles } from 'lucide-react'

export default function AICard({ title, loading, onRefresh, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? 'Thinking...' : 'Refresh'}
          </button>
        )}
      </div>
      <div className="p-4 text-sm text-gray-700 leading-relaxed">
        {loading ? <div className="h-16 bg-gray-100 rounded animate-pulse" /> : children}
      </div>
    </div>
  )
}
