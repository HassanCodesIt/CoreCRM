import apiClient from './client'

export const aiApi = {
  /**
   * Send a chat thread to the AI Copilot.
   * @param {Array<{role: string, content: string}>} messages
   * @param {string|null} context  - optional extra CRM context string
   */
  chat: (messages, context = null) =>
    apiClient.post('/ai/chat', { messages, context }),

  /**
   * Summarize a CRM record.
   * @param {'lead'|'contact'|'deal'|'account'} record_type
   * @param {string} record_id
   * @param {string|null} extra_context
   */
  summarizeRecord: (record_type, record_id, extra_context = null) =>
    apiClient.post('/ai/summarize-record', { record_type, record_id, extra_context }),
  /**
   * Fetch live CRM context snapshot (stats, hot leads, overdue tasks, closing deals).
   * The sidebar calls this on open to inject into the system prompt.
   */
  getContext: () => apiClient.get('/ai/context'),
  /**
   * Generate an outreach email draft with AI.
   */
  draftEmail: (recipient_id, recipient_type, prompt, tone = 'professional', email_type = 'initial') =>
    apiClient.post('/ai/email/draft', {
      recipient_id,
      recipient_type,
      prompt,
      tone,
      email_type
    }),
}
