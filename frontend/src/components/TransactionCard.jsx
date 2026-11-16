import { useState } from 'react'
import { ArrowUpRight, CheckCircle2, Clock3, Copy } from 'lucide-react'
import { formatAddress } from '../utils/accessControl.js'
import { getTransactionUrl } from '../config/contract.js'

export default function TransactionCard({ event }) {
  const [copied, setCopied] = useState(false)
  const transactionUrl = event.hash ? getTransactionUrl(event.hash) : ''

  const copyHash = async () => {
    if (!event.hash) return
    try {
      await navigator.clipboard.writeText(event.hash)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return <article className="transaction-row"><div className="transaction-icon"><Clock3 size={17} /></div>
    <div className="transaction-main"><strong>{event.type}{event.role ? ` · ${event.role}` : ''}</strong><span>{formatAddress(event.address)}{event.hash && <> · <button type="button" className="hash-value hash-copy" title={event.hash} aria-label="Copy transaction hash" onClick={copyHash}>{formatAddress(event.hash, 10, 8)}<Copy size={10} /></button></>}{copied && <small className="hash-copied">Copied</small>}</span></div>
    <div className="transaction-meta">{event.blockNumber != null && <span>Block #{event.blockNumber}</span>}<span>{event.timestamp ? new Date(event.timestamp * 1000).toLocaleString() : 'Time unavailable'}</span><em className={event.status === 'Confirmed' ? 'confirmed' : 'mock-status'}><CheckCircle2 size={13} />{event.status}</em></div>
    {transactionUrl && <a className="icon-button explorer-link" href={transactionUrl} target="_blank" rel="noreferrer" aria-label="View transaction"><ArrowUpRight size={16} /></a>}
  </article>
}
