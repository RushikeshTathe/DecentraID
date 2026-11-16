import { useEffect, useState } from 'react'
import { getVerification } from '../services/blockchain.js'

// Re-reads the wallet's identity and role permissions directly from the
// contract. Used by the Student/Faculty dashboards so access is never trusted
// from cached frontend state alone.
export function useIdentityVerification(account, demoMode) {
  const [verification, setVerification] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    if (demoMode || !account) {
      setVerification(null)
      setError('')
      setLoading(false)
      return () => { cancelled = true }
    }

    setLoading(true)
    setError('')
    getVerification(account)
      .then((result) => { if (!cancelled) setVerification(result) })
      .catch((verificationError) => { if (!cancelled) setError(verificationError.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [account, demoMode])

  return { verification, loading, error }
}
