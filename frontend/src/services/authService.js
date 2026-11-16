import { getAddress, verifyMessage } from 'ethers'

export function createAuthChallenge(address) {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const issuedAt = new Date().toISOString()
  return [
    'DecentraID wallet authentication',
    `Wallet: ${getAddress(address)}`,
    `Origin: ${window.location.origin}`,
    `Nonce: ${nonce}`,
    `Issued at: ${issuedAt}`,
    'This signature proves wallet ownership only. It does not authorize a blockchain transaction.',
  ].join('\n')
}

export function verifyChallengeSignature(message, signature, address) {
  return getAddress(verifyMessage(message, signature)) === getAddress(address)
}