import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  variant?: 'default' | 'warning' | 'success' | 'gold'
  subtitle?: string
}

const variants = {
  default: {
    card: 'border-brand-border',
    icon: 'bg-brand-card text-brand-text-dim',
    value: 'text-brand-text',
  },
  warning: {
    card: 'border-red-800/40 bg-red-950/20',
    icon: 'bg-red-900/30 text-red-400',
    value: 'text-red-400',
  },
  success: {
    card: 'border-emerald-800/40 bg-emerald-950/20',
    icon: 'bg-emerald-900/30 text-emerald-400',
    value: 'text-emerald-400',
  },
  gold: {
    card: 'border-amber-800/40 bg-amber-950/10',
    icon: 'bg-amber-900/20 text-brand-gold',
    value: 'text-brand-gold',
  },
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
}: StatCardProps) {
  const style = variants[variant]

  return (
    <div
      className={`
        bg-brand-card border rounded-xl p-4 sm:p-5 flex items-start gap-3 overflow-hidden
        animate-fadeIn
        ${style.card}
      `}
    >
      <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 ${style.icon}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-xs font-medium text-brand-muted uppercase tracking-wider truncate">
          {title}
        </p>
        <p className={`text-lg sm:text-2xl font-semibold mt-1 truncate ${style.value}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-brand-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
