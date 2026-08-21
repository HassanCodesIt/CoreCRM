import { Skull } from 'lucide-react'

export default function RottenBadge({ isRotting }) {
  if (!isRotting) return null

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider">
      <Skull className="h-3 w-3" />
      Rotting
    </span>
  )
}
