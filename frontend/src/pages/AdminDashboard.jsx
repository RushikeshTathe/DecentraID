import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, BadgeCheck, GraduationCap, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext.jsx'
import { assignRole, listIdentities, setIdentityActive } from '../services/blockchain.js'
import { getDemoProfiles, getProfile } from '../services/identityService.js'
import StatCard from '../components/StatCard.jsx'
import UserTable from '../components/UserTable.jsx'
import ConfirmationModal from '../components/ConfirmationModal.jsx'
import ToastNotification from '../components/ToastNotification.jsx'
import IdentityCard from '../components/IdentityCard.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { CONTRACT_CONFIGURED } from '../config/contract.js'

export default function AdminDashboard() {
  const { demoMode } = useWallet()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState('')
  const refresh = async () => {
    setLoading(true); setLoadError('')
    try {
      if (demoMode) setUsers(getDemoProfiles().map((user) => ({ address: user.address, identity: { ...user, roleName: user.role }, profile: { name: user.name, department: user.department } })))
      else {
        const identities = await listIdentities()
        setUsers(identities.map(({ address, identity }) => ({ address, identity, profile: getProfile(address) })))
      }
    } catch (error) { setLoadError(error.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [demoMode])
  const stats = useMemo(() => ({ total: users.length, active: users.filter(({ identity }) => identity.isActive).length, students: users.filter(({ identity }) => identity.roleName === 'STUDENT').length, faculty: users.filter(({ identity }) => identity.roleName === 'FACULTY').length }), [users])
  const confirm = async () => {
    if (!modal || demoMode) return
    setBusy(true)
    try {
      const result = modal.kind === 'role' ? await assignRole(modal.address, modal.role) : await setIdentityActive(modal.address, !modal.active)
      setToast({ title: 'Transaction confirmed', message: `Hash: ${result.hash}` }); setModal(null); await refresh()
    } catch (error) { setToast({ type: 'error', title: 'Transaction failed', message: error.code === 4001 ? 'Rejected in MetaMask.' : error.message }) }
    finally { setBusy(false) }
  }
  const modalUser = users.find(({ address }) => address === modal?.address)
  return <main className="workspace-page"><header className="page-header"><div><div className="eyebrow"><span className="eyebrow-line" /> ADMINISTRATION</div><h1>Identity overview</h1><p>Manage campus identities, roles, and access status.</p></div><button className="button button-outline" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Refresh</button></header>
    {demoMode && <div className="notice notice-demo"><ShieldCheck size={17} /><div><strong>Demo records only</strong><span>Sample users below are not on-chain. Administrative actions are disabled in demo mode.</span></div></div>}
    {!demoMode && !CONTRACT_CONFIGURED && <div className="notice notice-warn"><ShieldCheck size={17} /><div><strong>Contract unavailable</strong><span>Set the deployed address in the frontend environment to load identities.</span></div></div>}
    <section className="stats-grid"><StatCard label="Registered users" value={stats.total} detail="All identities" icon={Users} tone="blue" /><StatCard label="Active identities" value={stats.active} detail="Eligible for access" icon={BadgeCheck} tone="green" /><StatCard label="Students" value={stats.students} detail="Student role assigned" icon={GraduationCap} tone="violet" /><StatCard label="Faculty" value={stats.faculty} detail="Faculty role assigned" icon={ShieldCheck} tone="orange" /></section>
    <section className="panel-section"><div className="panel-heading"><div><h2>Registered identities</h2><span>{users.length} total records</span></div><Link className="subtle-link" to="/activity">View activity <ArrowRight size={15} /></Link></div>
      {loading ? <div className="panel-loading"><LoadingSpinner label="Reading identity events" /></div> : loadError ? <div className="inline-error table-error">{loadError}</div> : <UserTable users={users} demoMode={demoMode} onAssign={(address, role) => setModal({ kind: 'role', address, role })} onToggle={(address, active) => setModal({ kind: 'status', address, active })} onView={setModal} />}
    </section>
    <ConfirmationModal title={modal?.kind === 'role' ? 'Assign identity role?' : modal?.kind === 'status' ? (modal.active ? 'Deactivate identity?' : 'Reactivate identity?') : ''} confirmLabel={modal?.kind === 'role' ? `Assign ${modal.role.toLowerCase()}` : modal?.active ? 'Deactivate identity' : 'Reactivate identity'} danger={modal?.kind === 'status' && modal?.active} busy={busy} onConfirm={confirm} onClose={() => setModal(null)}>
      {modal?.kind === 'role' ? <>Set <strong>{modalUser?.profile?.name || modal?.address}</strong> to the {modal?.role.toLowerCase()} role. This requires an owner-authorized blockchain transaction.</> : modal?.kind === 'status' ? <>This will {modal?.active ? 'remove access for' : 'restore access to'} <strong>{modalUser?.profile?.name || modal?.address}</strong> after the transaction confirms.</> : null}
    </ConfirmationModal>
    {modal?.identity && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><section className="detail-modal"><button className="icon-button modal-close" onClick={() => setModal(null)} aria-label="Close details">×</button><IdentityCard address={modal.address} identity={modal.identity} profile={modal.profile} demoMode={demoMode} /></section></div>}
    <ToastNotification toast={toast} onClose={() => setToast(null)} /><div className="activity-teaser"><div><span className="teaser-icon"><Activity size={17} /></span><div><strong>Every change leaves a record.</strong><span>Review confirmed contract activity and transaction hashes.</span></div></div><Link to="/activity">Open activity <ArrowRight size={15} /></Link></div>
  </main>
}