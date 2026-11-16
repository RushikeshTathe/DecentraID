import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserProvider, getAddress } from 'ethers'
import { useNavigate } from 'react-router-dom'
import {
  assertExpectedNetwork,
  getIdentity,
  getOwner,
  requireInjectedProvider,
  checkAccess,
  switchToExpectedNetwork,
} from '../services/blockchain.js'
import {
  detectInjectedProvider,
  isUnsupportedChain,
  normalizeChainId,
  pickPrimaryAccount,
  readChainId,
  requestAccounts,
} from '../services/walletProvider.js'
import { createAuthChallenge, verifyChallengeSignature } from '../services/authService.js'
import { getProfile, getDemoProfiles } from '../services/identityService.js'
import { EXPECTED_CHAIN_ID } from '../config/contract.js'

const WalletContext = createContext(null)

function safeChecksumAddress(value) {
  if (!value) return ''
  try {
    return getAddress(value)
  } catch {
    return ''
  }
}

export function WalletProvider({ children }) {
  const navigate = useNavigate()
  const [account, setAccount] = useState('')
  const [chainId, setChainId] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [identity, setIdentity] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [profile, setProfile] = useState(null)
  const [demoMode, setDemoMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [hasProvider, setHasProvider] = useState(() => Boolean(detectInjectedProvider()))
  const [error, setError] = useState('')
  const accountRef = useRef(account)

  useEffect(() => {
    accountRef.current = account
  }, [account])

  const clearWalletAuth = useCallback((nextAccount = '') => {
    setAccount(nextAccount)
    setIsAuthenticated(false)
    setIdentity(null)
    setIsOwner(false)
    setProfile(null)
    setError('')
    setDemoMode(false)
  }, [])

  // Detect a provider that injects itself after first render (e.g. mobile wallets).
  useEffect(() => {
    if (hasProvider) return undefined
    const refresh = () => setHasProvider(Boolean(detectInjectedProvider()))
    window.addEventListener('ethereum#initialized', refresh)
    const timer = window.setTimeout(refresh, 1000)
    return () => {
      window.removeEventListener('ethereum#initialized', refresh)
      window.clearTimeout(timer)
    }
  }, [hasProvider])

  // Wallet events: account change, network change, and disconnection.
  useEffect(() => {
    const injected = detectInjectedProvider()
    if (!injected) return undefined

    const handleAccounts = (accounts) => {
      const nextAccount = safeChecksumAddress(pickPrimaryAccount(accounts))
      clearWalletAuth(nextAccount)
      if (nextAccount) {
        navigate('/access-denied', { replace: true, state: { reason: 'account-changed' } })
      } else {
        navigate('/', { replace: true })
      }
    }

    const handleChain = (nextChainIdHex) => {
      const nextChainId = normalizeChainId(nextChainIdHex)
      setChainId(nextChainId)
      clearWalletAuth(accountRef.current)
      if (isUnsupportedChain(nextChainId, EXPECTED_CHAIN_ID)) {
        navigate('/access-denied', { replace: true, state: { reason: 'network-changed' } })
      }
    }

    injected.on?.('accountsChanged', handleAccounts)
    injected.on?.('chainChanged', handleChain)
    return () => {
      injected.removeListener?.('accountsChanged', handleAccounts)
      injected.removeListener?.('chainChanged', handleChain)
    }
  }, [clearWalletAuth, navigate])

  const connectWallet = useCallback(async () => {
    setError('')
    const injected = detectInjectedProvider()
    setHasProvider(Boolean(injected))

    if (!injected) {
      const missing = new Error('MetaMask was not detected. Install MetaMask to connect a wallet.')
      missing.code = 'NO_WALLET'
      setError(missing.message)
      throw missing
    }

    setConnecting(true)
    try {
      const provider = new BrowserProvider(injected)
      const accounts = await requestAccounts(provider)
      const nextChainId = await readChainId(provider)
      const nextAccount = safeChecksumAddress(pickPrimaryAccount(accounts))
      setAccount(nextAccount)
      setChainId(nextChainId)
      setIsAuthenticated(false)
      return nextAccount
    } catch (connectError) {
      setError(
        connectError?.code === 4001
          ? 'Wallet connection request was rejected in MetaMask.'
          : connectError.message
      )
      throw connectError
    } finally {
      setConnecting(false)
    }
  }, [])

  const authenticate = useCallback(async () => {
    if (!account) throw new Error('Connect a wallet before signing in.')
    setBusy(true)
    setError('')
    try {
      const provider = requireInjectedProvider()
      await assertExpectedNetwork(provider)
      const signer = await provider.getSigner()
      const message = createAuthChallenge(account)
      const signature = await signer.signMessage(message)
      if (!verifyChallengeSignature(message, signature, account)) throw new Error('Wallet signature could not be verified.')
      const [nextIdentity, owner] = await Promise.all([getIdentity(account), getOwner()])
      if (!nextIdentity.isRegistered) throw new Error('This wallet has no registered identity. Register first, then sign in again.')
      if (!nextIdentity.isActive) throw new Error('This identity is inactive. Contact your administrator.')
      const nextIsOwner = owner.toLowerCase() === account.toLowerCase()
      if (!nextIsOwner && !['STUDENT', 'FACULTY'].includes(nextIdentity.roleName)) {
        throw new Error('Your identity has no assigned access role yet.')
      }
      if (!nextIsOwner && !(await checkAccess(account, nextIdentity.roleName))) {
        throw new Error('The contract did not authorize this identity for its assigned role.')
      }
      setIdentity(nextIdentity)
      setIsOwner(nextIsOwner)
      setIsAuthenticated(true)
      setProfile(getProfile(account))
      return nextIsOwner ? 'ADMIN' : nextIdentity.roleName
    } catch (authError) {
      setError(authError.code === 4001 ? 'Signature request was rejected in MetaMask.' : authError.message)
      throw authError
    } finally {
      setBusy(false)
    }
  }, [account])

  const switchNetwork = useCallback(async () => {
    setError('')
    setSwitching(true)
    try {
      await switchToExpectedNetwork()
      const injected = detectInjectedProvider()
      if (injected) {
        const provider = new BrowserProvider(injected)
        setChainId(await readChainId(provider))
      }
    } catch (switchError) {
      setError(
        switchError?.code === 4001
          ? 'Network switch was rejected in MetaMask.'
          : switchError.message
      )
      throw switchError
    } finally {
      setSwitching(false)
    }
  }, [])

  const refreshIdentity = useCallback(async () => {
    if (!account) return null
    const latest = await getIdentity(account)
    setIdentity(latest)
    setProfile(getProfile(account))
    return latest
  }, [account])

  const disconnectWallet = useCallback(() => {
    clearWalletAuth('')
    navigate('/')
  }, [clearWalletAuth, navigate])

  const enterDemo = useCallback((role = 'STUDENT') => {
    const demoProfile = getDemoProfiles()[role === 'FACULTY' ? 2 : 0]
    setAccount(demoProfile.address)
    setIdentity({ ...demoProfile, roleName: role })
    setProfile({ name: demoProfile.name, email: `${role.toLowerCase()}@demo.decentraid.edu`, department: demoProfile.department })
    setIsOwner(role === 'ADMIN')
    setIsAuthenticated(true)
    setDemoMode(true)
    navigate(role === 'ADMIN' ? '/admin' : role === 'FACULTY' ? '/faculty' : '/student')
  }, [navigate])

  const networkMismatch = isUnsupportedChain(chainId, EXPECTED_CHAIN_ID)

  const value = useMemo(() => ({
    account, chainId, isAuthenticated, identity, isOwner, profile, demoMode,
    busy, connecting, switching, hasProvider, networkMismatch, error,
    connectWallet, authenticate, disconnectWallet, refreshIdentity, enterDemo,
    switchNetwork, setError, setProfile,
  }), [account, chainId, isAuthenticated, identity, isOwner, profile, demoMode,
    busy, connecting, switching, hasProvider, networkMismatch, error,
    connectWallet, authenticate, disconnectWallet, refreshIdentity, enterDemo, switchNetwork])

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used inside WalletProvider.')
  return context
}
