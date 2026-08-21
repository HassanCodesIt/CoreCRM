import { Trophy, Medal, User, TrendingUp } from 'lucide-react'

export default function LeaderboardWidget({ reps = [] }) {
  const repsData = reps?.items || reps || []
  
  const getRankStyle = (index) => {
    switch(index) {
      case 0: return 'bg-amber-100 text-amber-600 ring-amber-50'
      case 1: return 'bg-slate-100 text-slate-500 ring-slate-50'
      case 2: return 'bg-orange-100 text-orange-600 ring-orange-50'
      default: return 'bg-gray-50 text-gray-400 ring-gray-100'
    }
  }

  const getTrophy = (index) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-amber-500" />
    if (index < 3) return <Medal className="h-4 w-4 text-gray-400" />
    return null
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Performance Ranking</h3>
          <p className="text-xs text-gray-500 font-medium">Top closing agents this month</p>
        </div>
        <TrendingUp className="h-5 w-5 text-indigo-500" />
      </div>

      <div className="space-y-6 flex-1">
        {repsData.map((rep, index) => (
          <div key={rep.user_id} className="flex items-center gap-4 group">
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-black ring-4 shadow-sm ${getRankStyle(index)} transition-transform group-hover:scale-110`}>
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 truncate tracking-tight">{rep.full_name}</span>
                  {getTrophy(index)}
               </div>
               <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1">
                     <span className="text-[10px] font-black text-indigo-600 uppercase tabular-nums">
                        {rep.won_count || rep.deal_count || 0} Deals
                     </span>
                  </div>
                  <div className="h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                     <div 
                        className="bg-indigo-500 h-full rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                        style={{ width: `${Math.min(((rep.won_count || rep.deal_count || 0) / 10) * 100, 100)}%` }} 
                     />
                  </div>
               </div>
            </div>

            <div className="text-right">
               <p className="text-sm font-black text-gray-900 tabular-nums">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(rep.total_value || 0)}
               </p>
               <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Revenue</p>
            </div>
          </div>
        ))}

        {repsData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
             <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <Trophy className="h-6 w-6 text-gray-200" />
             </div>
             <p className="text-xs font-semibold text-gray-400 italic">No closings recorded yet this month.</p>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-50">
         <button className="w-full py-3 bg-gray-50 rounded-2xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 hover:text-gray-900 transition-all">
            Full Leaderboard
         </button>
      </div>
    </div>
  )
}
