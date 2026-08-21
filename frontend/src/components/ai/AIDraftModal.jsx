import { useState } from 'react'
import { X, Sparkles, Copy, Check, Send } from 'lucide-react'
import { aiApi } from '../../api/ai'
import toast from 'react-hot-toast'

export default function AIDraftModal({ isOpen, onClose, onApply, recipientId, recipientType }) {
  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState('professional')
  const [emailType, setEmailType] = useState('initial')
  const [extraContext, setExtraContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState(null)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) {
      toast.error('Please enter a prompt describing the email goal')
      return
    }

    setLoading(true)
    setDraft(null)
    try {
      const response = await aiApi.draftEmail(
        recipientId,
        recipientType,
        prompt,
        tone,
        emailType
      )
      setDraft(response.data)
      toast.success('Email draft generated!')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate email draft')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!draft) return
    const textToCopy = `Subject: ${draft.subject}\n\n${draft.body}`
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApply = () => {
    if (!draft) return
    onApply({
      subject: draft.subject,
      body: draft.body,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Email Draft Generator</h2>
              <p className="text-xs text-gray-500">Draft a hyper-personalized email based on prospect history</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">What is the goal of this email? *</label>
              <textarea
                required
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium resize-none"
                placeholder="e.g. Follow up after our discovery call and ask to schedule a demo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Type</label>
                <select
                  value={emailType}
                  onChange={e => setEmailType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer"
                >
                  <option value="initial">Initial outreach</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="demo">Demo request</option>
                  <option value="proposal">Proposal/Quote pitch</option>
                  <option value="nurture">Nurture</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tone of Voice</label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium appearance-none cursor-pointer"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Additional Context (Optional)</label>
              <input
                type="text"
                value={extraContext}
                onChange={e => setExtraContext(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 font-medium"
                placeholder="e.g. Mention that we offer a 15% discount if signed this week"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-lg shadow-indigo-100 transition-all"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating Draft...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate outreach email draft
                </>
              )}
            </button>
          </form>

          {/* Generated Result */}
          {draft && (
            <div className="border border-indigo-100 bg-indigo-50/20 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center pb-3 border-b border-indigo-50">
                <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">Generated Email Draft</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 font-medium text-sm text-gray-800">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase mr-2">Subject:</span>
                  <span className="font-bold text-gray-900">{draft.subject}</span>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed pt-2 border-t border-indigo-50/50">
                  {draft.body}
                </div>
              </div>

              <button
                onClick={handleApply}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all"
              >
                <Send className="h-4 w-4" />
                Apply to Log Activity Form
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
