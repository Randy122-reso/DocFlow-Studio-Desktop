import { useEffect } from 'react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import { useFileStore } from '../store/fileStore'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

export function Toast() {
  const toast = useFileStore((state) => state.toast)
  const dismiss = useFileStore((state) => state.dismissToast)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => dismiss(toast.id), 4200)
    return () => window.clearTimeout(timer)
  }, [toast, dismiss])

  if (!toast) return null
  const Icon = ICONS[toast.kind]

  return (
    <div className={`toast toast-${toast.kind}`} role="status">
      <Icon size={18} />
      <div className="toast-copy">
        <strong>{toast.message}</strong>
        {toast.detail && <span title={toast.detail}>{toast.detail}</span>}
      </div>
      <button type="button" onClick={() => dismiss(toast.id)} title="Dismiss">
        <X size={14} />
      </button>
    </div>
  )
}
