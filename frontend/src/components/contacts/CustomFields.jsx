import { useEffect, useMemo, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useContactCustomFields,
  useContactCustomValues,
  useUpdateContactCustomValues,
} from '../../hooks/useContacts'
import { contactsApi } from '../../api/contacts'

const FIELD_TYPES = ['text', 'number', 'date', 'select']

export function buildCustomValuePayload(fields, values) {
  return fields.map((field) => ({
    field_id: field.id,
    value: values[field.id] ?? '',
  }))
}

export default function CustomFields({ contactId }) {
  const { data: fields = [], isLoading: fieldsLoading, refetch } = useContactCustomFields()
  const { data: customValues = [], isLoading: valuesLoading } = useContactCustomValues(contactId)
  const updateValues = useUpdateContactCustomValues(contactId)
  const [values, setValues] = useState({})
  const [newField, setNewField] = useState({ name: '', type: 'text', options: '' })
  const [creating, setCreating] = useState(false)

  const savedValues = useMemo(() => {
    return customValues.reduce((acc, item) => {
      acc[item.field_id] = item.value || ''
      return acc
    }, {})
  }, [customValues])

  useEffect(() => {
    setValues(savedValues)
  }, [savedValues])

  const handleSave = async () => {
    try {
      await updateValues.mutateAsync(buildCustomValuePayload(fields, values))
      toast.success('Custom fields saved')
    } catch (error) {
      toast.error('Failed to save custom fields')
    }
  }

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

  if (fieldsLoading || valuesLoading) {
    return <div className="h-28 rounded-2xl bg-gray-50 animate-pulse" />
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-gray-900 uppercase tracking-tighter text-xs">Custom Fields</h3>
        {fields.length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={updateValues.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        )}
      </div>

      {fields.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field) => (
            <label key={field.id} className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{field.name}</span>
              {field.type === 'select' ? (
                <select
                  value={values[field.id] || ''}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field.id]: event.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select</option>
                  {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : (
                <input
                  type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                  value={values[field.id] || ''}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field.id]: event.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100"
                />
              )}
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
          No custom fields yet.
        </div>
      )}

      <form onSubmit={handleCreateField} className="grid grid-cols-1 sm:grid-cols-[1fr_130px_1fr_auto] gap-3 pt-4 border-t border-gray-100">
        <input
          value={newField.name}
          onChange={(event) => setNewField((prev) => ({ ...prev, name: event.target.value }))}
          className="px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100"
          placeholder="Field name"
        />
        <select
          value={newField.type}
          onChange={(event) => setNewField((prev) => ({ ...prev, type: event.target.value }))}
          className="px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100"
        >
          {FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input
          value={newField.options}
          onChange={(event) => setNewField((prev) => ({ ...prev, options: event.target.value }))}
          disabled={newField.type !== 'select'}
          className="px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
          placeholder="Options"
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
    </div>
  )
}
