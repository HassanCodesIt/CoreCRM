import { useState, useEffect, useRef } from 'react'
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
  Paperclip,
  X
} from 'lucide-react'
import { ticketsApi } from '../api/tickets'
import { activitiesApi } from '../api/activities'
import { attachmentsApi } from '../api/attachments'
import apiClient from '../api/client'
import TimelineList from '../components/shared/TimelineList'
import toast from 'react-hot-toast'

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const fileInputRef = useRef(null)

  const fetchTicket = async () => {
    try {
      const [response, timelineResponse] = await Promise.all([
        ticketsApi.getById(id),
        ticketsApi.getTimeline(id),
      ])
      setTicket(response.data)
      setTimeline(timelineResponse.data || [])
    } catch (error) {
      toast.error('Failed to load ticket')
      navigate('/tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [id])

  const handleStatusUpdate = async (newStatus) => {
    try {
      await ticketsApi.updateStatus(id, { status: newStatus })
      setTicket({ ...ticket, status: newStatus })
      const timelineResponse = await ticketsApi.getTimeline(id)
      setTimeline(timelineResponse.data || [])
      toast.success(`Ticket marked as ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const loadingToast = toast.loading('Uploading attachment...')
    try {
      const res = await attachmentsApi.upload({
        file,
        reference_type: 'ticket',
        reference_id: id,
      })
      setSelectedFiles(prev => [...prev, res.data])
      toast.success('Attachment uploaded', { id: loadingToast })
    } catch (err) {
      toast.error('Failed to upload attachment', { id: loadingToast })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeAttachedFile = async (fileId) => {
    try {
      await attachmentsApi.delete(fileId)
      setSelectedFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success('Attachment removed')
    } catch (err) {
      toast.error('Failed to remove attachment')
    }
  }

  const handleSendReply = async () => {
    if (!comment.trim()) return
    try {
      await activitiesApi.create({
        subject: 'Ticket Reply',
        body: comment,
        activity_type: 'note',
        entity_type: 'ticket',
        entity_id: id,
        ticket_id: id,
        is_completed: true,
        attachment_ids: selectedFiles.map(f => f.id),
      })
      toast.success('Reply sent successfully')
      setComment('')
      setSelectedFiles([])
      fetchTicket()
    } catch {
      toast.error('Failed to send reply')
    }
  }

  const handleTransferTicket = async () => {
    try {
      const res = await apiClient.get('/users/')
      const users = res.data?.items || []
      if (users.length === 0) {
        toast.error("No users found to transfer to")
        return
      }
      const userListStr = users.map((u, i) => `${i + 1}. ${u.full_name} (ID: ${u.id})`).join('\n')
      const selection = window.prompt(`Select user by number to transfer ticket to:\n\n${userListStr}`)
      if (!selection) return
      const idx = parseInt(selection) - 1
      if (idx >= 0 && idx < users.length) {
        const selectedUser = users[idx]
        await ticketsApi.assign(id, { owner_id: selectedUser.id })
        toast.success(`Ticket transferred to ${selectedUser.full_name}`)
        fetchTicket()
      } else {
        toast.error("Invalid selection")
      }
    } catch {
      toast.error("Failed to transfer ticket")
    }
  }

  const handleDeleteTicket = async () => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return
    try {
      await ticketsApi.delete(id)
      toast.success('Ticket deleted successfully')
      navigate('/tickets')
    } catch {
      toast.error('Failed to delete ticket')
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
            <button onClick={handleDeleteTicket} className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-rose-600 hover:bg-rose-50 shadow-sm transition-all" title="Delete Ticket">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
            <h2 className="font-bold text-gray-900 uppercase tracking-tighter text-xs mb-5">Timeline</h2>
            <TimelineList items={timeline} emptyLabel="No ticket timeline yet" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content: Chat/Log */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
               <h2 className="font-bold text-gray-900 uppercase tracking-tighter text-xs">Conversation</h2>
               <span className="text-[10px] font-bold text-gray-400 uppercase">Total {timeline.filter(t => t.type === 'activity').length + 1} messages</span>
            </div>
            
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
               {/* Initial Issue */}
               <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                     <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="space-y-2 max-w-[85%]">
                     <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">Customer</p>
                        <span className="text-[10px] font-bold text-gray-400">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                     <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none text-sm text-gray-600 leading-relaxed border border-gray-100/50 shadow-sm">
                        {ticket.description}
                     </div>
                  </div>
               </div>

               {/* Dynamically Rendered Replies */}
               {timeline
                  .filter((t) => t.type === 'activity')
                  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                  .map((reply, idx) => (
                     <div key={reply.data?.id || idx} className="flex gap-4 flex-row-reverse">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-100">
                           <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div className="space-y-2 max-w-[85%] flex flex-col items-end">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400">
                                 {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <p className="text-sm font-bold text-gray-900">Support Representative</p>
                           </div>
                           <div className="bg-indigo-600 p-4 rounded-2xl rounded-tr-none text-sm text-white leading-relaxed shadow-lg shadow-indigo-50 border border-indigo-500">
                              {reply.data?.body}
                           </div>
                        </div>
                     </div>
                  ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/30">
               <div className="relative bg-white border border-gray-200 rounded-3xl focus-within:ring-2 focus-within:ring-indigo-100 transition-all p-2 shadow-sm">
                  <textarea 
                    placeholder="Type your reply..."
                    className="w-full h-24 p-3 bg-transparent border-none focus:ring-0 text-sm resize-none font-medium text-gray-700"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-3 pb-2">
                      {selectedFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100">
                          <span className="truncate max-w-[150px]">{file.filename}</span>
                          <button onClick={() => removeAttachedFile(file.id)} className="p-0.5 text-gray-400 hover:text-rose-600 rounded-full hover:bg-indigo-100/50">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 px-2 pb-1">
                     <div className="flex items-center gap-3">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          onChange={handleFileChange} 
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                          title="Attach file"
                        >
                           <Paperclip className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                           <Tag className="h-4 w-4" />
                        </button>
                     </div>
                     <button 
                       onClick={handleSendReply}
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
               <button onClick={handleTransferTicket} className="w-full py-3 bg-gray-50 text-gray-500 font-bold rounded-2xl text-xs hover:bg-gray-100 hover:text-gray-700 transition-all border border-gray-100">
                  Transfer Ticket
               </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
            <h2 className="font-bold text-gray-900 uppercase tracking-tighter text-xs mb-5">Timeline</h2>
            <TimelineList items={timeline} emptyLabel="No ticket timeline yet" />
          </div>
        </div>
      </div>
    </div>
  )
}
