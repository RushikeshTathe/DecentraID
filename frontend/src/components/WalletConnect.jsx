import { useState } from 'react'
import { ChevronDown, LogOut, ShieldCheck, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext.jsx'
import { formatAddress, getHomeForRole } from '../utils/accessControl.js'

export default function WalletConnect({ compact = false }) {
  const { account, isAuthenticated, identity, isOwner, busy, connectWallet, authenticate, disconnectWallet, setError } = useWallet()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const signIn = async () => {
    try { navigate(getHomeForRole(await authenticate())) }
    catch (error) { setError(error.code === 4001 ? 'Signature request was rejected in MetaMask.' : error.message) }
  }
  if (!account) return <button className={`button button-primary wallet-button${compact ? ' compact-button' : ''}`} onClick={() => connectWallet().catch((error) => setError(error.code === 4001 ? 'Wallet connection was rejected in MetaMask.' : error.message))}><Wallet size={16} /> Connect wallet</button>
  if (!isAuthenticated) return <div className="wallet-actions"><span className="connected-label"><span className="online-dot" />{formatAddress(account)}</span><button className={`button button-primary${compact ? ' compact-button' : ''}`} onClick={signIn} disabled={busy}><ShieldCheck size={16} />{busy ? 'Verify in wallet…' : 'Verify ownership'}</button></div>
  return <div className="wallet-menu-wrap"><button className="wallet-menu-button" onClick={() => setOpen(!open)} aria-expanded={open}><span className="online-dot" />{formatAddress(account)}<ChevronDown size={15} /></button>
    {open && <div className="wallet-dropdown"><span className="dropdown-role">{isOwner ? 'Administrator' : identity?.roleName}</span><button onClick={() => { disconnectWallet(); setOpen(false) }}><LogOut size={15} /> Disconnect</button></div>}
  </div>
}