import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, X, Send, Loader2, Bot, User, RotateCcw,
  Zap, RefreshCw, TrendingUp, AlertCircle, Calendar,
  DollarSign, Users, Flame, CheckCircle2, ChevronDown,
} from 'lucide-react'
import { aiApi } from '../../api/ai'

// ─── Quick action chips ───────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: 'Who to call today?', prompt: 'Based on my CRM data, which leads should I prioritize calling today and why?' },
  { label: 'Pipeline health', prompt: 'How healthy is my current pipeline? What should I be worried about?' },
  { label: 'Hot leads', prompt: 'Tell me about my hottest leads right now. What are the best next steps for each?' },
  { label: 'Overdue tasks', prompt: 'I have overdue activities — help me triage them by urgency.' },
  { label: 'Closing deals', prompt: 'What do I need to do to close my deals before their expected close dates?' },
  { label: 'Follow-up email', prompt: 'Write me a short, friendly follow-up email for a lead that went quiet after our demo.' },
]

// ─── Stat chip component ──────────────────────────────────────────────────────
function StatChip({ icon: Icon, label, value, alert }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl shrink-0"
      style={{
        background: alert ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${alert ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.2)'}`,
      }}
    >
      <Icon className={`h-3.5 w-3.5 ${alert ? 'text-red-400' : 'text-indigo-400'}`} />
      <div>
        <div className={`text-xs font-bold ${alert ? 'text-red-300' : 'text-white'}`}>{value}</div>
        <div className="text-[10px] text-indigo-400 leading-none">{label}</div>
      </div>
    </div>
  )
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
function MsgContent({ text }) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-size:0.85em">$1</code>')
    .replace(/^• /gm, '&nbsp;• ')
    .replace(/\n/g, '<br/>')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AICopilotSidebar({ isOpen, onClose }) {
  // Sidebar resizing
  const [sidebarWidth, setSidebarWidth] = useState(384)
  const [isResizing, setIsResizing] = useState(false)
  const startResizing = (e) => {
    e.preventDefault()
    setIsResizing(true)
  }
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      setSidebarWidth((prev) => Math.max(300, prev - e.movementX))
    }
    const handleMouseUp = () => setIsResizing(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm **CoreCRM Copilot** ✨\n\nI'm loading your live CRM data so I can give you specific, data-driven answers about your pipeline, leads, and tasks…",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)
  const [crmContext, setCrmContext] = useState(null)   // raw context object
  const [contextText, setContextText] = useState('')   // string injected into chat
  const [error, setError] = useState(null)
  const [contextError, setContextError] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // ── Load CRM context whenever the sidebar opens ──────────────────────────
  const loadContext = useCallback(async () => {
    setContextLoading(true)
    setContextError(false)
    try {
      const { data } = await aiApi.getContext()
      setCrmContext(data)
      setContextText(data.context_text)
      // Replace the greeting once we have data
      setMessages([
        {
          role: 'assistant',
          content:
            `Hi **${data.user_name}**! I've loaded your live CRM data 🚀\n\n` +
            `Here's what I see right now:\n` +
            `• **${data.stats.open_leads}** open leads (${data.stats.hot_leads_count} hot 🔥)\n` +
            `• **${data.stats.open_deals}** open deals — $${Number(data.stats.pipeline_value_usd).toLocaleString()} pipeline\n` +
            `• **${data.stats.overdue_activities}** overdue tasks need attention\n` +
            `• **${data.stats.deals_closing_this_week}** deals closing this week\n\n` +
            `Ask me anything — I know your actual data!`,
        },
      ])
    } catch {
      setContextError(true)
      setMessages([
        {
          role: 'assistant',
          content:
            "Hi! I'm **CoreCRM Copilot** ✨\n\nI couldn't load your live CRM data right now, but I can still help with sales strategy, best practices, and general CRM advice. Ask me anything!",
        },
      ])
    } finally {
      setContextLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadContext()
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [isOpen, loadContext])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return

    setInput('')
    setError(null)

    const userMsg = { role: 'user', content }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setLoading(true)

    try {
      const thread = nextMessages.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const { data } = await aiApi.chat(thread, contextText || null)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Failed to reach AI. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: crmContext
          ? `Chat reset! I still have your live CRM data loaded. What would you like to know?`
          : "Chat reset! How can I help you?",
      },
    ])
    setError(null)
    setInput('')
  }

  // ─── Stats strip data ──────────────────────────────────────────────────────
  const stats = crmContext?.stats

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Slide-in / Floating panel */}
      <aside
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(120%)',
          opacity: isOpen ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
          boxShadow: '0 20px 50px rgba(99, 102, 241, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)',
          width: '380px',
        }}
        className="fixed bottom-6 right-6 h-[680px] max-h-[85vh] z-50 flex flex-col bg-white rounded-[2rem] border border-gray-150 overflow-hidden"
        aria-label="AI Copilot"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 relative">
              <Sparkles className="h-5 w-5 text-white" />
              {contextLoading && (
                <span
                  className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2"
                  style={{
                    borderColor: '#6366f1',
                    background: '#f59e0b',
                    animation: 'pulse 1s ease-in-out infinite',
                  }}
                />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">AI Copilot</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-black tracking-widest text-indigo-100 uppercase">ALWAYS ACTIVE • V2.4</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadContext}
              disabled={contextLoading}
              title="Refresh CRM data"
              className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${contextLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-full bg-white/15 text-white hover:bg-white/25 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Message thread ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-gray-50/50 scroll-smooth">
          
          {/* Proactive Warning Alert Card (Embedded at top of feed) */}
          {crmContext && (
            <div className="bg-[#f5f3ff] border border-indigo-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Flame className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 leading-relaxed">
                    {crmContext.stats.overdue_activities || 3} high-probability deals are rotting. Click to draft invite for stakeholders.
                  </p>
                  <button 
                    onClick={() => sendMessage("Draft an email invite to follow up on the rotting deals.")} 
                    className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mt-2 hover:underline flex items-center gap-1"
                  >
                    View Deals &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isAI = msg.role === 'assistant'
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            
            return (
              <div key={i} className="space-y-1">
                {/* Sender badge */}
                <div className={`flex text-[8px] font-bold text-gray-400 uppercase tracking-widest px-1 ${!isAI ? 'justify-end' : 'justify-start'}`}>
                  {isAI ? `AI COPILOT • ${timestamp}` : `YOU • ${timestamp}`}
                </div>

                <div className={`flex gap-3 ${!isAI ? 'justify-end' : 'justify-start'}`}>
                  {/* Bubble */}
                  <div
                    className="max-w-[85%] px-4 py-3 text-xs leading-relaxed font-medium"
                    style={{
                      background: isAI ? '#f5f3ff' : '#f3f4f6',
                      border: isAI ? '1px solid #e0e7ff' : 'none',
                      color: '#374151',
                      borderRadius: isAI ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                    }}
                  >
                    <MsgContent text={msg.content} />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="space-y-1">
              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest px-1">
                AI COPILOT • Typing...
              </div>
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 flex items-center gap-1.5 bg-[#f5f3ff] border border-e0e7ff"
                  style={{ borderRadius: '4px 18px 18px 18px' }}
                >
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-2 w-2 rounded-full bg-indigo-400"
                      style={{ animation: `copilot-bounce 1.2s ease-in-out ${d * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error toast */}
          {error && (
            <div className="text-xs px-3 py-2 rounded-xl text-center flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-100">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input & Quick Actions Area ───────────────────────────────────── */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2 bg-[#f5f3ff]/50 border border-indigo-50 rounded-full pl-5 pr-2 py-1.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI Copilot..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent outline-none resize-none text-xs text-gray-700 placeholder-indigo-300 py-2 leading-relaxed"
              style={{ maxHeight: '80px', overflowY: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="p-2 rounded-full transition-all shrink-0 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 shadow-md shadow-indigo-100"
            >
              {loading ? (
                <Loader2 className="h-4.5 w-4.5 text-white animate-spin" />
              ) : (
                <Send className="h-4.5 w-4.5 text-white" />
              )}
            </button>
          </div>
          
          {/* Quick Action Chips */}
          <div className="flex gap-2 justify-center mt-3 flex-wrap">
            {[
              { label: 'Draft email', prompt: 'Write me a short, friendly follow-up email for a lead.' },
              { label: 'Summarize meeting', prompt: 'Can you summarize my recent meetings and outcomes?' },
              { label: 'Check pipeline', prompt: 'Analyze my sales pipeline and identify any rotting deals.' }
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.prompt)}
                disabled={loading || contextLoading}
                className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 rounded-full px-3 py-1 transition-all disabled:opacity-40 shadow-sm"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes copilot-bounce {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
