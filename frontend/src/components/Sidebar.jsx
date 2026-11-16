import { Activity, BadgeCheck, BookOpen, Fingerprint, GraduationCap, LayoutDashboard, LogOut, Search, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useWallet } from '../context/WalletContext.jsx'

const links = {
  ADMIN: [{ to: '/admin', label: 'Overview', icon: LayoutDashboard }, { to: '/activity', label: 'Blockchain activity', icon: Activity }, { to: '/verify', label: 'Verify identity', icon: Search }],
  STUDENT: [{ to: '/student', label: 'My identity', icon: LayoutDashboard }, { to: '/verify', label: 'Verify identity', icon: Search }],
  FACULTY: [{ to: '/faculty', label: 'My identity', icon: LayoutDashboard }, { to: '/verify', label: 'Verify identity', icon: Search }],
}

export default function Sidebar({ role }) {
  const { disconnectWallet, demoMode } = useWallet()
  const Icon = role === 'ADMIN' ? ShieldCheck : role === 'FACULTY' ? BookOpen : GraduationCap
  return <aside className="sidebar"><NavLink className="brand sidebar-brand" to="/"><span className="brand-mark"><Fingerprint size={20} /></span><span>Decentra<span>ID</span></span></NavLink>
    <div className="sidebar-section"><small>WORKSPACE</small><nav>{(links[role] || []).map(({ to, label, icon: LinkIcon }) => <NavLink key={to} to={to} end className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}><LinkIcon size={17} />{label}{to === '/activity' && <span className="side-new">LIVE</span>}</NavLink>)}</nav></div>
    <div className="sidebar-bottom"><div className="role-summary"><span className="role-summary-icon"><Icon size={17} /></span><div><small>Signed in as</small><strong>{role}</strong></div><BadgeCheck size={16} className="summary-check" /></div>
      <div className="sidebar-network"><span className={demoMode ? 'network-dot demo-dot' : 'network-dot'} />{demoMode ? 'Demo workspace' : 'Wallet session'}</div><button className="sidebar-disconnect" onClick={disconnectWallet}><LogOut size={15} />Disconnect</button>
    </div>
  </aside>
}