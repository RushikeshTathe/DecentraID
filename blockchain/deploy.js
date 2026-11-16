
import { ethers } from "ethers";
import fs from "fs";

const provider = new ethers.JsonRpcProvider(
  "http://127.0.0.1:7545"
);

const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("DEPLOYER_PRIVATE_KEY is not configured");
}

const wallet = new ethers.Wallet(privateKey, provider);

const abi = JSON.parse(
  fs.readFileSync(
    "./artifacts/contracts_IdentityAccessManager_sol_IdentityAccessManager.abi",
    "utf8"
  )
);

const bytecode = "0x" + fs.readFileSync(
  "./artifacts/contracts_IdentityAccessManager_sol_IdentityAccessManager.bin",
  "utf8"
).trim();

async function main() {
  console.log("Deploying from:", wallet.address);

  const factory = new ethers.ContractFactory(
    abi,
    bytecode,
    wallet
  );

  const contract = await factory.deploy();
  await contract.waitForDeployment();

  console.log("Deployment successful!");
  console.log("Contract address:", await contract.getAddress());
  console.log("Transaction hash:", contract.deploymentTransaction().hash);
}

main().catch(console.error);
