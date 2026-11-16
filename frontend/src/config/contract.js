export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS?.trim() || ''
export const EXPECTED_CHAIN_ID = import.meta.env.VITE_CHAIN_ID
  ? Number(import.meta.env.VITE_CHAIN_ID)
  : null
export const DEPLOYMENT_BLOCK = Number(import.meta.env.VITE_DEPLOYMENT_BLOCK || 0)
export const BLOCK_EXPLORER_TX_URL = import.meta.env.VITE_BLOCK_EXPLORER_TX_URL?.trim() || ''
export const CONTRACT_CONFIGURED = Boolean(CONTRACT_ADDRESS)

export function getTransactionUrl(hash) {
  return BLOCK_EXPLORER_TX_URL ? `${BLOCK_EXPLORER_TX_URL.replace(/\/$/, '')}/${hash}` : ''
}

export const ROLE = Object.freeze({
  NONE: 0,
  STUDENT: 1,
  FACULTY: 2,
  ADMIN: 3,
})

export const ROLE_NAME = Object.freeze(['NONE', 'STUDENT', 'FACULTY', 'ADMIN'])