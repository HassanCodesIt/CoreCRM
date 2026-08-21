import { useEffect, useState } from 'react'
import { GitMerge, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { contactsApi } from '../../api/contacts'
import { useMergeContacts } from '../../hooks/useContacts'

export function canMergeContacts(primaryId, selectedIds) {
  return Boolean(primaryId) && selectedIds.filter((id) => id !== primaryId).length > 0
}

export default function MergeContactsModal({ isOpen, onClose, contacts = [], onMerged }) {
  const [duplicateContacts, setDuplicateContacts] = useState([])
  const [loadingDuplicates, setLoadingDuplicates] = useState(false)
  const [primaryId, setPrimaryId] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const mergeContacts = useMergeContacts()

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const loadDuplicates = async () => {
      setLoadingDuplicates(true)
      setPrimaryId('')
      setSelectedIds([])
      try {
        const response = await contactsApi.getDuplicates()
        const ids = response.data?.duplicates || []
        const loadedById = new Map(contacts.map((contact) => [contact.id, contact]))
        const missingIds = ids.filter((id) => !loadedById.has(id))
        const loadedContacts = await Promise.all(
          missingIds.map(async (id) => {
            const contactResponse = await contactsApi.getById(id)
            return contactResponse.data
          })
        )
        loadedContacts.forEach((contact) => loadedById.set(contact.id, contact))
        const resolvedContacts = ids.map((id) => loadedById.get(id)).filter(Boolean)
        if (!cancelled) {
          setDuplicateContacts(resolvedContacts)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error('Failed to load duplicates')
          setDuplicateContacts([])
        }
      } finally {
        if (!cancelled) {
          setLoadingDuplicates(false)
        }
      }
    }
    loadDuplicates()
    return () => {
      cancelled = true
    }
  }, [contacts, isOpen])

  useEffect(() => {
    if (duplicateContacts.length > 0 && !primaryId) {
      const ids = duplicateContacts.map((contact) => contact.id)
      setPrimaryId(ids[0])
      setSelectedIds(ids)
    }
  }, [duplicateContacts, primaryId])

  if (!isOpen) return null

  const handleToggle = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
  }

  const handleMerge = async () => {
    const secondaryIds = selectedIds.filter((id) => id !== primaryId)
    if (!canMergeContacts(primaryId, selectedIds)) return
    try {
      await mergeContacts.mutateAsync({ primary_id: primaryId, secondary_ids: secondaryIds })
      toast.success('Contacts merged')
      onMerged?.()
      onClose()
    } catch (error) {
      toast.error('Merge failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Merge Contacts</h2>
              <p className="text-xs text-gray-500">{duplicateContacts.length} contacts in duplicate sets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {loadingDuplicates ? (
            <div className="space-y-3">
              {[1, 2].map((item) => <div key={item} className="h-14 rounded-2xl bg-gray-50 animate-pulse" />)}
            </div>
          ) : duplicateContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-gray-500">
              <Search className="h-7 w-7 text-gray-300 mb-3" />
              <p className="text-sm font-medium">No duplicate contacts found.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Merge</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {duplicateContacts.map((contact) => (
                    <tr key={contact.id} className={contact.id === primaryId ? 'bg-indigo-50/50' : 'bg-white'}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(contact.id)}
                          onChange={() => handleToggle(contact.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="radio"
                          checked={contact.id === primaryId}
                          onChange={() => {
                            setPrimaryId(contact.id)
                            setSelectedIds((prev) => prev.includes(contact.id) ? prev : [...prev, contact.id])
                          }}
                          className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{contact.first_name} {contact.last_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{contact.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{contact.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={!canMergeContacts(primaryId, selectedIds) || mergeContacts.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            <GitMerge className="h-4 w-4" />
            Merge
          </button>
        </div>
      </div>
    </div>
  )
}
