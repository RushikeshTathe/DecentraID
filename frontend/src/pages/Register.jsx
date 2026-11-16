import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, CheckCircle2, Fingerprint, LockKeyhole, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext.jsx'
import { registerIdentity, getIdentity } from '../services/blockchain.js'
import { saveProfile } from '../services/identityService.js'
import { formatAddress } from '../utils/accessControl.js'
import WalletConnect from '../components/WalletConnect.jsx'
import ToastNotification from '../components/ToastNotification.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { CONTRACT_CONFIGURED, getTransactionUrl } from '../config/contract.js'

export default function Register() {
  const { account, setProfile, refreshIdentity, error: walletError } = useWallet()
  const [form, setForm] = useState({ name: '', email: '', department: '' })
  const [busy, setBusy] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [registeredIdentity, setRegisteredIdentity] = useState(null)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault(); setError(''); setTxHash(''); setConfirmed(false); setRegisteredIdentity(null); setToast(null)
    if (!account) { setError('Connect your wallet before registering.'); return }
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.department.trim()) { setError('Enter your name, a valid email address, and department.'); return }
    setBusy(true)
    try {
      const existing = await getIdentity(account)
      if (existing.isRegistered) {
        setRegisteredIdentity(existing)
        setToast({ type: 'error', title: 'Already registered', message: 'This wallet already has an on-chain identity. No transaction was sent.' })
        return
      }
      const { hash } = await registerIdentity({ onSubmitted: (submittedHash) => setTxHash(submittedHash) })
      const profile = { name: form.name.trim(), email: form.email.trim(), department: form.department.trim() }
      setTxHash(hash)
      setConfirmed(true)
      let profileSaved = true
      try {
        saveProfile(account, profile)
        setProfile(profile)
      } catch {
        profileSaved = false
      }
      let confirmedIdentity = null
      try {
        confirmedIdentity = await refreshIdentity()
        setRegisteredIdentity(confirmedIdentity)
      } catch {
        setRegisteredIdentity(null)
      }
      const statusMessage = confirmedIdentity
        ? `${confirmedIdentity.isActive ? 'Active' : 'Inactive'} identity · ${confirmedIdentity.roleName === 'NONE' ? 'role awaiting administrator assignment' : `${confirmedIdentity.roleName.toLowerCase()} role assigned`}.`
        : 'On-chain status could not be refreshed in this browser.'
      setToast({ title: 'Identity registered', message: `${profileSaved ? 'Your profile details were saved in this browser. ' : 'This browser could not save your profile details. '}${statusMessage}` })
    } catch (registrationError) { setError(registrationError.code === 4001 ? 'Transaction was rejected in MetaMask.' : registrationError.message) }
    finally { setBusy(false) }
  }

  return <main className="form-page"><div className="form-shell"><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to home</Link><div className="form-heading"><div className="form-symbol"><Fingerprint size={24} /></div><div className="eyebrow"><span className="eyebrow-line" /> NEW CAMPUS IDENTITY</div><h1>Make it yours.</h1><p>Register your wallet on the identity contract, then add your campus profile.</p></div>
    {!CONTRACT_CONFIGURED && <div className="notice notice-warn"><LockKeyhole size={17} /><div><strong>Live registration is not available</strong><span>Configure a deployed contract address in <code>.env.local</code>. No transaction has been sent.</span></div></div>}
    {!account ? <div className="connect-panel"><Wallet size={20} /><div><strong>Connect a wallet to continue</strong><span>Your address will be added automatically. Your private key stays in MetaMask.</span></div><WalletConnect /></div> : <form className="registration-form" onSubmit={submit}>
      <div className="connected-address"><div className="address-icon"><Wallet size={16} /></div><div><small>CONNECTED WALLET</small><strong>{formatAddress(account, 10, 8)}</strong></div><CheckCircle2 size={17} className="address-check" /></div>
      <label>Full name<input name="name" value={form.name} onChange={update} placeholder="e.g. Taylor Morgan" autoComplete="name" required /></label>
      <label>University email<input name="email" type="email" value={form.email} onChange={update} placeholder="name@university.edu" autoComplete="email" required /></label>
      <label>Department<select name="department" value={form.department} onChange={update} required><option value="">Select your department</option>{['Computer Science', 'Information Systems', 'Applied Mathematics', 'Electrical Engineering', 'Biology', 'Business Administration', 'Arts and Humanities', 'Other'].map((department) => <option key={department}>{department}</option>)}</select></label>
      <div className="offchain-note"><LockKeyhole size={15} /><span>Name, email, and department are stored in this browser only. They are never sent to the smart contract.</span></div>
      {error && <div className="inline-error">{error}</div>}{walletError && <div className="inline-error">{walletError}</div>}
      <button className="button button-primary submit-button" type="submit" disabled={busy || !CONTRACT_CONFIGURED}>{busy ? <LoadingSpinner label="Waiting for confirmation" small /> : <>Register identity <ArrowUpRight size={16} /></>}</button>
      {txHash && <div className="tx-confirmation"><CheckCircle2 size={18} /><div><strong>{confirmed ? 'Registration confirmed' : 'Waiting for confirmation'}</strong>{!confirmed && <span className="registration-status">Approve the transaction in MetaMask. Waiting for the network to confirm…</span>}{confirmed && registeredIdentity && <span className="registration-status">{registeredIdentity.isActive ? 'Active' : 'Inactive'} identity · {registeredIdentity.roleName === 'NONE' ? 'role awaiting administrator assignment' : `${registeredIdentity.roleName.toLowerCase()} role assigned`}</span>}{getTransactionUrl(txHash) ? <a href={getTransactionUrl(txHash)} target="_blank" rel="noreferrer">{txHash.slice(0, 12)}...{txHash.slice(-8)} <ArrowUpRight size={13} /></a> : <span className="plain-tx-hash">{txHash}</span>}</div></div>}
    </form>}
    <p className="form-footnote">By registering, you authorize a one-time transaction from your connected wallet. <Link to="/verify">Already registered?</Link></p>
  </div><div className="form-aside"><div className="aside-pattern" /><div className="aside-copy"><span><Fingerprint size={17} /> DECENTRAID IDENTITY</span><h2>One trusted identity.<br />A more connected campus.</h2><p>Registration creates an on-chain identity record. Your personal profile stays in your browser and can be verified separately.</p><div className="aside-stat"><span>01</span><div><strong>Identity anchored</strong><small>Your wallet is the key to your campus identity.</small></div></div><div className="aside-stat"><span>02</span><div><strong>Details stay private</strong><small>Personal profile fields never enter transactions.</small></div></div></div></div><ToastNotification toast={toast} onClose={() => setToast(null)} /></main>
}