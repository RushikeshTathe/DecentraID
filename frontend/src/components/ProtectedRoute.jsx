import { Navigate, useLocation } from 'react-router-dom'
import { CONTRACT_CONFIGURED } from '../config/contract.js'
import { useWallet } from '../context/WalletContext.jsx'
import { canAccessRole } from '../utils/accessControl.js'

export default function ProtectedRoute({ role, children }) {
  const { isAuthenticated, identity, isOwner, demoMode, account } = useWallet()
  const location = useLocation()
  if (!isAuthenticated || !account || !canAccessRole(identity, role, isOwner)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname }} />
  }
  if (!demoMode && !CONTRACT_CONFIGURED) return <Navigate to="/access-denied" replace />
  return children
}