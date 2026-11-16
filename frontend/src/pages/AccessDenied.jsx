import { ArrowLeft, Fingerprint, ShieldAlert } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext.jsx'
import WalletConnect from '../components/WalletConnect.jsx'

export default function AccessDenied() {
  const location = useLocation()
  const { isAuthenticated, identity, isOwner } = useWallet()
  let detail = 'Verify your wallet and confirm that your identity has an active, assigned role.'
  if (identity?.isRegistered && !identity.isActive) detail = 'This identity is inactive. Ask your institution administrator to restore access.'
  else if (isAuthenticated && !isOwner && identity?.roleName === 'NONE') detail = 'Your identity is registered but has no assigned role yet. Contact your administrator.'
  else if (location.state?.reason === 'account-changed') detail = 'Your wallet account changed. Sign a new challenge before opening protected pages.'
  else if (location.state?.reason === 'network-changed') detail = 'Your wallet network changed. Confirm the configured network and sign in again.'
  return <main className="denied-page"><Link className="brand denied-brand" to="/"><span className="brand-mark"><Fingerprint size={20} /></span><span>Decentra<span>ID</span></span></Link><section className="denied-content"><div className="denied-icon"><ShieldAlert size={25} /></div><div className="eyebrow"><span className="eyebrow-line" /> ACCESS CONTROL</div><h1>This area is<br />restricted.</h1><p>{detail}</p><div className="denied-actions"><Link className="button button-outline" to="/"><ArrowLeft size={15} /> Return home</Link>{!isAuthenticated && <WalletConnect />}</div><small>Access checks are based on the connected wallet and current contract state.</small></section></main>
}