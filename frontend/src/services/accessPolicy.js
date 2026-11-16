// Decides whether a wallet may sign in, and with which role.
// Pure so the owner/role rules can be unit-tested without React.
//
// Important: the contract owner is Admin by ownership alone (checkAccess with
// ADMIN returns true for owner()), so the owner does NOT need a registered
// identity to access the Admin workspace. Students/Faculty still require a
// registered, active identity with an assigned role.
export function resolveSignInAccess({ account, owner, identity, adminConfirmed = false }) {
  const isOwner = Boolean(account && owner && owner.toLowerCase() === account.toLowerCase())

  if (isOwner) {
    if (!adminConfirmed) {
      return {
        isOwner: true,
        role: 'ADMIN',
        error: 'The contract did not confirm Admin access for the owner wallet.',
      }
    }
    return { isOwner: true, role: 'ADMIN', error: '' }
  }

  if (!identity?.isRegistered) {
    return {
      isOwner: false,
      role: '',
      error: 'This wallet has no registered identity. Register first, then sign in again.',
    }
  }

  if (!identity.isActive) {
    return {
      isOwner: false,
      role: '',
      error: 'This identity is inactive. Contact your administrator.',
    }
  }

  if (!['STUDENT', 'FACULTY'].includes(identity.roleName)) {
    return {
      isOwner: false,
      role: '',
      error: 'Your identity has no assigned access role yet.',
    }
  }

  return { isOwner: false, role: identity.roleName, error: '' }
}
