import { useCallback, useEffect, useState } from 'react'
import { Activity as ActivityIcon, ArrowUpRight, RefreshCw } from 'lucide-react'
import { useWallet } from '../context/WalletContext.jsx'
import { getActivity } from '../services/blockchain.js'
import { getDemoActivity } from '../services/identityService.js'
import TransactionCard from '../components/TransactionCard.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { CONTRACT_CONFIGURED } from '../config/contract.js'

export default function Activity() {
  const { demoMode } = useWallet()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (demoMode) { setEvents(getDemoActivity()); return }
      if (!CONTRACT_CONFIGURED) { setEvents([]); return }
      setEvents(await getActivity())
    } catch (activityError) {
      setError(activityError.message)
    } finally {
      setLoading(false)
    }
  }, [demoMode])

  useEffect(() => { refresh() }, [refresh])

  const liveUnavailable = !demoMode && !CONTRACT_CONFIGURED

  return <main className="workspace-page"><header className="page-header"><div><div className="eyebrow"><span className="eyebrow-line" /> AUDIT TRAIL</div><h1>Blockchain activity</h1><p>Identity events recorded by IdentityAccessManager.</p></div><button className="button button-outline" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Refresh</button></header>
    {demoMode && <div className="notice notice-demo"><ActivityIcon size={17} /><div><strong>Sample activity</strong><span>These illustrative records are not transactions and have no transaction hashes.</span></div></div>}
    {liveUnavailable && <div className="notice notice-warn"><ActivityIcon size={17} /><div><strong>Live activity unavailable</strong><span>Configure a deployed contract address to read confirmed events.</span></div></div>}
    <section className="activity-panel"><div className="activity-panel-head"><div><h2>Recent events</h2><span>{events.length} {events.length === 1 ? 'event' : 'events'}</span></div><span className="activity-live"><i /> {demoMode ? 'SAMPLE' : liveUnavailable ? 'OFFLINE' : 'ON-CHAIN'}</span></div>
      {loading ? <div className="panel-loading"><LoadingSpinner label="Loading contract events" /></div> : error ? <div className="empty-state"><ActivityIcon size={23} /><strong>Could not load activity</strong><span>{error}</span></div> : liveUnavailable ? <div className="empty-state"><ActivityIcon size={23} /><strong>No live contract configured</strong><span>Set VITE_CONTRACT_ADDRESS to read confirmed identity events from the blockchain.</span></div> : events.length ? <div className="transaction-list">{events.map((event, index) => <TransactionCard key={`${event.hash || event.type}-${event.index ?? index}`} event={event} />)}</div> : <div className="empty-state"><ActivityIcon size={23} /><strong>No activity recorded</strong><span>Contract events will appear here after identities are registered or updated.</span></div>}
    </section><div className="activity-footnote"><span>Event records are read directly from the contract logs.</span><a href="https://ethereum.org/en/developers/docs/" target="_blank" rel="noreferrer">About Ethereum events <ArrowUpRight size={13} /></a></div>
  </main>
}
