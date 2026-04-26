import { useState } from 'react'
import { Mail, Copy } from 'lucide-react'
import { leadsApi } from '../../api/leads'
import toast from 'react-hot-toast'

export default function AIEmailGenerator({ leadId }) {
  const [loading, setLoading] = useState(false)
  const [emailType, setEmailType] = useState('initial')
  const [tone, setTone] = useState('professional')
  const [result, setResult] = useState(null)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await leadsApi.generateEmail(leadId, { email_type: emailType, tone })
      setResult(res.data)
    } catch (e) {
      toast.error('Failed to generate email')
    } finally {
      setLoading(false)
    }
  }

  const copy = async (text) => {
    await navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Mail className="h-4 w-4" /></div>
        <h3 className="text-sm font-bold text-gray-900">AI Email Generator</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={emailType} onChange={e => setEmailType(e.target.value)} className="px-3 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-100">
          <option value="initial">Initial</option>
          <option value="follow_up">Follow-up</option>
          <option value="demo">Demo</option>
          <option value="proposal">Proposal</option>
          <option value="nurture">Nurture</option>
        </select>
        <select value={tone} onChange={e => setTone(e.target.value)} className="px-3 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-100">
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="casual">Casual</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <button onClick={generate} disabled={loading} className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
        {loading ? 'Generating...' : 'Generate Email'}
      </button>
      {result && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Subject</div>
            <div className="text-sm font-semibold text-gray-900">{result.subject}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Body</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{result.body}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => copy(result.subject)} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Copy Subject</button>
            <button onClick={() => copy(result.body)} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Copy Body</button>
          </div>
        </div>
      )}
    </div>
  )
}
