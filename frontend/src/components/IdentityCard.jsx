import { BadgeCheck, Clock3, Copy, Fingerprint, WalletCards } from 'lucide-react'
import { useState } from 'react'
import RoleBadge from './RoleBadge.jsx'
import StatusBadge from './StatusBadge.jsx'
import { formatAddress } from '../utils/accessControl.js'

export default function IdentityCard({ address, identity, profile, demoMode = false }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(address); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { setCopied(false) }
  }
  return <section className="identity-card">
    <div className="identity-card-top"><div className="identity-symbol"><Fingerprint size={22} /></div><StatusBadge active={identity?.isActive && identity?.isRegistered} label={identity?.isActive ? 'Verified identity' : 'Not active'} /></div>
    <div className="identity-name"><h2>{profile?.name || 'Identity profile'}</h2><p>{profile?.department || 'Department not available'}</p></div>
    <div className="identity-details">
      <div><span><WalletCards size={14} /> Wallet</span><button className="copy-address" onClick={copy} title="Copy wallet address">{formatAddress(address, 9, 7)}<Copy size={13} /></button></div>
      <div><span><BadgeCheck size={14} /> Assigned role</span><RoleBadge role={identity?.roleName || 'NONE'} /></div>
      <div><span><Clock3 size={14} /> Registered</span><strong>{identity?.registeredAt ? new Date(identity.registeredAt * 1000).toLocaleDateString() : 'Not registered'}</strong></div>
    </div>
    {copied && <span className="copy-note">Address copied</span>}
    {demoMode && <p className="quiet-note">Sample identity · not read from a blockchain</p>}
  </section>
}