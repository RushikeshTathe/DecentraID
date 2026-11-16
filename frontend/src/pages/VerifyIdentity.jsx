import { useState } from 'react'
import { ArrowUpRight, BadgeCheck, Fingerprint, Search, ShieldCheck, Wallet } from 'lucide-react'
import { isAddress } from 'ethers'
import { getVerification } from '../services/blockchain.js'
import { getDemoProfiles } from '../services/identityService.js'
import RoleBadge from '../components/RoleBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { CONTRACT_CONFIGURED } from '../config/contract.js'

function demoResult(sample) {
  if (!sample) {
    return {
      identity: { isRegistered: false, isActive: false, roleName: 'NONE', registeredAt: 0 },
      status: { isRegistered: false, isActive: false, hasRole: false },
      verified: false,
      studentAccess: false,
      facultyAccess: false,
      isOwner: false,
    }
  }

  const active = sample.isRegistered && sample.isActive

  return {
    identity: { ...sample, roleName: sample.role },
    status: { isRegistered: sample.isRegistered, isActive: sample.isActive, hasRole: sample.role !== 'NONE' },
    verified: active,
    studentAccess: active && sample.role === 'STUDENT',
    facultyAccess: active && sample.role === 'FACULTY',
    isOwner: false,
  }
}

export default function VerifyIdentity() {
  const [address, setAddress] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [demoMode, setDemoMode] = useState(false)

  const verify = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)
    if (!isAddress(address)) {
      setError('Enter a valid Ethereum wallet address.')
      return
    }

    setBusy(true)
    try {
      if (demoMode) {
        const sample = getDemoProfiles().find((user) => user.address.toLowerCase() === address.toLowerCase())
        setResult(demoResult(sample))
      } else {
        setResult(await getVerification(address))
      }
    } catch (verifyError) {
      setError(verifyError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="verify-page">
      <div className="verify-heading">
        <div className="verify-mark"><Fingerprint size={25} /></div>
        <div className="eyebrow"><span className="eyebrow-line" /> PUBLIC LOOKUP</div>
        <h1>Verify an identity.</h1>
        <p>Check whether a campus wallet is registered, active, and eligible for access.</p>
      </div>

      {!CONTRACT_CONFIGURED && !demoMode && (
        <div className="notice notice-warn verify-warning">
          <ShieldCheck size={17} />
          <div>
            <strong>No live contract configured</strong>
            <span>Lookups will read from the blockchain only after a deployment address is set.</span>
          </div>
        </div>
      )}

      {!CONTRACT_CONFIGURED && (
        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(event) => { setDemoMode(event.target.checked); setResult(null); setError('') }}
          />
          <span>Use clearly labeled sample records</span>
        </label>
      )}

      <form className="verify-form" onSubmit={verify}>
        <label htmlFor="wallet-address">Wallet address</label>
        <div className="verify-input-wrap">
          <Wallet size={17} />
          <input id="wallet-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." spellCheck="false" />
          <button className="button button-primary" disabled={busy || (!CONTRACT_CONFIGURED && !demoMode)}>
            {busy ? <LoadingSpinner label="Checking" small /> : <><Search size={16} /> Verify</>}
          </button>
        </div>
      </form>

      {error && <div className="inline-error verify-error">{error}</div>}

      {result && (
        <section className={`verification-result ${result.verified ? 'result-valid' : 'result-invalid'}`}>
          <div className="result-head">
            <div className={`result-mark ${result.verified ? '' : 'result-mark-muted'}`}>
              {result.verified ? <BadgeCheck size={22} /> : <Fingerprint size={22} />}
            </div>
            <div>
              <small>IDENTITY LOOKUP {demoMode && '· SAMPLE DATA'}</small>
              <h2>{result.status.isRegistered ? (result.status.isActive ? 'Identity verified' : 'Identity inactive') : 'No identity found'}</h2>
            </div>
            <StatusBadge
              active={result.verified}
              label={result.status.isRegistered ? (result.status.isActive ? 'Active' : 'Inactive') : 'Unregistered'}
            />
          </div>

          <div className="result-details">
            <div><span>Wallet</span><strong>{address}</strong></div>
            <div><span>Registration</span><strong>{result.status.isRegistered ? 'Registered' : 'Unregistered'}</strong></div>
            <div><span>Identity status</span><strong>{result.status.isActive ? 'Active' : 'Inactive'}</strong></div>
            <div><span>Assigned role</span><RoleBadge role={result.identity.roleName || 'NONE'} /></div>
            <div><span>Registered on</span><strong>{result.identity.registeredAt ? new Date(result.identity.registeredAt * 1000).toLocaleString() : '—'}</strong></div>
          </div>

          <div className={`eligibility-line ${result.studentAccess ? 'eligible' : ''}`}>
            <ShieldCheck size={16} />
            <span>{result.studentAccess ? 'Student access granted' : 'Student access denied'}</span>
            {demoMode && <small>Demo data</small>}
          </div>
          <div className={`eligibility-line ${result.facultyAccess ? 'eligible' : ''}`}>
            <ShieldCheck size={16} />
            <span>{result.facultyAccess ? 'Faculty access granted' : 'Faculty access denied'}</span>
          </div>
          <div className={`eligibility-line ${result.isOwner ? 'eligible' : ''}`}>
            <ShieldCheck size={16} />
            <span>{result.isOwner ? 'Contract owner · Admin access' : 'Not the contract owner'}</span>
          </div>
        </section>
      )}

      {demoMode && (
        <div className="sample-addresses">
          <strong>Sample wallets</strong>
          {getDemoProfiles().slice(0, 3).map((user) => (
            <button key={user.address} onClick={() => setAddress(user.address)}>
              {user.name} <span>{user.address.slice(0, 8)}...{user.address.slice(-5)}</span><ArrowUpRight size={13} />
            </button>
          ))}
        </div>
      )}

      <p className="verify-footnote"><ShieldCheck size={14} /> This lookup reads public identity fields from the smart contract. It does not expose private profile details.</p>
    </main>
  )
}
