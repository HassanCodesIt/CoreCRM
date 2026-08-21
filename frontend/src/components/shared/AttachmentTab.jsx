import { useState, useEffect } from 'react'
import { File, Upload, Trash2, Download, Paperclip, X } from 'lucide-react'
import { attachmentsApi } from '../../api/attachments'
import toast from 'react-hot-toast'

export default function AttachmentTab({ referenceType, referenceId }) {
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetchAttachments = async () => {
    setLoading(true)
    try {
      const response = await attachmentsApi.list(referenceType, referenceId)
      setAttachments(response.data)
    } catch (error) {
      toast.error('Failed to load attachments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttachments()
  }, [referenceType, referenceId])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      await attachmentsApi.upload({
        file,
        reference_type: referenceType,
        reference_id: referenceId
      })
      toast.success('File uploaded successfully')
      fetchAttachments()
    } catch (error) {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return
    try {
      await attachmentsApi.delete(id)
      toast.success('Attachment deleted')
      setAttachments(prev => prev.filter(a => a.id !== id))
    } catch (error) {
      toast.error('Delete failed')
    }
  }

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Attachments</h3>
          <p className="text-sm text-gray-500 font-medium">Manage files and documents associated with this record.</p>
        </div>
        <label className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 cursor-pointer hover:bg-indigo-700 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload File'}
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
            <Paperclip className="h-6 w-6 text-gray-300" />
          </div>
          <h4 className="font-bold text-gray-900">No files attached</h4>
          <p className="text-sm text-gray-500 mt-1">Upload relevant documents, contracts or images.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {attachments.map((file) => (
            <div key={file.id} className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-all">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <File className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{file.filename}</p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-tight">
                    {formatSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={`${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${file.file_url || file.file_path}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button 
                    onClick={() => handleDelete(file.id)}
                    className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
