const PROFILE_KEY = 'decentraid-profiles-v1'

function readProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getProfile(address) {
  if (!address) return null
  return readProfiles()[address.toLowerCase()] || null
}

export function saveProfile(address, profile) {
  const profiles = readProfiles()
  profiles[address.toLowerCase()] = { ...profile, updatedAt: new Date().toISOString() }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles))
}

export function getDemoProfiles() {
  return [
    { address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', name: 'Avery Chen', department: 'Computer Science', role: 'STUDENT' },
    { address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', name: 'Jordan Rivera', department: 'Applied Mathematics', role: 'STUDENT' },
    { address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0', name: 'Dr. Morgan Lee', department: 'Information Systems', role: 'FACULTY' },
    { address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', name: 'Sam Patel', department: 'Electrical Engineering', role: 'STUDENT' },
  ].map((profile, index) => ({
    ...profile,
    isRegistered: true,
    isActive: index !== 3,
    registeredAt: 1735689600 - index * 86400 * 12,
  }))
}

export function getDemoActivity() {
  return [
    { type: 'Identity registered', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', timestamp: 1735689600, status: 'Demo record' },
    { type: 'Role assigned', address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0', timestamp: 1735776000, status: 'Demo record', role: 'FACULTY' },
    { type: 'Identity deactivated', address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', timestamp: 1735862400, status: 'Demo record' },
  ]
}