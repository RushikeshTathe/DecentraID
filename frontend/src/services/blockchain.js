import { BrowserProvider, Contract, getAddress } from 'ethers'
import identityAccessManagerAbi from '../config/identityAccessManagerAbi.js'
import {
  CONTRACT_ADDRESS,
  CONTRACT_CONFIGURED,
  DEPLOYMENT_BLOCK,
  EXPECTED_CHAIN_ID,
  ROLE,
  ROLE_NAME,
} from '../config/contract.js'

export class BlockchainError extends Error {
  constructor(message, code = 'BLOCKCHAIN_ERROR') {
    super(message)
    this.name = 'BlockchainError'
    this.code = code
  }
}

export function getInjectedProvider() {
  return window.ethereum || null
}

export function requireInjectedProvider() {
  const injected = getInjectedProvider()
  if (!injected) throw new BlockchainError('MetaMask was not detected. Install it to continue.', 'NO_WALLET')
  return new BrowserProvider(injected)
}

export async function assertExpectedNetwork(provider) {
  if (!EXPECTED_CHAIN_ID) return
  const network = await provider.getNetwork()
  if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
    throw new BlockchainError(`Wrong network. Switch MetaMask to chain ID ${EXPECTED_CHAIN_ID}.`, 'WRONG_NETWORK')
  }
}

export function requireConfiguredContract() {
  if (!CONTRACT_CONFIGURED) {
    throw new BlockchainError('The contract is not deployed or configured yet. Live blockchain actions are unavailable.', 'NOT_CONFIGURED')
  }
}

async function getContract({ signer = false, address } = {}) {
  requireConfiguredContract()
  const provider = requireInjectedProvider()
  await assertExpectedNetwork(provider)
  const runner = signer ? await provider.getSigner() : provider
  return new Contract(address || CONTRACT_ADDRESS, identityAccessManagerAbi, runner)
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
  const contract = await getContract()
  const identity = await contract.getIdentity(getAddress(address))
  return normalizeIdentity(identity)
}

export async function getOwner() {
  const contract = await getContract()
  return getAddress(await contract.owner())
}

export async function verifyIdentity(address) {
  const contract = await getContract()
  return contract.verifyIdentity(getAddress(address))
}

export async function checkAccess(address, requiredRole) {
  const contract = await getContract()
  return contract.checkAccess(getAddress(address), ROLE[requiredRole])
}

export async function registerIdentity() {
  const contract = await getContract({ signer: true })
  const transaction = await contract.registerIdentity()
  const receipt = await transaction.wait()
  if (!receipt || receipt.status !== 1) throw new BlockchainError('Registration transaction failed.', 'TX_FAILED')
  return { hash: transaction.hash, receipt }
}

export async function assignRole(address, roleName) {
  if (!['STUDENT', 'FACULTY'].includes(roleName)) throw new BlockchainError('Choose a valid role.', 'INVALID_ROLE')
  const contract = await getContract({ signer: true })
  const transaction = await contract.assignRole(getAddress(address), ROLE[roleName])
  const receipt = await transaction.wait()
  if (!receipt || receipt.status !== 1) throw new BlockchainError('Role assignment transaction failed.', 'TX_FAILED')
  return { hash: transaction.hash, receipt }
}

export async function setIdentityActive(address, active) {
  const contract = await getContract({ signer: true })
  const transaction = active
    ? await contract.reactivateIdentity(getAddress(address))
    : await contract.deactivateIdentity(getAddress(address))
  const receipt = await transaction.wait()
  if (!receipt || receipt.status !== 1) throw new BlockchainError('Identity status transaction failed.', 'TX_FAILED')
  return { hash: transaction.hash, receipt }
}

export async function listIdentities() {
  const contract = await getContract()
  const events = await contract.queryFilter(contract.filters.IdentityRegistered(), DEPLOYMENT_BLOCK)
  const addresses = [...new Set(events.map((event) => getAddress(event.args.user)))]
  return Promise.all(addresses.map(async (address) => ({
    address,
    identity: await getIdentity(address),
    registrationBlock: events.find((event) => getAddress(event.args.user) === address)?.blockNumber,
  })))
}

export async function getActivity() {
  const contract = await getContract()
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
      type: label,
      address: getAddress(event.args.user),
      role: name === 'RoleAssigned' ? ROLE_NAME[Number(event.args.role)] : undefined,
      hash: event.transactionHash,
      blockNumber: event.blockNumber,
      status: 'Confirmed',
    }))
  }))
  const events = eventGroups.flat().sort((left, right) => right.blockNumber - left.blockNumber)
  return Promise.all(events.map(async (event) => {
    const block = await contract.runner.provider.getBlock(event.blockNumber)
    return { ...event, timestamp: block ? Number(block.timestamp) : null }
  }))
}