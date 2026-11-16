// Automated wallet-flow tests using mocked EIP-1193 providers.
// No browser or MetaMask is required. Run with: npm run test:wallet
import assert from "assert";
import {
  detectInjectedProvider,
  pickPrimaryAccount,
  normalizeChainId,
  toChainIdHex,
  isUnsupportedChain,
  requestAccounts,
  readChainId,
  switchOrAddChain,
} from "../src/services/walletProvider.js";
import { formatAddress } from "../src/utils/accessControl.js";

let passed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}\n  ${error.message}`);
    process.exitCode = 1;
  }
}

function eq(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
}

// 1. Provider detection
await test("detect provider returns null without window.ethereum", () => {
  eq(detectInjectedProvider({}), null);
});

await test("detect provider returns an injected provider with request()", () => {
  const injected = { request: async () => [] };
  eq(detectInjectedProvider({ ethereum: injected }), injected);
});

await test("detect provider ignores ethereum objects without request()", () => {
  eq(detectInjectedProvider({ ethereum: {} }), null);
});

// 2. Chain-id handling (network change / unsupported network)
await test("normalizeChainId parses hex, decimal, bigint, null", () => {
  eq(normalizeChainId("0x539"), 1337);
  eq(normalizeChainId(1337), 1337);
  eq(normalizeChainId(1337n), 1337);
  eq(normalizeChainId(null), null);
});

await test("toChainIdHex converts 1337 to 0x539", () => {
  eq(toChainIdHex(1337), "0x539");
});

await test("isUnsupportedChain flags wrong chain, ignores unknown", () => {
  eq(isUnsupportedChain(1, 1337), true);
  eq(isUnsupportedChain(1337, 1337), false);
  eq(isUnsupportedChain("0x539", 1337), false);
  eq(isUnsupportedChain(null, 1337), false);
});

await test("readChainId reads chain id from provider", async () => {
  const provider = { getNetwork: async () => ({ chainId: 1337n }) };
  eq(await readChainId(provider), 1337);
});

// 3. Connection success / rejection / no account
await test("requestAccounts returns accounts on success", async () => {
  const provider = {
    send: async (method) => {
      eq(method, "eth_requestAccounts");
      return ["0xAbC"];
    },
  };
  eq(await requestAccounts(provider), ["0xAbC"]);
});

await test("requestAccounts rejects when no account returned", async () => {
  const provider = { send: async () => [] };
  await assert.rejects(requestAccounts(provider), (error) => error.code === "NO_ACCOUNT");
});

await test("requestAccounts surfaces MetaMask rejection (4001)", async () => {
  const provider = {
    send: async () => {
      const error = new Error("User rejected request");
      error.code = 4001;
      throw error;
    },
  };
  await assert.rejects(requestAccounts(provider), (error) => error.code === 4001);
});

// 4. Account change / disconnection
await test("pickPrimaryAccount handles connect, change and disconnect", () => {
  eq(pickPrimaryAccount(["0xA"]), "0xA");
  eq(pickPrimaryAccount(["0xB"]), "0xB");
  eq(pickPrimaryAccount([]), "");
  eq(pickPrimaryAccount(undefined), "");
});

// 5. Network switch / add
await test("switchOrAddChain switches to an existing chain", async () => {
  const calls = [];
  const injected = {
    request: async ({ method, params }) => {
      calls.push(method);
      if (method === "wallet_switchEthereumChain") eq(params[0].chainId, "0x539");
    },
  };
  eq(
    await switchOrAddChain(injected, { chainId: 1337, addParams: { chainId: "0x539" } }),
    "switched"
  );
  eq(calls, ["wallet_switchEthereumChain"]);
});

await test("switchOrAddChain adds the chain when MetaMask reports 4902", async () => {
  const calls = [];
  let firstAttempt = true;
  const injected = {
    request: async ({ method }) => {
      calls.push(method);
      if (method === "wallet_switchEthereumChain" && firstAttempt) {
        firstAttempt = false;
        const error = new Error("Unrecognized chain");
        error.code = 4902;
        throw error;
      }
    },
  };
  eq(
    await switchOrAddChain(injected, {
      chainId: 1337,
      addParams: { chainId: "0x539", chainName: "Ganache Local" },
    }),
    "added"
  );
  eq(calls, [
    "wallet_switchEthereumChain",
    "wallet_addEthereumChain",
    "wallet_switchEthereumChain",
  ]);
});

await test("switchOrAddChain rejects when no provider is detected", async () => {
  await assert.rejects(switchOrAddChain(null, { chainId: 1337, addParams: {} }), (error) => error.code === "NO_WALLET");
});

await test("switchOrAddChain surfaces user rejection (4001)", async () => {
  const injected = {
    request: async () => {
      const error = new Error("User rejected request");
      error.code = 4001;
      throw error;
    },
  };
  await assert.rejects(switchOrAddChain(injected, { chainId: 1337, addParams: {} }), (error) => error.code === 4001);
});

// 6. Address display
await test("formatAddress shortens a wallet address", () => {
  eq(
    formatAddress("0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", 6, 4),
    "0x90F8...c9C1"
  );
});

console.log(`\n===== ALL ${passed} WALLET TESTS PASSED =====`);
