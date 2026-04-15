interface BadgeProps {
  status: 'pago' | 'pendente' | 'parcial' | 'atrasado' | 'critico' | 'ok'
  label?: string
  className?: string
}

const statusConfig = {
  pago: {
    label: 'Pago',
    className: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40',
  },
  pendente: {
    label: 'Pendente',
    className: 'bg-amber-900/30 text-amber-400 border-amber-800/40',
  },
  parcial: {
    label: 'Parcial',
    className: 'bg-blue-900/30 text-blue-400 border-blue-800/40',
  },
  atrasado: {
    label: 'Atrasado',
    className: 'bg-red-900/30 text-red-400 border-red-800/40',
  },
  critico: {
    label: 'Estoque crítico',
    className: 'bg-red-900/30 text-red-400 border-red-800/40',
  },
  ok: {
    label: 'Em dia',
    className: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40',
  },
}

export default function Badge({ status, label, className = '' }: BadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {label ?? config.label}
    </span>
  )
}
