import { ArrowUpRight, BookOpenCheck, CalendarDays, FileCheck2, GraduationCap, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useWallet } from '../context/WalletContext.jsx'
import IdentityCard from '../components/IdentityCard.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useIdentityVerification } from '../hooks/useIdentityVerification.js'
import { formatAddress } from '../utils/accessControl.js'

export default function FacultyDashboard() {
  const { account, identity, profile, demoMode } = useWallet()
  const { verification, loading, error } = useIdentityVerification(account, demoMode)

  const displayIdentity = demoMode ? identity : (verification?.identity || identity)
  const isRegistered = demoMode ? Boolean(identity?.isRegistered) : Boolean(verification?.status.isRegistered)
  const isActive = demoMode ? Boolean(identity?.isActive) : Boolean(verification?.status.isActive)
  const facultyAccess = demoMode ? Boolean(identity?.isActive) : Boolean(verification?.facultyAccess)
  const hasProfile = Boolean(profile?.name || profile?.email || profile?.department)

  if (!demoMode && loading) {
    return <main className="workspace-page"><div className="panel-loading"><LoadingSpinner label="Verifying faculty access on-chain" /></div></main>
  }

  if (!demoMode && error) {
    return <main className="workspace-page"><div className="notice notice-warn"><ShieldAlert size={17} /><div><strong>Could not verify access</strong><span>{error}</span></div></div></main>
  }

  if (!demoMode && verification && (!isRegistered || !isActive || !facultyAccess)) {
    const message = !isRegistered
      ? 'This wallet has no registered identity on the identity contract.'
      : !isActive
        ? 'This identity is inactive. Ask your institution administrator to restore access.'
        : 'This wallet does not have Faculty access. Student and Admin accounts use their own workspace.'
    return <main className="workspace-page"><div className="notice notice-warn"><ShieldAlert size={17} /><div><strong>Faculty workspace unavailable</strong><span>{message}</span></div></div></main>
  }

  return <main className="workspace-page"><header className="page-header student-header"><div><div className="eyebrow"><span className="eyebrow-line" /> FACULTY PORTAL</div><h1>Welcome{profile?.name ? `, ${profile.name.split(' ').slice(-1)[0]}` : ' back'}.</h1><p>Your verified faculty identity and authorized resources.</p></div><span className="verified-pill"><ShieldCheck size={15} /> {demoMode ? 'Demo identity' : 'Faculty identity verified'}</span></header>
    <div className="student-overview"><IdentityCard address={account} identity={displayIdentity} profile={profile} demoMode={demoMode} /><div className="student-side"><section className="access-panel faculty-access"><div className="access-panel-heading"><span><BookOpenCheck size={17} /></span><div><small>ACCESS STATUS</small><strong>Faculty access active</strong></div></div><p>{demoMode ? 'Sample faculty identity. Demo mode does not read from a blockchain.' : 'Access is verified against the identity contract for this wallet.'}</p><div className="access-detail"><span>Wallet address</span><strong>{formatAddress(account, 8, 6)}</strong></div><div className="access-detail"><span>Registration</span><strong>{isRegistered ? 'Registered' : 'Not registered'}</strong></div><div className="access-detail"><span>Identity status</span><strong>{isActive ? 'Active' : 'Inactive'}</strong></div><div className="access-detail"><span>Faculty permission</span><strong>{facultyAccess ? 'Granted' : 'Denied'}</strong></div><div className="access-detail"><span>Registration date</span><strong>{displayIdentity?.registeredAt ? new Date(displayIdentity.registeredAt * 1000).toLocaleDateString() : '—'}</strong></div></section>
      <section className="profile-panel"><div className="panel-heading small-heading"><div><h2>Faculty profile</h2><span>Personal details are off-chain</span></div><GraduationCap size={18} /></div>{hasProfile ? <><div className="profile-row"><span>Full name</span><strong>{profile?.name || 'Not provided'}</strong></div><div className="profile-row"><span>University email</span><strong>{profile?.email || 'Not provided'}</strong></div><div className="profile-row"><span>Department</span><strong>{profile?.department || 'Not provided'}</strong></div></> : <div className="empty-state"><GraduationCap size={22} /><strong>No off-chain profile found</strong><span>Register your campus profile to add your name, email and department. These details stay in this browser and are never sent to the smart contract.</span></div>}</section></div></div>
    <section className="resource-section faculty-resource"><div className="panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> FACULTY PERMISSIONS</div><h2>Faculty resources</h2></div><span className="resource-count">3 AVAILABLE</span></div><div className="resource-grid"><Resource icon={FileCheck2} title="Class rosters" text="View enrolled students for your courses." /><Resource icon={BookOpenCheck} title="Course workspace" text="Open course materials and teaching resources." /><Resource icon={CalendarDays} title="Academic calendar" text="Review term schedules and faculty dates." /></div><p className="resource-footnote"><ShieldCheck size={14} /> These resource cards are demonstration areas for faculty-authorized access. No external campus service is connected.</p></section>
  </main>
}

function Resource({ icon: Icon, title, text }) {
  return <article className="resource-item"><div className="resource-icon faculty-resource-icon"><Icon size={19} /></div><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={16} className="resource-arrow" /></article>
}
