import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'

const COLORS = ['#6366f1', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6']

export function buildFunnelRows(stages = []) {
  return stages.map((stage, index) => {
    const prevCount = index > 0 ? stages[index - 1].count : null
    const conversion = prevCount && prevCount > 0
      ? `${Math.round((stage.count / prevCount) * 100)}%`
      : null

    return {
      ...stage,
      label: conversion ? `${conversion} ->` : '',
    }
  })
}

export default function StageFunnelChart({ stages = [] }) {
  const formattedData = buildFunnelRows(stages)

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 ring-4 ring-gray-50/50">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.stage_name}</p>
          <p className="text-xl font-black text-indigo-600 tracking-tighter">{payload[0].value} <span className="text-sm text-gray-400">Deals</span></p>
          {item.conversion_rate != null && (
            <p className="text-xs font-bold text-violet-600 mt-1">{Math.round(item.conversion_rate)}% conversion</p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Stage Funnel</h3>
          <p className="text-xs text-gray-500 font-medium">Deal conversion by stage</p>
        </div>
      </div>

      {formattedData.length === 0 ? (
        <div className="h-[300px] w-full flex items-center justify-center rounded-2xl bg-gray-50 text-sm font-bold text-gray-400">
          No funnel data yet
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={formattedData}
              margin={{ top: 5, right: 80, left: 40, bottom: 5 }}
              barSize={40}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="stage_name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" radius={[0, 20, 20, 0]}>
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList
                  dataKey="label"
                  position="right"
                  style={{ fill: '#8b5cf6', fontSize: 12, fontWeight: 900 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
