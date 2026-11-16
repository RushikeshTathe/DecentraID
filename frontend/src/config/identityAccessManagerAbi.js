const identityAccessManagerAbi = [
  'function owner() view returns (address)',
  'function registerIdentity()',
  'function assignRole(address user, uint8 role)',
  'function verifyIdentity(address user) view returns (bool)',
  'function checkAccess(address user, uint8 requiredRole) view returns (bool)',
  'function deactivateIdentity(address user)',
  'function reactivateIdentity(address user)',
  'function getIdentity(address user) view returns (bool isRegistered, bool isActive, uint8 role, uint256 registeredAt)',
  'event IdentityRegistered(address indexed user)',
  'event RoleAssigned(address indexed user, uint8 role)',
  'event IdentityDeactivated(address indexed user)',
  'event IdentityReactivated(address indexed user)',
]

export default identityAccessManagerAbi