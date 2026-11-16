export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS?.trim() || ''

export const GANACHE_CHAIN_ID = 1337

export const EXPECTED_CHAIN_ID = import.meta.env.VITE_CHAIN_ID
  ? Number(import.meta.env.VITE_CHAIN_ID)
  : GANACHE_CHAIN_ID

export const EXPECTED_NETWORK_NAME =
  import.meta.env.VITE_NETWORK_NAME?.trim() || 'Ganache Local'

export const NETWORK_RPC_URL =
  import.meta.env.VITE_RPC_URL?.trim() || 'http://127.0.0.1:7545'

export const DEPLOYMENT_BLOCK = Number(import.meta.env.VITE_DEPLOYMENT_BLOCK || 0)
export const BLOCK_EXPLORER_TX_URL = import.meta.env.VITE_BLOCK_EXPLORER_TX_URL?.trim() || ''
export const CONTRACT_CONFIGURED = Boolean(CONTRACT_ADDRESS)

export function getTransactionUrl(hash) {
  return BLOCK_EXPLORER_TX_URL ? `${BLOCK_EXPLORER_TX_URL.replace(/\/$/, '')}/${hash}` : ''
}

export function getAddChainParams(chainId = EXPECTED_CHAIN_ID) {
  return {
    chainId: `0x${Number(chainId).toString(16)}`,
    chainName: EXPECTED_NETWORK_NAME,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [NETWORK_RPC_URL],
  }
}

export const ROLE = Object.freeze({
  NONE: 0,
  STUDENT: 1,
  FACULTY: 2,
  ADMIN: 3,
})

export const ROLE_NAME = Object.freeze(['NONE', 'STUDENT', 'FACULTY', 'ADMIN'])
