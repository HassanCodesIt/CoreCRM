import { useState, useEffect } from 'react'
import { X, Users, AlertCircle, ArrowRight } from 'lucide-react'
import { contactsApi } from '../../api/contacts'
import toast from 'react-hot-toast'

export default function DuplicateMergeModal({ isOpen, onClose, onMergeComplete }) {
  const [loading, setLoading] = useState(false)
  const [duplicates, setDuplicates] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [primaryId, setPrimaryId] = useState('')

  useEffect(() => {
    if (isOpen) {
      findDuplicates()
    } else {
      setDuplicates([])
      setSelectedGroup(null)
    }
  }, [isOpen])

  const findDuplicates = async () => {
    setLoading(true)
    try {
      // Get all duplicates
      const res = await contactsApi.getDuplicates()
      const duplicateIds = res.data?.duplicates || []
      
      if (duplicateIds.length === 0) {
        setDuplicates([])
        setLoading(false)
        return
      }

      // Fetch the full contact details for the duplicate IDs
      // In a real app we might want an endpoint that returns the grouped details
      // For now we'll fetch them individually or use the getAll endpoint
      const contactsRes = await contactsApi.getAll({ limit: 1000 })
      const allContacts = contactsRes.data?.items || []
      
      // Group them simply by email or fuzzy name match
      const dupContacts = allContacts.filter(c => duplicateIds.includes(c.id))
      
      // Basic grouping logic for UI display
      const groups = []
      const processed = new Set()
      
      dupContacts.forEach(c1 => {
        if (processed.has(c1.id)) return
        const group = [c1]
        processed.add(c1.id)
        
        dupContacts.forEach(c2 => {
          if (c1.id !== c2.id && !processed.has(c2.id)) {
            // Group if email matches or name is exactly the same (simplistic group for UI)
            if ((c1.email && c1.email === c2.email) || 
                (c1.first_name === c2.first_name && c1.last_name === c2.last_name)) {
              group.push(c2)
              processed.add(c2.id)
            }
          }
        })
        if (group.length > 1) {
          groups.push(group)
        }
      })
      
      setDuplicates(groups)
    } catch (error) {
      toast.error('Failed to find duplicates')
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async () => {
    if (!selectedGroup || !primaryId) return
    
    const secondaryIds = selectedGroup.filter(c => c.id !== primaryId).map(c => c.id)
    if (secondaryIds.length === 0) return

    setLoading(true)
    try {
      await contactsApi.merge({ primary_id: primaryId, secondary_ids: secondaryIds })
      toast.success('Contacts merged successfully')
      setSelectedGroup(null)
      await findDuplicates()
      if (onMergeComplete) onMergeComplete()
    } catch (error) {
      toast.error('Failed to merge contacts')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Find & Merge Duplicates</h2>
              <p className="text-sm text-gray-500">Combine duplicate contact records into one.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {loading && !selectedGroup ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : selectedGroup ? (
            <div className="space-y-6">
              <button 
                onClick={() => setSelectedGroup(null)} 
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                ← Back to groups
              </button>
              
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Select Primary Contact</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    The primary contact will be kept. All related deals, tickets, and activities from the other contacts will be moved to the primary one. The other contacts will be deleted.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedGroup.map(contact => (
                  <div 
                    key={contact.id} 
                    onClick={() => setPrimaryId(contact.id)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      primaryId === contact.id 
                        ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50' 
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-sm">
                          {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{contact.first_name} {contact.last_name}</div>
                          <div className="text-xs text-gray-500">{contact.job_title || 'No Title'} • {contact.company || 'No Company'}</div>
                        </div>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        primaryId === contact.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                      }`}>
                        {primaryId === contact.id && <div className="h-2 w-2 bg-white rounded-full" />}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-t border-gray-100 pt-2">
                        <span className="text-gray-500">Email</span>
                        <span className="font-medium text-gray-900">{contact.email || '-'}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 pt-2">
                        <span className="text-gray-500">Phone</span>
                        <span className="font-medium text-gray-900">{contact.phone || '-'}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 pt-2">
                        <span className="text-gray-500">Created</span>
                        <span className="font-medium text-gray-900">{new Date(contact.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : duplicates.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 mb-4">Found {duplicates.length} potential duplicate group{duplicates.length > 1 ? 's' : ''}</h3>
              {duplicates.map((group, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex -space-x-3 overflow-hidden">
                    {group.map((c, i) => (
                      <div key={c.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 z-[1]">
                        {c.first_name?.charAt(0)}{c.last_name?.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {group[0].first_name} {group[0].last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {group.length} matching records found (similar names or emails)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedGroup(group)
                      setPrimaryId(group[0].id)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-100 transition-colors whitespace-nowrap"
                  >
                    Review & Merge
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-20 text-center">
               <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                 <Users className="h-8 w-8 text-emerald-500" />
               </div>
               <h3 className="text-lg font-bold text-gray-900">Your contacts look clean!</h3>
               <p className="text-gray-500 max-w-sm mt-2">We couldn't find any clear duplicates in your contact database right now.</p>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            {selectedGroup ? 'Cancel' : 'Close'}
          </button>
          {selectedGroup && (
            <button
              onClick={handleMerge}
              disabled={loading || !primaryId}
              className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100"
            >
              {loading ? 'Merging...' : 'Merge Selected'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
