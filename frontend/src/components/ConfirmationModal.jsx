import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmationModal({ title, children, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onClose }) {
  if (!title) return null
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}><section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button><div className={`modal-icon ${danger ? 'modal-danger' : ''}`}><AlertTriangle size={21} /></div><h2 id="modal-title">{title}</h2><div className="modal-copy">{children}</div>
    <div className="modal-actions"><button className="button button-quiet" onClick={onClose} disabled={busy}>Cancel</button><button className={`button ${danger ? 'button-danger' : 'button-primary'}`} onClick={onConfirm} disabled={busy}>{busy ? 'Waiting for wallet…' : confirmLabel}</button></div>
  </section></div>
}