import { Activity, Briefcase, Building2, MessageSquare, Target } from 'lucide-react'

const ICONS = {
  account: Building2,
  activity: Activity,
  deal: Briefcase,
  ticket: MessageSquare,
}

function titleFor(item) {
  return item.data?.event || item.data?.subject || item.data?.title || item.data?.name || item.type
}

function descriptionFor(item) {
  return item.data?.body || item.data?.status || item.data?.priority || ''
}

export default function TimelineList({ items = [], loading = false, emptyLabel = 'No timeline logs yet.' }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => <div key={item} className="h-16 rounded-2xl bg-gray-50 animate-pulse" />)}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
          <Target className="h-6 w-6 text-gray-300" />
        </div>
        <h3 className="font-bold text-gray-900">{emptyLabel}</h3>
        <p className="text-sm text-gray-500 max-w-xs mt-1">New activity, record changes, and related work will appear here.</p>
      </div>
    )
  }

  return (
    <div className="relative pl-8 space-y-8">
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
      {items.map((item, index) => {
        const Icon = ICONS[item.type] || Activity
        return (
          <div key={`${item.type}-${item.data?.id || index}-${item.timestamp}`} className="relative">
            <div className="absolute -left-8 top-0 h-7 w-7 rounded-full bg-indigo-50 border-4 border-white flex items-center justify-center shadow-sm text-indigo-600">
              <Icon className="h-3 w-3" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
              </p>
              <h4 className="text-sm font-bold text-gray-900">{titleFor(item)}</h4>
              {descriptionFor(item) && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{descriptionFor(item)}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
