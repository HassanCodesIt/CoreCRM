export default function AIInsights({ insights }) {
  if (!insights) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-900">AI Lead Insights</h3>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-indigo-50 rounded-xl p-3">
          <div className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Conversion</div>
          <div className="text-lg font-black text-indigo-700">{insights.conversion_probability}%</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3">
          <div className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Best Time</div>
          <div className="text-xs font-bold text-emerald-700">{insights.best_contact_time}</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <div className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Channel</div>
          <div className="text-xs font-bold text-amber-700">{insights.preferred_channel}</div>
        </div>
      </div>
      <div>
        <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Recommended Actions</div>
        <ul className="space-y-1">
          {(insights.recommended_actions || []).map((item, i) => (
            <li key={i} className="text-sm text-gray-700">- {item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
