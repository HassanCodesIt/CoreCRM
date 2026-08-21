import { useMemo, useRef, useState } from 'react'
import { Check, FileUp, Table, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useImportContacts } from '../../hooks/useContacts'

const CONTACT_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'lead_source', label: 'Lead Source' },
  { key: 'contact_stage', label: 'Stage' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'notes', label: 'Notes' },
]

export function isImportMappingValid(mapping) {
  return Boolean(mapping.first_name && mapping.last_name)
}

export default function ImportWizard({ isOpen, onClose, onImportSuccess }) {
  const fileInputRef = useRef(null)
  const { upload, confirm } = useImportContacts()
  const [step, setStep] = useState(1)
  const [uploadResult, setUploadResult] = useState(null)
  const [mapping, setMapping] = useState({})
  const [result, setResult] = useState(null)

  const headers = uploadResult?.headers || []
  const preview = uploadResult?.preview || []

  const mappedFields = useMemo(() => CONTACT_FIELDS.filter((field) => mapping[field.key]), [mapping])

  if (!isOpen) return null

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const response = await upload.mutateAsync(file)
      setUploadResult(response)
      setMapping(response.mapping || {})
      setStep(2)
    } catch (error) {
      toast.error('CSV upload failed')
    }
  }

  const handleConfirm = async () => {
    if (!isImportMappingValid(mapping)) return
    try {
      const response = await confirm.mutateAsync({ upload_id: uploadResult.upload_id, mapping })
      setResult(response)
      setStep(4)
      onImportSuccess?.()
      toast.success(`Imported ${response.created} contacts`)
    } catch (error) {
      toast.error('Import failed')
    }
  }

  const resetAndClose = () => {
    setStep(1)
    setUploadResult(null)
    setMapping({})
    setResult(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import Contacts</h2>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className={`h-1.5 rounded-full ${step >= item ? 'w-8 bg-indigo-600' : 'w-4 bg-gray-100'}`} />
              ))}
            </div>
          </div>
          <button onClick={resetAndClose} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
              <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-5">
                <FileUp className="h-7 w-7 text-indigo-500" />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700"
              >
                Choose CSV
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {CONTACT_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4 p-4 border border-gray-100 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{field.label} {field.required && <span className="text-rose-500">*</span>}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{mapping[field.key] || 'Skipped'}</p>
                  </div>
                  <select
                    value={mapping[field.key] || ''}
                    onChange={(event) => setMapping((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    className="min-w-48 px-3 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Skip</option>
                    {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Table className="h-5 w-5 text-indigo-500" />
                Preview
              </h3>
              <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {mappedFields.map((field) => (
                        <th key={field.key} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row, index) => (
                      <tr key={`${row.email || row.first_name || 'row'}-${index}`}>
                        {mappedFields.map((field) => (
                          <td key={field.key} className="px-4 py-3 text-sm text-gray-600 truncate max-w-48">{row[mapping[field.key]]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-8 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">{result?.created || 0} contacts imported</h3>
              <p className="text-sm text-gray-500 mt-1">{result?.skipped?.length || 0} rows skipped</p>
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          {step > 1 && step < 4 && (
            <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900">
              Back
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!isImportMappingValid(mapping)}
              className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
            >
              Preview
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleConfirm}
              disabled={confirm.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Confirm
            </button>
          )}
          {step === 4 && (
            <button onClick={resetAndClose} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
