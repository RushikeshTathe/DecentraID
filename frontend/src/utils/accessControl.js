export function getHomeForRole(role) {
  if (role === 'ADMIN') return '/admin'
  if (role === 'STUDENT') return '/student'
  if (role === 'FACULTY') return '/faculty'
  return '/access-denied'
}

export function canAccessRole(identity, requiredRole, isOwner = false) {
  if (!identity?.isRegistered || !identity.isActive) return false
  if (requiredRole === 'ADMIN') return Boolean(isOwner)
  return identity.roleName === requiredRole || identity.roleName === 'ADMIN'
}

export function formatAddress(address, leading = 6, trailing = 4) {
  if (!address) return ''
  return `${address.slice(0, leading)}...${address.slice(-trailing)}`
}