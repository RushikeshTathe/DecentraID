import { useState } from 'react'
import { ChevronDown, LogOut, ShieldCheck, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext.jsx'
import { formatAddress, getHomeForRole } from '../utils/accessControl.js'
import { EXPECTED_NETWORK_NAME } from '../config/contract.js'

export default function WalletConnect({ compact = false }) {
  const {
    account,
    isAuthenticated,
    identity,
    isOwner,
    busy,
    connecting,
    switching,
    hasProvider,
    networkMismatch,
    connectWallet,
    authenticate,
    disconnectWallet,
    switchNetwork,
    setError,
  } = useWallet()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const signIn = async () => {
    try {
      navigate(getHomeForRole(await authenticate()))
    } catch (error) {
      setError(error.code === 4001 ? 'Signature request was rejected in MetaMask.' : error.message)
    }
  }

  const handleConnect = () => {
    connectWallet().catch((error) => {
      if (error?.code !== 'NO_WALLET') {
        setError(error.code === 4001 ? 'Wallet connection was rejected in MetaMask.' : error.message)
      }
    })
  }

  const handleSwitch = () => {
    switchNetwork().catch((error) => {
      setError(error.code === 4001 ? 'Network switch was rejected in MetaMask.' : error.message)
    })
  }

  if (!account) {
    if (!hasProvider) {
      return (
        <button
          className={`button button-outline${compact ? ' compact-button' : ''}`}
          type="button"
          onClick={() => setError('MetaMask was not detected. Install it from https://metamask.io to connect a wallet.')}
        >
          <Wallet size={16} /> MetaMask not detected
        </button>
      )
    }

    return (
      <button
        className={`button button-primary wallet-button${compact ? ' compact-button' : ''}`}
        type="button"
        onClick={handleConnect}
        disabled={connecting}
      >
        <Wallet size={16} /> {connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    )
  }

  if (networkMismatch) {
    return (
      <div className="wallet-actions">
        <span className="connected-label"><span className="online-dot" />{formatAddress(account)}</span>
        <button
          className={`button button-primary${compact ? ' compact-button' : ''}`}
          type="button"
          onClick={handleSwitch}
          disabled={switching}
        >
          <ShieldCheck size={16} /> {switching ? 'Switching…' : `Switch to ${EXPECTED_NETWORK_NAME}`}
        </button>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="wallet-actions">
        <span className="connected-label"><span className="online-dot" />{formatAddress(account)}</span>
        <button
          className={`button button-primary${compact ? ' compact-button' : ''}`}
          type="button"
          onClick={signIn}
          disabled={busy}
        >
          <ShieldCheck size={16} /> {busy ? 'Verify in wallet…' : 'Verify ownership'}
        </button>
      </div>
    )
  }

  return (
    <div className="wallet-menu-wrap">
      <button className="wallet-menu-button" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="online-dot" />{formatAddress(account)}<ChevronDown size={15} />
      </button>
      {open && (
        <div className="wallet-dropdown">
          <span className="dropdown-role">{isOwner ? 'Administrator' : identity?.roleName}</span>
          <button type="button" onClick={() => { disconnectWallet(); setOpen(false) }}><LogOut size={15} /> Disconnect</button>
        </div>
      )}
    </div>
  )
}
