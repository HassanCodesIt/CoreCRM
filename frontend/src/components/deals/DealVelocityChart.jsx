import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'

const COLORS = ['#6366f1', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6']

export function buildVelocityRows(pipelines = []) {
  const rows = []
  pipelines.forEach(p => {
    p.stages?.forEach(s => {
      rows.push({
        stage: s.stage_name,
        avg_days: s.avg_days,
        pipeline: p.pipeline_name,
      })
    })
  })
  return rows
}

export default function DealVelocityChart({ data = [] }) {
  const rows = buildVelocityRows(data)

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{payload[0].payload.stage}</p>
          <p className="text-xl font-black text-indigo-600 tracking-tighter">{payload[0].value} <span className="text-sm text-gray-400">days avg</span></p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Deal Velocity</h3>
          <p className="text-xs text-gray-500 font-medium">Average days per stage</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="h-[300px] w-full flex items-center justify-center rounded-2xl bg-gray-50 text-sm font-bold text-gray-400">
          No velocity data yet
        </div>
      ) : (
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={rows}
            margin={{ top: 5, right: 40, left: 80, bottom: 5 }}
            barSize={32}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="stage"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
              width={120}
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="avg_days" radius={[0, 20, 20, 0]}>
              {rows.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList
                dataKey="avg_days"
                position="right"
                style={{ fill: '#6366f1', fontSize: 12, fontWeight: 900 }}
                formatter={(v) => `${v}d`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  )
}
