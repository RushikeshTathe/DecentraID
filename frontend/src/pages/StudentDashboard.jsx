import { ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ClipboardList, LibraryBig, ShieldCheck } from 'lucide-react'
import { useWallet } from '../context/WalletContext.jsx'
import IdentityCard from '../components/IdentityCard.jsx'
import { formatAddress } from '../utils/accessControl.js'

export default function StudentDashboard() {
  const { account, identity, profile, demoMode } = useWallet()
  return <main className="workspace-page"><header className="page-header student-header"><div><div className="eyebrow"><span className="eyebrow-line" /> STUDENT PORTAL</div><h1>Welcome{profile?.name ? `, ${profile.name.split(' ')[0]}` : ' back'}.</h1><p>Your campus identity and student access, in one place.</p></div><span className="verified-pill"><CheckCircle2 size={15} /> Identity verified</span></header>
    <div className="student-overview"><IdentityCard address={account} identity={identity} profile={profile} demoMode={demoMode} /><div className="student-side"><section className="access-panel"><div className="access-panel-heading"><span><ShieldCheck size={17} /></span><div><small>ACCESS STATUS</small><strong>Student access active</strong></div></div><p>Your identity is registered and active. Student resources are available for this wallet.</p><div className="access-detail"><span>Wallet address</span><strong>{formatAddress(account, 8, 6)}</strong></div><div className="access-detail"><span>Registration date</span><strong>{identity?.registeredAt ? new Date(identity.registeredAt * 1000).toLocaleDateString() : '—'}</strong></div></section>
      <section className="profile-panel"><div className="panel-heading small-heading"><div><h2>Campus profile</h2><span>Personal details are off-chain</span></div><ClipboardList size={18} /></div><div className="profile-row"><span>Full name</span><strong>{profile?.name || 'Not provided'}</strong></div><div className="profile-row"><span>University email</span><strong>{profile?.email || 'Not provided'}</strong></div><div className="profile-row"><span>Department</span><strong>{profile?.department || 'Not provided'}</strong></div></section></div></div>
    <section className="resource-section"><div className="panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR PERMISSIONS</div><h2>Student resources</h2></div><span className="resource-count">3 AVAILABLE</span></div><div className="resource-grid"><Resource icon={BookOpen} title="Course registration" text="View and manage your course enrollment." /><Resource icon={LibraryBig} title="Digital library" text="Access university library resources." /><Resource icon={CalendarDays} title="Academic records" text="Review your student record and term dates." /></div><p className="resource-footnote"><ShieldCheck size={14} /> These resource cards demonstrate student-authorized areas. No external campus service is connected.</p></section>
  </main>
}

function Resource({ icon: Icon, title, text }) {
  return <article className="resource-item"><div className="resource-icon"><Icon size={19} /></div><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={16} className="resource-arrow" /></article>
}