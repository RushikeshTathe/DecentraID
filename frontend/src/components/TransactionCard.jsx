import { ArrowUpRight, CheckCircle2, Clock3 } from 'lucide-react'
import { formatAddress } from '../utils/accessControl.js'
import { getTransactionUrl } from '../config/contract.js'

export default function TransactionCard({ event }) {
  const transactionUrl = event.hash ? getTransactionUrl(event.hash) : ''
  return <article className="transaction-row"><div className="transaction-icon"><Clock3 size={17} /></div>
    <div className="transaction-main"><strong>{event.type}{event.role ? ` · ${event.role}` : ''}</strong><span>{formatAddress(event.address)}{event.hash && <> · <span className="hash-value">{formatAddress(event.hash, 10, 8)}</span></>}</span></div>
    <div className="transaction-meta"><span>{event.timestamp ? new Date(event.timestamp * 1000).toLocaleString() : 'Time unavailable'}</span><em className={event.status === 'Confirmed' ? 'confirmed' : 'mock-status'}><CheckCircle2 size={13} />{event.status}</em></div>
    {transactionUrl && <a className="icon-button explorer-link" href={transactionUrl} target="_blank" rel="noreferrer" aria-label="View transaction"><ArrowUpRight size={16} /></a>}
  </article>
}