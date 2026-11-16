import { Check, CircleSlash } from 'lucide-react'

export default function StatusBadge({ active, label }) {
  return <span className={`status-badge ${active ? 'status-active' : 'status-inactive'}`}>
    {active ? <Check size={13} /> : <CircleSlash size={13} />}{label || (active ? 'Active' : 'Inactive')}
  </span>
}