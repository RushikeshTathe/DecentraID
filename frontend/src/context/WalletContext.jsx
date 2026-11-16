import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getAddress } from 'ethers'
import { useNavigate } from 'react-router-dom'
import {
  assertExpectedNetwork,
  getIdentity,
  getInjectedProvider,
  getOwner,
  requireInjectedProvider,
  checkAccess,
} from '../services/blockchain.js'
import { createAuthChallenge, verifyChallengeSignature } from '../services/authService.js'
import { getProfile, getDemoProfiles } from '../services/identityService.js'

const WalletContext = createContext(null)

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
  const [error, setError] = useState('')

  const clearWalletAuth = useCallback((nextAccount = '') => {
    setAccount(nextAccount)
    setIsAuthenticated(false)
    setIdentity(null)
    setIsOwner(false)
    setProfile(null)
    setError('')
    setDemoMode(false)
  }, [])

  useEffect(() => {
    const injected = getInjectedProvider()
    if (!injected) return undefined
    const handleAccounts = (accounts) => {
      clearWalletAuth(accounts[0] || '')
      if (accounts[0]) navigate('/access-denied', { replace: true, state: { reason: 'account-changed' } })
    }
    const handleChain = (nextChainId) => {
      setChainId(Number.parseInt(nextChainId, 16))
      clearWalletAuth(account)
      navigate('/access-denied', { replace: true, state: { reason: 'network-changed' } })
    }
    injected.on('accountsChanged', handleAccounts)
    injected.on('chainChanged', handleChain)
    return () => {
      injected.removeListener('accountsChanged', handleAccounts)
      injected.removeListener('chainChanged', handleChain)
    }
  }, [account, clearWalletAuth, navigate])

  const connectWallet = useCallback(async () => {
    setError('')
    const provider = requireInjectedProvider()
    const accounts = await provider.send('eth_requestAccounts', [])
    if (!accounts[0]) throw new Error('No wallet account was selected.')
    const network = await provider.getNetwork()
    setAccount(getAddress(accounts[0]))
    setChainId(Number(network.chainId))
    setIsAuthenticated(false)
    return getAddress(accounts[0])
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

  const value = useMemo(() => ({
    account, chainId, isAuthenticated, identity, isOwner, profile, demoMode, busy, error,
    connectWallet, authenticate, disconnectWallet, refreshIdentity, enterDemo, setError, setProfile,
  }), [account, chainId, isAuthenticated, identity, isOwner, profile, demoMode, busy, error, connectWallet, authenticate, disconnectWallet, refreshIdentity, enterDemo])

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used inside WalletProvider.')
  return context
}