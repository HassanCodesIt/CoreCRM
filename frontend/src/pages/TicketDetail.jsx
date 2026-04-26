import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  MessageSquare, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft, 
  MoreVertical,
  Calendar,
  Tag,
  Shield,
  Send,
  Paperclip
} from 'lucide-react'
import { ticketsApi } from '../api/tickets'
import toast from 'react-hot-toast'

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await ticketsApi.getById(id)
        setTicket(response.data)
      } catch (error) {
        toast.error('Failed to load ticket')
        navigate('/tickets')
      } finally {
        setLoading(false)
      }
    }
    fetchTicket()
  }, [id])

  const handleStatusUpdate = async (newStatus) => {
    try {
      await ticketsApi.updateStatus(id, { status: newStatus })
      setTicket({ ...ticket, status: newStatus })
      toast.success(`Ticket marked as ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  if (!ticket) return null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link to="/tickets" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" />
          Back to Tickets
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-gray-400">{ticket.ticket_number}</span>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {ticket.subject}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                  ticket.status === 'open' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                  ticket.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  {ticket.status === 'open' && <AlertCircle className="h-3 w-3" />}
                  {ticket.status === 'pending' && <Clock className="h-3 w-3" />}
                  {ticket.status === 'resolved' && <CheckCircle2 className="h-3 w-3" />}
                  {ticket.status}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  ticket.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {ticket.priority} Priority
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {ticket.status !== 'resolved' && (
              <button 
                onClick={() => handleStatusUpdate('resolved')}
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-sm shadow-lg shadow-emerald-100 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Resolved
              </button>
            )}
            <button className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-gray-600 shadow-sm transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content: Chat/Log */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
               <h2 className="font-bold text-gray-900 uppercase tracking-tighter text-xs">Conversation</h2>
               <span className="text-[10px] font-bold text-gray-400 uppercase">Total 3 messages</span>
            </div>
            
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
               {/* Initial Issue */}
               <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                     <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="space-y-2 max-w-[85%]">
                     <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">Customer</p>
                        <span className="text-[10px] font-bold text-gray-400">10:45 AM</span>
                     </div>
                     <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none text-sm text-gray-600 leading-relaxed border border-gray-100/50 shadow-sm">
                        {ticket.description}
                     </div>
                  </div>
               </div>

               {/* Agent Response */}
               <div className="flex gap-4 flex-row-reverse">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-100">
                     <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="space-y-2 max-w-[85%] flex flex-col items-end">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400">11:12 AM</span>
                        <p className="text-sm font-bold text-gray-900">Tech Support</p>
                     </div>
                     <div className="bg-indigo-600 p-4 rounded-2xl rounded-tr-none text-sm text-white leading-relaxed shadow-lg shadow-indigo-50 border border-indigo-500">
                        Hello! We've received your request and our engineering team is investigating the sync issue. We'll update you shortly.
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/30">
               <div className="relative bg-white border border-gray-200 rounded-3Xl focus-within:ring-2 focus-within:ring-indigo-100 transition-all p-2 shadow-sm">
                  <textarea 
                    placeholder="Type your reply..."
                    className="w-full h-24 p-3 bg-transparent border-none focus:ring-0 text-sm resize-none font-medium text-gray-700"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-2 px-2 pb-1">
                     <div className="flex items-center gap-3">
                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                           <Paperclip className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                           <Tag className="h-4 w-4" />
                        </button>
                     </div>
                     <button 
                       className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 transition-all"
                       disabled={!comment.trim()}
                     >
                        <Send className="h-3.5 w-3.5" />
                        SEND REPLY
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Metadata */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-6">
            <h2 className="font-bold text-gray-900 uppercase tracking-tighter text-xs mb-4">Ticket Details</h2>
            
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Assigned To</p>
                  <p className="text-sm font-bold text-gray-900">{ticket.assignee_name || 'Unassigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Tag className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Category</p>
                  <p className="text-sm font-bold text-white bg-indigo-500 px-2.5 py-0.5 rounded-lg text-[10px] w-fit mt-1 uppercase tracking-wider">
                     {ticket.category || 'General'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Created On</p>
                  <p className="text-sm font-bold text-gray-900">{new Date(ticket.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">SLA Status</p>
                  <p className="text-sm font-bold text-rose-600 underline underline-offset-4 decoration-rose-200 decoration-2">Due in 4 hours</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50">
               <button className="w-full py-3 bg-gray-50 text-gray-500 font-bold rounded-2xl text-xs hover:bg-gray-100 hover:text-gray-700 transition-all border border-gray-100">
                  Transfer Ticket
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
