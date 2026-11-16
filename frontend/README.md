# DecentraID frontend

Responsive React + Vite dashboard for the `IdentityAccessManager` contract in `../blockchain`.

## Run locally

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Connect a deployment

After deploying `IdentityAccessManager`, set these values in `.env.local` and restart Vite:

```dotenv
VITE_CONTRACT_ADDRESS=0x<deployed-contract-address>
VITE_CHAIN_ID=<deployed-chain-id>
VITE_DEPLOYMENT_BLOCK=<deployment-block-number>
VITE_BLOCK_EXPLORER_TX_URL=https://<network-explorer>/tx
```

The contract address is intentionally blank until deployment. `VITE_CHAIN_ID` and the explorer URL are optional; when set, the app checks the selected network and only links transaction hashes to that configured explorer. The ABI in `src/config/identityAccessManagerAbi.js` matches the Solidity contract in this repository. Event scanning starts at `VITE_DEPLOYMENT_BLOCK`.

## Demo mode

The home page offers student, faculty, and admin walkthroughs when no contract address is configured. Demo profiles and activity are static sample records, visibly labeled as demo, and admin writes are disabled. They do not generate or imply successful transactions. Identity verification also has a separate sample-record switch.

## Data and security notes

- Full name, email, and department are not contract arguments. The prototype stores them in the current browser's `localStorage`; they are not synchronized between browsers or devices.
- Wallet authentication asks MetaMask to sign a newly generated challenge and locally recovers the signer. There is no backend in this project to issue or verify a server-side nonce, establish a durable session, or prevent challenge replay across clients. Do not treat this client-only proof as authorization for external services.
- Protected pages recheck identity registration, active status, owner, and role against the contract during authentication. Account or network changes clear the authenticated state. External APIs and campus resources must independently enforce authorization on their server side.
- The Solidity contract restricts administrative writes to its owner. Frontend visibility is not the security boundary.
- Never enter a seed phrase or private key. MetaMask handles signing and transaction approval.

## Scripts

- `npm run dev` starts the development server.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the production bundle locally.