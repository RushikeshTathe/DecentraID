import { BrowserProvider, Contract, JsonRpcProvider, getAddress, isAddress } from 'ethers'
import identityAccessManagerAbi from '../config/identityAccessManagerAbi.js'
import {
  CONTRACT_ADDRESS,
  CONTRACT_CONFIGURED,
  DEPLOYMENT_BLOCK,
  EXPECTED_CHAIN_ID,
  EXPECTED_NETWORK_NAME,
  NETWORK_RPC_URL,
  ROLE,
  ROLE_NAME,
  getAddChainParams,
} from '../config/contract.js'
import { detectInjectedProvider, switchOrAddChain } from './walletProvider.js'
import { combineActivityEvents } from './eventUtils.js'

export class BlockchainError extends Error {
  constructor(message, code = 'BLOCKCHAIN_ERROR') {
    super(message)
    this.name = 'BlockchainError'
    this.code = code
  }
}

export function getInjectedProvider() {
  return detectInjectedProvider()
}

export function requireInjectedProvider() {
  const injected = getInjectedProvider()
  if (!injected) throw new BlockchainError('MetaMask was not detected. Install it to continue.', 'NO_WALLET')
  return new BrowserProvider(injected)
}

export async function assertExpectedNetwork(provider) {
  if (!EXPECTED_CHAIN_ID) return
  const network = await provider.getNetwork()
  const currentChainId = Number(network.chainId)
  if (currentChainId !== Number(EXPECTED_CHAIN_ID)) {
    throw new BlockchainError(
      `Wrong network detected (chain ID ${currentChainId}). Switch MetaMask to ${EXPECTED_NETWORK_NAME} (chain ID ${EXPECTED_CHAIN_ID}).`,
      'WRONG_NETWORK'
    )
  }
}

export async function switchToExpectedNetwork() {
  const injected = detectInjectedProvider()
  if (!injected) {
    throw new BlockchainError('MetaMask was not detected. Install it to continue.', 'NO_WALLET')
  }
  if (!EXPECTED_CHAIN_ID) {
    throw new BlockchainError('No target network is configured.', 'NOT_CONFIGURED')
  }

  try {
    return await switchOrAddChain(injected, {
      chainId: EXPECTED_CHAIN_ID,
      addParams: getAddChainParams(),
    })
  } catch (error) {
    throw new BlockchainError(error.message, error.code || 'NETWORK_SWITCH_FAILED')
  }
}

export function requireConfiguredContract() {
  if (!CONTRACT_CONFIGURED) {
    throw new BlockchainError('The contract is not deployed or configured yet. Live blockchain actions are unavailable.', 'NOT_CONFIGURED')
  }
}

function toValidAddress(address) {
  if (!isAddress(address)) {
    throw new BlockchainError('Invalid wallet address.', 'INVALID_ADDRESS')
  }
  return getAddress(address)
}

// Read-only provider: prefer the wallet provider (same chain the user is on),
// otherwise fall back to the configured RPC for public lookups without a wallet.
async function getReadProvider() {
  const injected = detectInjectedProvider()
  if (injected) {
    const provider = new BrowserProvider(injected)
    await assertExpectedNetwork(provider)
    return provider
  }

  const provider = new JsonRpcProvider(NETWORK_RPC_URL)
  let network
  try {
    network = await provider.getNetwork()
  } catch {
    throw new BlockchainError(
      `Could not reach the read-only RPC at ${NETWORK_RPC_URL}. Connect a wallet or set VITE_RPC_URL.`,
      'RPC_UNAVAILABLE'
    )
  }
  if (EXPECTED_CHAIN_ID && Number(network.chainId) !== Number(EXPECTED_CHAIN_ID)) {
    throw new BlockchainError(
      `Read-only RPC is on chain ID ${Number(network.chainId)}, expected ${EXPECTED_NETWORK_NAME} (chain ID ${EXPECTED_CHAIN_ID}).`,
      'WRONG_NETWORK'
    )
  }
  return provider
}

// Separate read and signer-connected contract instances.
async function getReadContract() {
  requireConfiguredContract()
  const provider = await getReadProvider()
  return new Contract(CONTRACT_ADDRESS, identityAccessManagerAbi, provider)
}

async function getSignerContract() {
  requireConfiguredContract()
  const provider = requireInjectedProvider()
  await assertExpectedNetwork(provider)
  const signer = await provider.getSigner()
  return new Contract(CONTRACT_ADDRESS, identityAccessManagerAbi, signer)
}

export function normalizeIdentity(result) {
  return {
    isRegistered: Boolean(result.isRegistered ?? result[0]),
    isActive: Boolean(result.isActive ?? result[1]),
    role: Number(result.role ?? result[2]),
    roleName: ROLE_NAME[Number(result.role ?? result[2])] || 'NONE',
    registeredAt: Number(result.registeredAt ?? result[3]),
  }
}

export async function getIdentity(address) {
  const contract = await getReadContract()
  const identity = await contract.getIdentity(toValidAddress(address))
  return normalizeIdentity(identity)
}

export async function getIdentityStatus(address) {
  const contract = await getReadContract()
  const result = await contract.getIdentityStatus(toValidAddress(address))
  return {
    isRegistered: Boolean(result.isRegistered ?? result[0]),
    isActive: Boolean(result.isActive ?? result[1]),
    hasRole: Boolean(result.hasRole ?? result[2]),
  }
}

// One read round-trip powering the public verification page. Keeps Admin
// ownership separate from Student and Faculty role permissions.
export async function getVerification(address) {
  const target = toValidAddress(address)
  const contract = await getReadContract()
  const [identityResult, statusResult, verified, studentAccess, facultyAccess, ownerResult] = await Promise.all([
    contract.getIdentity(target),
    contract.getIdentityStatus(target),
    contract.verifyIdentity(target),
    contract.checkAccess(target, ROLE.STUDENT),
    contract.checkAccess(target, ROLE.FACULTY),
    contract.owner(),
  ])
  const owner = getAddress(ownerResult)

  return {
    identity: normalizeIdentity(identityResult),
    status: {
      isRegistered: Boolean(statusResult.isRegistered ?? statusResult[0]),
      isActive: Boolean(statusResult.isActive ?? statusResult[1]),
      hasRole: Boolean(statusResult.hasRole ?? statusResult[2]),
    },
    verified: Boolean(verified),
    studentAccess: Boolean(studentAccess),
    facultyAccess: Boolean(facultyAccess),
    owner,
    isOwner: owner.toLowerCase() === target.toLowerCase(),
  }
}

export async function getOwner() {
  const contract = await getReadContract()
  return getAddress(await contract.owner())
}

export async function verifyIdentity(address) {
  const contract = await getReadContract()
  return contract.verifyIdentity(toValidAddress(address))
}

export async function checkAccess(address, requiredRole) {
  const contract = await getReadContract()
  return contract.checkAccess(toValidAddress(address), ROLE[requiredRole])
}

export async function registerIdentity({ onSubmitted } = {}) {
  const contract = await getSignerContract()
  const transaction = await contract.registerIdentity()
  if (typeof onSubmitted === 'function') onSubmitted(transaction.hash)
  const receipt = await transaction.wait()
  if (!receipt || receipt.status !== 1) throw new BlockchainError('Registration transaction failed.', 'TX_FAILED')
  return { hash: transaction.hash, receipt }
}

export async function assignRole(address, roleName, { onSubmitted } = {}) {
  if (!['STUDENT', 'FACULTY'].includes(roleName)) throw new BlockchainError('Choose a valid role.', 'INVALID_ROLE')
  const contract = await getSignerContract()
  const transaction = await contract.assignRole(toValidAddress(address), ROLE[roleName])
  if (typeof onSubmitted === 'function') onSubmitted(transaction.hash)
  const receipt = await transaction.wait()
  if (!receipt || receipt.status !== 1) throw new BlockchainError('Role assignment transaction failed.', 'TX_FAILED')
  return { hash: transaction.hash, receipt }
}

export async function setIdentityActive(address, active, { onSubmitted } = {}) {
  const contract = await getSignerContract()
  const target = toValidAddress(address)
  const transaction = active
    ? await contract.reactivateIdentity(target)
    : await contract.deactivateIdentity(target)
  if (typeof onSubmitted === 'function') onSubmitted(transaction.hash)
  const receipt = await transaction.wait()
  if (!receipt || receipt.status !== 1) throw new BlockchainError('Identity status transaction failed.', 'TX_FAILED')
  return { hash: transaction.hash, receipt }
}

export async function listIdentities() {
  const contract = await getReadContract()
  const events = await contract.queryFilter(contract.filters.IdentityRegistered(), DEPLOYMENT_BLOCK)
  const addresses = [...new Set(events.map((event) => getAddress(event.args.user)))]
  return Promise.all(addresses.map(async (address) => ({
    address,
    identity: normalizeIdentity(await contract.getIdentity(address)),
    registrationBlock: events.find((event) => getAddress(event.args.user) === address)?.blockNumber,
  })))
}

export async function getActivity() {
  const contract = await getReadContract()
  const eventTypes = [
    ['IdentityRegistered', 'Identity registered'],
    ['RoleAssigned', 'Role assigned'],
    ['IdentityDeactivated', 'Identity deactivated'],
    ['IdentityReactivated', 'Identity reactivated'],
  ]
  const eventGroups = await Promise.all(eventTypes.map(async ([name, label]) => {
    const filter = contract.filters[name]()
    const events = await contract.queryFilter(filter, DEPLOYMENT_BLOCK)
    return events.map((event) => ({
      eventName: name,
      type: label,
      address: getAddress(event.args.user),
      role: name === 'RoleAssigned' ? ROLE_NAME[Number(event.args.role)] : undefined,
      hash: event.transactionHash,
      blockNumber: event.blockNumber,
      index: Number(event.index ?? event.logIndex ?? 0),
      transactionIndex: Number(event.transactionIndex ?? 0),
      status: 'Confirmed',
    }))
  }))

  // De-duplicate and order by block, then by log index.
  const events = combineActivityEvents(eventGroups.flat())

  // Fetch each unique block once, then attach its timestamp.
  const uniqueBlocks = [...new Set(events.map((event) => event.blockNumber))]
  const blocks = new Map(await Promise.all(uniqueBlocks.map(async (blockNumber) => [blockNumber, await contract.runner.getBlock(blockNumber)])))

  return events.map((event) => {
    const block = blocks.get(event.blockNumber)
    return { ...event, timestamp: block ? Number(block.timestamp) : null }
  })
}
