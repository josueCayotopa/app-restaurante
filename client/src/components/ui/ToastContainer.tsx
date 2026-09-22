import { useToastStore, type Toast } from '../../store/toastStore'
import { X, ChefHat, Beer, CheckCircle, AlertCircle, Info } from 'lucide-react'

const TOAST_CONFIG = {
  cocina: {
    bg: 'bg-orange-500',
    border: 'border-orange-400',
    icon: ChefHat,
    label: 'COCINA',
  },
  bar: {
    bg: 'bg-amber-500',
    border: 'border-amber-400',
    icon: Beer,
    label: 'BAR',
  },
  success: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-400',
    icon: CheckCircle,
    label: '',
  },
  error: {
    bg: 'bg-red-500',
    border: 'border-red-400',
    icon: AlertCircle,
    label: '',
  },
  info: {
    bg: 'bg-steel-500',
    border: 'border-steel-400',
    icon: Info,
    label: '',
  },
}

function ToastItem({ toast }: { toast: Toast }) {
  const eliminar = useToastStore((s) => s.eliminar)
  const cfg = TOAST_CONFIG[toast.tipo]
  const Icon = cfg.icon

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-white w-80 ${cfg.bg} ${cfg.border} animate-slide-in`}>
      <div className="shrink-0 mt-0.5">
        <Icon size={20} className="text-white/90" />
      </div>
      <div className="flex-1 min-w-0">
        {cfg.label && (
          <p className="text-xs font-bold tracking-widest opacity-80 mb-0.5">{cfg.label}</p>
        )}
        <p className="text-sm font-bold leading-tight">{toast.titulo}</p>
        <p className="text-xs opacity-80 mt-0.5 leading-tight">{toast.mensaje}</p>
      </div>
      <button
        onClick={() => eliminar(toast.id)}
        className="shrink-0 p-0.5 hover:opacity-70 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
