import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.GANACHE_RPC_URL || "http://127.0.0.1:7545";
const ARTIFACTS_DIR = path.join(__dirname, "artifacts");
const ABI_PATH = path.join(
  ARTIFACTS_DIR,
  "contracts_IdentityAccessManager_sol_IdentityAccessManager.abi"
);
const BIN_PATH = path.join(
  ARTIFACTS_DIR,
  "contracts_IdentityAccessManager_sol_IdentityAccessManager.bin"
);

function loadArtifacts() {
  if (!fs.existsSync(ABI_PATH) || !fs.existsSync(BIN_PATH)) {
    throw new Error(
      'Compiled artifacts not found. Run "npm run compile" in the blockchain folder first.'
    );
  }

  return {
    abi: JSON.parse(fs.readFileSync(ABI_PATH, "utf8")),
    bytecode: "0x" + fs.readFileSync(BIN_PATH, "utf8").trim(),
  };
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY is not set. In PowerShell run:\n" +
        '  $env:DEPLOYER_PRIVATE_KEY="0xYOUR_GANACHE_ACCOUNT_PRIVATE_KEY"'
    );
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY must be a 32-byte hex string starting with 0x."
    );
  }

  const { abi, bytecode } = loadArtifacts();
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    const network = await provider.getNetwork();
    console.log(`Connected to chain ID ${network.chainId} at ${RPC_URL}`);
  } catch {
    throw new Error(
      `Could not reach a blockchain at ${RPC_URL}. Start Ganache with "npm run ganache".`
    );
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log("Deploying from:", wallet.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error(
      "Deployer account has zero balance. Use a funded Ganache account."
    );
  }

  console.log("Deploying IdentityAccessManager...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  const deploymentTransaction = contract.deploymentTransaction();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("");
  console.log("Deployment successful!");
  console.log("Contract address:", address);
  console.log("Transaction hash:", deploymentTransaction.hash);
  console.log("");
  console.log(
    "Next: add this address to frontend/.env.local as VITE_CONTRACT_ADDRESS"
  );
}

main().catch((error) => {
  console.error("");
  console.error("Deployment failed:", error.message);
  process.exitCode = 1;
});
