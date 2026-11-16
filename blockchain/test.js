import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import assert from "assert";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.GANACHE_RPC_URL || "http://127.0.0.1:7545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ABI_PATH = path.join(
  __dirname,
  "artifacts",
  "contracts_IdentityAccessManager_sol_IdentityAccessManager.abi"
);

const ROLE = { NONE: 0, STUDENT: 1, FACULTY: 2, ADMIN: 3 };

function loadAbi() {
  if (!fs.existsSync(ABI_PATH)) {
    throw new Error(
      'Compiled ABI not found. Run "npm run compile" in the blockchain folder first.'
    );
  }

  return JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
}

async function main() {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "CONTRACT_ADDRESS is not set. Deploy first with \"npm run deploy\", then in PowerShell run:\n" +
        '  $env:CONTRACT_ADDRESS="0xYOUR_DEPLOYED_CONTRACT_ADDRESS"'
    );
  }

  if (!ethers.isAddress(CONTRACT_ADDRESS)) {
    throw new Error(
      `CONTRACT_ADDRESS is not a valid Ethereum address: ${CONTRACT_ADDRESS}`
    );
  }

  const abi = loadAbi();
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    await provider.getBlockNumber();
  } catch {
    throw new Error(
      `Could not reach a blockchain at ${RPC_URL}. Start Ganache with "npm run ganache".`
    );
  }

  // Ganache test accounts: 0 = admin/deployer, 1 = student, 2 = faculty
  const admin = await provider.getSigner(0);
  const student = await provider.getSigner(1);
  const faculty = await provider.getSigner(2);

  const adminAddress = await admin.getAddress();
  const studentAddress = await student.getAddress();
  const facultyAddress = await faculty.getAddress();

  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, admin);

  let owner;
  try {
    owner = await contract.owner();
  } catch {
    throw new Error(
      `No IdentityAccessManager contract found at ${CONTRACT_ADDRESS}. Deploy it first.`
    );
  }

  if (owner.toLowerCase() !== adminAddress.toLowerCase()) {
    throw new Error(
      "Ganache account #0 is not the contract owner. Restart Ganache fresh and deploy using account #0's private key."
    );
  }

  if (await contract.verifyIdentity(studentAddress)) {
    throw new Error(
      "Test accounts are already registered on this chain. Restart Ganache for a clean run, then redeploy."
    );
  }

  console.log("\n===== DecentraID Smart Contract Tests =====\n");

  // 1. Student registration
  await (await contract.connect(student).registerIdentity()).wait();
  assert.equal(await contract.verifyIdentity(studentAddress), true);
  console.log("PASS: Student identity registered");

  // 2. Duplicate registration rejected
  let duplicateRejected = false;

  try {
    await (await contract.connect(student).registerIdentity()).wait();
  } catch {
    duplicateRejected = true;
  }

  assert.equal(duplicateRejected, true);
  console.log("PASS: Duplicate registration rejected");

  // 3. Faculty registration
  await (await contract.connect(faculty).registerIdentity()).wait();
  assert.equal(await contract.verifyIdentity(facultyAddress), true);
  console.log("PASS: Faculty identity registered");

  // 4. Admin assigns Student role
  await (await contract.assignRole(studentAddress, ROLE.STUDENT)).wait();
  assert.equal(
    await contract.checkAccess(studentAddress, ROLE.STUDENT),
    true
  );
  console.log("PASS: Student role assigned and access granted");

  // 5. Admin assigns Faculty role
  await (await contract.assignRole(facultyAddress, ROLE.FACULTY)).wait();
  assert.equal(
    await contract.checkAccess(facultyAddress, ROLE.FACULTY),
    true
  );
  console.log("PASS: Faculty role assigned and access granted");

  // 6. Wrong-role access is denied
  assert.equal(
    await contract.checkAccess(studentAddress, ROLE.FACULTY),
    false
  );
  console.log("PASS: Student denied Faculty access");

  // 7. Deactivation denies access
  await (await contract.deactivateIdentity(studentAddress)).wait();
  assert.equal(await contract.verifyIdentity(studentAddress), false);
  assert.equal(
    await contract.checkAccess(studentAddress, ROLE.STUDENT),
    false
  );
  console.log("PASS: Deactivated Student access denied");

  // 8. Reactivation restores access
  await (await contract.reactivateIdentity(studentAddress)).wait();
  assert.equal(await contract.verifyIdentity(studentAddress), true);
  assert.equal(
    await contract.checkAccess(studentAddress, ROLE.STUDENT),
    true
  );
  console.log("PASS: Reactivated Student access restored");

  // 9. Non-admin cannot assign roles
  let unauthorizedRejected = false;

  try {
    await (
      await contract.connect(student).assignRole(facultyAddress, ROLE.STUDENT)
    ).wait();
  } catch {
    unauthorizedRejected = true;
  }

  assert.equal(unauthorizedRejected, true);
  console.log("PASS: Non-admin role assignment rejected");

  // 10. Identity information retrieval
  const identity = await contract.getIdentity(studentAddress);

  assert.equal(identity[0], true);
  assert.equal(identity[1], true);
  assert.equal(Number(identity[2]), ROLE.STUDENT);
  assert.ok(Number(identity[3]) > 0);
  console.log("PASS: Student identity details retrieved");

  console.log("\n===== ALL 10 TESTS PASSED =====");
  console.log("Admin:  ", adminAddress);
  console.log("Student:", studentAddress);
  console.log("Faculty:", facultyAddress);
}

main().catch((error) => {
  console.error("\nTEST FAILED:", error.message);
  process.exitCode = 1;
});
