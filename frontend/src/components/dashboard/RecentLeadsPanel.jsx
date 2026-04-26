import { Briefcase, User, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STAGE_COLORS = {
  lead: 'bg-blue-50 text-blue-700 border-blue-100',
  prospect: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  qualified: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  negotiation: 'bg-amber-50 text-amber-700 border-amber-100',
  customer: 'bg-violet-50 text-violet-700 border-violet-100',
}

export default function RecentLeadsPanel({ leads = [] }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Recent Leads</h3>
          <p className="text-xs text-gray-500 font-medium">Last 10 potential customers</p>
        </div>
        <button 
          onClick={() => navigate('/contacts')}
          className="text-[10px] font-black text-indigo-600 uppercase hover:underline underline-offset-4 flex items-center gap-1"
        >
          View All <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest uppercase">Lead Name</th>
              <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest uppercase">Company</th>
              <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest uppercase">Source</th>
              <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest uppercase">Status</th>
              <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest uppercase">Assigned To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leads.map((lead) => (
              <tr 
                key={lead.id} 
                className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/contacts/${lead.id}`)}
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs ring-2 ring-white shadow-sm">
                      {lead.full_name?.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {lead.full_name}
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <span className="text-xs font-medium text-gray-500">{lead.company}</span>
                </td>
                <td className="py-4">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-tighter">{lead.lead_source || 'Web'}</span>
                </td>
                <td className="py-4">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STAGE_COLORS[lead.contact_stage] || STAGE_COLORS.lead}`}>
                    {lead.contact_stage}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-gray-200 border border-white shadow-sm flex items-center justify-center text-[8px] font-black">
                      {lead.owner_name?.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{lead.owner_name}</span>
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan="5" className="py-12 text-center text-gray-400 text-xs font-medium italic">
                  No recent leads to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
