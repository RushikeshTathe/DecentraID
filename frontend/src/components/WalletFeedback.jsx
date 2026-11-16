import { useEffect, useState } from 'react'
import { useWallet } from '../context/WalletContext.jsx'
import ToastNotification from './ToastNotification.jsx'

export default function WalletFeedback() {
  const { error, setError } = useWallet()
  const [toast, setToast] = useState(null)
  useEffect(() => {
    setToast(error ? { type: 'error', title: 'Wallet action needs attention', message: error } : null)
  }, [error])
  return <ToastNotification toast={toast} onClose={() => { setToast(null); setError('') }} />
}