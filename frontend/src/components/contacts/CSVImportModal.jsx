import { useState, useRef } from 'react'
import { X, Upload, Check, AlertCircle, ArrowRight, Table } from 'lucide-react'
import { contactsApi } from '../../api/contacts'
import toast from 'react-hot-toast'

const CONTACT_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'job_title', label: 'Job Title', required: false },
  { key: 'lead_source', label: 'Source', required: false },
  { key: 'contact_stage', label: 'Stage', required: false },
]

export default function CSVImportModal({ isOpen, onClose, onImportSuccess }) {
  const [step, setStep] = useState(1) // 1: Upload, 2: Mapping, 3: Preview, 4: Result
  const [file, setFile] = useState(null)
  const [headers, setHeaders] = useState([])
  const [previewData, setPreviewData] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    setFile(selectedFile)
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length > 0) {
        const csvHeaders = lines[0].split(',').map(h => h.trim())
        setHeaders(csvHeaders)
        
        // Initial auto-mapping
        const initialMapping = {}
        CONTACT_FIELDS.forEach(field => {
          const match = csvHeaders.find(h => 
            h.toLowerCase().includes(field.key.toLowerCase()) || 
            h.toLowerCase().includes(field.label.toLowerCase())
          )
          if (match) initialMapping[field.key] = match
        })
        setMapping(initialMapping)

        // Preview records
        const records = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim())
          const obj = {}
          csvHeaders.forEach((h, i) => obj[h] = values[i])
          return obj
        })
        setPreviewData(records)
        setStep(2)
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleStartImport = async () => {
    setImporting(true)
    try {
      // Parse full file
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target.result
        const lines = text.split('\n').filter(line => line.trim())
        const csvHeaders = lines[0].split(',').map(h => h.trim())
        
        const contacts = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          const obj = {}
          CONTACT_FIELDS.forEach(field => {
            const csvHeader = mapping[field.key]
            if (csvHeader) {
              const index = csvHeaders.indexOf(csvHeader)
              obj[field.key] = values[index] || ''
            }
          })
          return obj
        }).filter(c => c.first_name && c.last_name)

        await contactsApi.import({ contacts })
        toast.success(`Imported ${contacts.length} contacts`)
        onImportSuccess()
        onClose()
      }
      reader.readAsText(file)
    } catch (error) {
      toast.error('Import failed')
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Import Contacts</h2>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step >= s ? 'w-8 bg-indigo-600' : 'w-4 bg-gray-100'}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
              <div className="h-20 w-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                <Upload className="h-8 w-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Upload your CSV file</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-xs text-center">Make sure your file contains at least first name and last name columns.</p>
              <button 
                onClick={() => fileInputRef.current.click()}
                className="mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:scale-105 transition-transform"
              >
                Choose File
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3">
                <AlertCircle className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                <p className="text-sm text-indigo-700 font-medium">Map your CSV columns to the corresponding CRM fields.</p>
              </div>

              <div className="space-y-4">
                {CONTACT_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${mapping[field.key] ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                        {mapping[field.key] ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{field.label} {field.required && <span className="text-rose-500">*</span>}</p>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">{mapping[field.key] || 'Not Mapped'}</p>
                      </div>
                    </div>
                    <select 
                      className="text-xs font-bold bg-gray-50 border-none rounded-xl py-2 pl-3 pr-8 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                      value={mapping[field.key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    >
                      <option value="">Skip Field</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Table className="h-5 w-5 text-indigo-500" />
                Preview First 5 Records
              </h3>
              <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {CONTACT_FIELDS.filter(f => mapping[f.key]).map(f => (
                        <th key={f.key} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((row, i) => (
                      <tr key={i}>
                        {CONTACT_FIELDS.filter(f => mapping[f.key]).map(f => (
                          <td key={f.key} className="px-4 py-3 text-sm text-gray-600 font-medium truncate max-w-[150px]">
                            {row[mapping[f.key]]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back
            </button>
          )}
          {step === 2 && (
            <button 
              onClick={() => setStep(3)}
              disabled={!mapping.first_name || !mapping.last_name}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-100 hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              Continue to Preview
            </button>
          )}
          {step === 3 && (
            <button 
              onClick={handleStartImport}
              disabled={importing}
              className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-100 hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              {importing ? 'Importing...' : 'Start Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
