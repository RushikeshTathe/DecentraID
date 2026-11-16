# DecentraID – Blockchain (Smart Contract + Local Chain)

This folder contains the DecentraID smart contract and the scripts that compile, deploy, and test it against a local Ganache blockchain.

> **Note:** `Counter.sol`, `contracts/Counter.t.sol`, `test/Counter.ts`, `ignition/modules/Counter.ts`, and `scripts/send-op-tx.ts` are leftovers from the default Hardhat 3 starter template. They are **not** used by DecentraID. The supported workflow is the solcjs + Ganache + ethers flow below.

## Prerequisites

- Node.js (v22+) and npm
- Ganache (installed as a dev dependency, no global install required)

## 1. Install dependencies

```bash
npm install
```

## 2. Start Ganache (terminal 1)

```bash
npm run ganache
```

Ganache listens on `http://127.0.0.1:7545` (chain ID `1337`). Keep this terminal running.

## 3. Compile the contract

```bash
npm run compile
```

This runs `solcjs` and writes the ABI and bytecode into `artifacts/`:

- `contracts_IdentityAccessManager_sol_IdentityAccessManager.abi`
- `contracts_IdentityAccessManager_sol_IdentityAccessManager.bin`

`artifacts/` is gitignored, so always compile after a fresh clone.

## 4. Deploy (terminal 2)

Use a funded **Ganache account private key**. Never commit it.

```powershell
$env:DEPLOYER_PRIVATE_KEY="0x...private key of Ganache account #0..."
npm run deploy
```

The script prints the deployed **contract address** and **transaction hash**. Account #0 becomes the contract owner/Admin.

## 5. Run the tests (fresh Ganache recommended)

```powershell
$env:CONTRACT_ADDRESS="0x...deployed contract address..."
npm run test
```

The suite expects a freshly started Ganache with a fresh deployment. If the test accounts are already registered, restart Ganache and redeploy for a clean run.

Tests cover: student/faculty registration, duplicate-position rejection, role assignment, wrong-role denial, deactivation, reactivation, non-admin rejection, and identity retrieval.

## npm scripts

| Script | Purpose |
|---|---|
| `npm run ganache` | Start local Ganache on `127.0.0.1:7545` |
| `npm run compile` | Compile `IdentityAccessManager` with solcjs into `artifacts/` |
| `npm run deploy` | Deploy using `DEPLOYER_PRIVATE_KEY` |
| `npm run test` | Run the DecentraID contract test suite |

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | `deploy.js` | Private key of the deploying Ganache account (never commit) |
| `CONTRACT_ADDRESS` | `test.js` | Deployed contract address to test |
| `GANACHE_RPC_URL` | both | Optional RPC override (default `http://127.0.0.1:7545`) |
