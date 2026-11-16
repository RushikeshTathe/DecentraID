import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export default function ToastNotification({ toast, onClose }) {
  if (!toast) return null
  const Icon = toast.type === 'error' ? AlertCircle : CheckCircle2
  return <div className={`toast toast-${toast.type || 'success'}`} role="status"><Icon size={18} /><div><strong>{toast.title}</strong>{toast.message && <span>{toast.message}</span>}</div><button className="icon-button" onClick={onClose} aria-label="Dismiss notification"><X size={16} /></button></div>
}