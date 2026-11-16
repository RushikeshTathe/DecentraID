// EIP-1193 wallet helpers.
// These are plain functions with no React or Vite-only imports, so they can be
// unit-tested in Node with mocked providers.

export function detectInjectedProvider(
  target = typeof window !== "undefined" ? window : undefined
) {
  const injected = target?.ethereum;
  return injected && typeof injected.request === "function" ? injected : null;
}

export function pickPrimaryAccount(accounts) {
  return Array.isArray(accounts) && accounts[0] ? accounts[0] : "";
}

export function normalizeChainId(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      const parsed = Number.parseInt(value, 16);
      return Number.isNaN(parsed) ? null : parsed;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function toChainIdHex(chainId) {
  return `0x${Number(chainId).toString(16)}`;
}

export function isUnsupportedChain(chainId, expectedChainId) {
  const current = normalizeChainId(chainId);
  const expected = normalizeChainId(expectedChainId);

  if (current === null || expected === null) return false;
  return current !== expected;
}

export async function requestAccounts(provider) {
  const accounts = await provider.send("eth_requestAccounts", []);
  const primary = pickPrimaryAccount(accounts);

  if (!primary) {
    const error = new Error("No wallet account was selected.");
    error.code = "NO_ACCOUNT";
    throw error;
  }

  return accounts;
}

export async function readChainId(provider) {
  const network = await provider.getNetwork();
  return normalizeChainId(network?.chainId);
}

export async function switchOrAddChain(injected, { chainId, addParams }) {
  if (!injected || typeof injected.request !== "function") {
    const error = new Error(
      "MetaMask was not detected. Install it to continue."
    );
    error.code = "NO_WALLET";
    throw error;
  }

  const chainIdHex = toChainIdHex(chainId);

  try {
    await injected.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    return "switched";
  } catch (error) {
    const code = error?.code ?? error?.data?.originalError?.code;

    // 4902 = chain not added to MetaMask yet; ask the user to add it.
    if (code === 4902) {
      await injected.request({
        method: "wallet_addEthereumChain",
        params: [addParams],
      });
      await injected.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
      return "added";
    }

    const wrapped = new Error(
      error?.message || "Could not switch network in MetaMask."
    );
    wrapped.code = code === 4001 ? 4001 : "NETWORK_SWITCH_FAILED";
    throw wrapped;
  }
}
