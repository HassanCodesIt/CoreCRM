import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'

export default function DataTable({ 
  columns, 
  data, 
  loading, 
  total, 
  page, 
  limit, 
  onPageChange,
  onRowClick,
  onSort,
  selectedIds = [],
  onSelectRow,
  onSelectAll
}) {
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => onSort?.(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.sortable && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              // Skeleton rows
              Array.from({ length: limit }).map((_, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr 
                  key={row.id || rowIdx} 
                  className={`${selectedIds.includes(row.id) ? 'bg-indigo-50/30' : 'hover:bg-gray-50'} transition-colors cursor-pointer`}
                  onClick={() => onRowClick?.(row)}
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => onSelectRow?.(row.id)}
                    />
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
          <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
          <span className="font-medium">{total}</span> results
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page === 1 || loading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page === totalPages || loading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
