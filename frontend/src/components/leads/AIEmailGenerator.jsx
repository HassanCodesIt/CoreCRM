import { useState } from 'react'
import { Mail, Copy, Check, Sparkles } from 'lucide-react'
import { aiApi } from '../../api/ai'
import toast from 'react-hot-toast'

export default function AIEmailGenerator({ recipientId, recipientType = 'lead' }) {
  const [loading, setLoading] = useState(false)
  const [emailType, setEmailType] = useState('initial')
  const [tone, setTone] = useState('professional')
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const [copiedSubject, setCopiedSubject] = useState(false)
  const [copiedBody, setCopiedBody] = useState(false)

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a goal or details for the email')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await aiApi.draftEmail(recipientId, recipientType, prompt, tone, emailType)
      setResult(res.data)
      toast.success('Email draft generated!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate email')
    } finally {
      setLoading(false)
    }
  }

  const copy = async (text, type) => {
    await navigator.clipboard.writeText(text)
    if (type === 'subject') {
      setCopiedSubject(true)
      setTimeout(() => setCopiedSubject(false), 2000)
    } else {
      setCopiedBody(true)
      setTimeout(() => setCopiedBody(false), 2000)
    }
    toast.success('Copied to clipboard')
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-gray-900">AI Outreach Writer</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Goal / Context</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-100 font-medium resize-none"
            placeholder="e.g. follow up on our demo and propose meeting this Friday"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Type</label>
            <select
              value={emailType}
              onChange={e => setEmailType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs border-none focus:ring-2 focus:ring-indigo-100 font-bold text-gray-700 appearance-none cursor-pointer"
            >
              <option value="initial">Initial</option>
              <option value="follow_up">Follow-up</option>
              <option value="demo">Demo</option>
              <option value="proposal">Proposal</option>
              <option value="nurture">Nurture</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tone</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs border-none focus:ring-2 focus:ring-indigo-100 font-bold text-gray-700 appearance-none cursor-pointer"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-all"
      >
        {loading ? 'Generating draft...' : 'Generate Email'}
      </button>

      {result && (
        <div className="space-y-3 pt-3 border-t border-gray-50 animate-fadeIn">
          <div className="bg-gray-50 rounded-xl p-3 relative group">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Subject</div>
            <div className="text-xs font-bold text-gray-900 pr-8">{result.subject}</div>
            <button
              onClick={() => copy(result.subject, 'subject')}
              className="absolute right-2 top-2 p-1 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
            >
              {copiedSubject ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-3 relative group">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Body</div>
            <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed pr-8">{result.body}</div>
            <button
              onClick={() => copy(result.body, 'body')}
              className="absolute right-2 top-2 p-1 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
            >
              {copiedBody ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
