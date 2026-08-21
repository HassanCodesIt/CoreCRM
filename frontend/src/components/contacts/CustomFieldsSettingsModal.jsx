import { useState } from 'react'
import { X, Settings, Plus, Save } from 'lucide-react'
import { useContactCustomFields } from '../../hooks/useContacts'
import { contactsApi } from '../../api/contacts'
import toast from 'react-hot-toast'

const FIELD_TYPES = ['text', 'number', 'date', 'select']

export default function CustomFieldsSettingsModal({ isOpen, onClose }) {
  const { data: fields = [], isLoading, refetch } = useContactCustomFields()
  const [newField, setNewField] = useState({ name: '', type: 'text', options: '' })
  const [creating, setCreating] = useState(false)

  if (!isOpen) return null

  const handleCreateField = async (event) => {
    event.preventDefault()
    if (!newField.name.trim()) return
    setCreating(true)
    try {
      await contactsApi.createCustomField({
        name: newField.name.trim(),
        type: newField.type,
        options: newField.type === 'select'
          ? newField.options.split(',').map((option) => option.trim()).filter(Boolean)
          : null,
      })
      setNewField({ name: '', type: 'text', options: '' })
      await refetch()
      toast.success('Custom field created')
    } catch (error) {
      toast.error('Failed to create custom field')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Custom Fields</h2>
              <p className="text-sm text-gray-500">Add custom fields to track specific data on your contacts.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
          <form onSubmit={handleCreateField} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-[1fr_130px_1fr_auto] gap-3">
            <input
              value={newField.name}
              onChange={(event) => setNewField((prev) => ({ ...prev, name: event.target.value }))}
              className="px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100"
              placeholder="New field name"
            />
            <select
              value={newField.type}
              onChange={(event) => setNewField((prev) => ({ ...prev, type: event.target.value }))}
              className="px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100"
            >
              {FIELD_TYPES.map((type) => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
            </select>
            <input
              value={newField.options}
              onChange={(event) => setNewField((prev) => ({ ...prev, options: event.target.value }))}
              disabled={newField.type !== 'select'}
              className="px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
              placeholder="Options (comma separated)"
            />
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>

          <div>
            <h3 className="font-bold text-gray-900 mb-4">Existing Fields</h3>
            {isLoading ? (
               <div className="flex justify-center py-10">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
               </div>
            ) : fields.length > 0 ? (
               <div className="space-y-3">
                 {fields.map(field => (
                   <div key={field.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                     <div>
                       <h4 className="font-bold text-gray-900">{field.name}</h4>
                       <p className="text-xs text-gray-500 mt-1">
                         Type: <span className="font-medium text-gray-700">{field.type}</span>
                         {field.type === 'select' && field.options && ` • Options: ${field.options.join(', ')}`}
                       </p>
                     </div>
                   </div>
                 ))}
               </div>
            ) : (
               <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                 <p className="text-sm text-gray-500">No custom fields created yet.</p>
               </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
