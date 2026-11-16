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
const ZERO = ethers.ZeroAddress;

let passed = 0;

function loadAbi() {
  if (!fs.existsSync(ABI_PATH)) {
    throw new Error(
      'Compiled ABI not found. Run "npm run compile" in the blockchain folder first.'
    );
  }

  return JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
}

function check(label, condition) {
  assert.ok(condition, `${label}: assertion failed`);
  passed += 1;
  console.log(`PASS: ${label}`);
}

async function reverts(action, label) {
  let reverted = false;

  try {
    const tx = await action();
    await tx.wait();
  } catch {
    reverted = true;
  }

  assert.equal(reverted, true, `${label}: expected revert but transaction succeeded`);
  passed += 1;
  console.log(`PASS: ${label}`);
}

async function send(action) {
  const tx = await action();
  return tx.wait();
}

function findEvent(receipt, contract, eventName) {
  for (const log of receipt.logs) {
    let parsed;

    try {
      parsed = contract.interface.parseLog(log);
    } catch {
      continue;
    }

    if (parsed && parsed.name === eventName) return parsed;
  }

  return null;
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

  // Ganache test accounts: 0 = admin/deployer, 1 = student, 2 = faculty, 3 = outsider
  const admin = await provider.getSigner(0);
  const student = await provider.getSigner(1);
  const faculty = await provider.getSigner(2);
  const outsider = await provider.getSigner(3);

  const adminAddress = await admin.getAddress();
  const studentAddress = await student.getAddress();
  const facultyAddress = await faculty.getAddress();
  const outsiderAddress = await outsider.getAddress();

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

  const studentInfo = await contract.getIdentity(studentAddress);
  const facultyInfo = await contract.getIdentity(facultyAddress);

  if (studentInfo[0] || facultyInfo[0]) {
    throw new Error(
      "Test accounts are already registered on this chain. Restart Ganache for a clean run, then redeploy."
    );
  }

  console.log("\n===== DecentraID Smart Contract Tests =====\n");

  // 1. Ownership
  check(
    "Contract owner is the deployer/admin",
    owner.toLowerCase() === adminAddress.toLowerCase()
  );

  // 2. Student registration
  const studentRegistration = await send(() =>
    contract.connect(student).registerIdentity()
  );
  check(
    "Student identity registered and verified",
    await contract.verifyIdentity(studentAddress)
  );

  let status = await contract.getIdentityStatus(studentAddress);
  check(
    "Newly registered student is active but has no role",
    status[0] === true && status[1] === true && status[2] === false
  );

  const registrationEvent = findEvent(
    studentRegistration,
    contract,
    "IdentityRegistered"
  );
  check(
    "IdentityRegistered event emitted with correct user",
    registrationEvent &&
      ethers.getAddress(registrationEvent.args.user) === studentAddress
  );

  // 3. Duplicate registration
  await reverts(
    () => contract.connect(student).registerIdentity(),
    "Duplicate registration rejected"
  );

  // 4. Faculty registration
  await send(() => contract.connect(faculty).registerIdentity());
  check(
    "Faculty identity registered and verified",
    await contract.verifyIdentity(facultyAddress)
  );

  // 5. Zero-address validation
  await reverts(
    () => contract.assignRole(ZERO, ROLE.STUDENT),
    "Zero-address role assignment rejected"
  );
  await reverts(
    () => contract.deactivateIdentity(ZERO),
    "Zero-address deactivation rejected"
  );
  await reverts(
    () => contract.reactivateIdentity(ZERO),
    "Zero-address reactivation rejected"
  );

  // 6. Unauthorized role assignment
  await reverts(
    () =>
      contract.connect(outsider).assignRole(facultyAddress, ROLE.STUDENT),
    "Unauthorized role assignment rejected"
  );

  // 7. Student role assignment
  const studentRoleTx = await send(() =>
    contract.assignRole(studentAddress, ROLE.STUDENT)
  );
  check(
    "Student role assigned and access granted",
    await contract.checkAccess(studentAddress, ROLE.STUDENT)
  );
  check(
    "Student role stored in identity",
    Number((await contract.getIdentity(studentAddress))[2]) === ROLE.STUDENT
  );

  status = await contract.getIdentityStatus(studentAddress);
  check("Role-assigned student reports hasRole", status[2] === true);

  const roleEvent = findEvent(studentRoleTx, contract, "RoleAssigned");
  check(
    "RoleAssigned event emitted with correct user and role",
    roleEvent &&
      ethers.getAddress(roleEvent.args.user) === studentAddress &&
      Number(roleEvent.args.role) === ROLE.STUDENT
  );

  // 8. Faculty role assignment
  await send(() => contract.assignRole(facultyAddress, ROLE.FACULTY));
  check(
    "Faculty role assigned and access granted",
    await contract.checkAccess(facultyAddress, ROLE.FACULTY)
  );

  // 9. Wrong-role access
  check(
    "Student denied faculty access",
    (await contract.checkAccess(studentAddress, ROLE.FACULTY)) === false
  );
  check(
    "Faculty denied student access",
    (await contract.checkAccess(facultyAddress, ROLE.STUDENT)) === false
  );

  // 10. Admin privilege escalation
  await reverts(
    () => contract.assignRole(studentAddress, ROLE.ADMIN),
    "Assigning ADMIN role rejected"
  );

  // 11. NONE role is never an access grant
  check(
    "checkAccess with NONE role returns false",
    (await contract.checkAccess(studentAddress, ROLE.NONE)) === false
  );

  // 12. Unauthorized deactivation
  await reverts(
    () => contract.connect(outsider).deactivateIdentity(studentAddress),
    "Unauthorized deactivation rejected"
  );

  // 13. Admin deactivation
  const deactivationTx = await send(() =>
    contract.deactivateIdentity(studentAddress)
  );
  check(
    "Deactivated identity is no longer verified",
    (await contract.verifyIdentity(studentAddress)) === false
  );

  status = await contract.getIdentityStatus(studentAddress);
  check("Deactivated identity reports inactive", status[1] === false);
  check(
    "Inactive identity denied role access",
    (await contract.checkAccess(studentAddress, ROLE.STUDENT)) === false
  );

  const deactivationEvent = findEvent(
    deactivationTx,
    contract,
    "IdentityDeactivated"
  );
  check(
    "IdentityDeactivated event emitted with correct user",
    deactivationEvent &&
      ethers.getAddress(deactivationEvent.args.user) === studentAddress
  );

  // 14. Deactivated identity cannot re-register (no role reset loophole)
  await reverts(
    () => contract.connect(student).registerIdentity(),
    "Deactivated identity cannot re-register"
  );

  // 15. Unauthorized reactivation
  await reverts(
    () => contract.connect(outsider).reactivateIdentity(studentAddress),
    "Unauthorized reactivation rejected"
  );

  // 16. Admin reactivation
  const reactivationTx = await send(() =>
    contract.reactivateIdentity(studentAddress)
  );
  check(
    "Reactivated identity is verified again",
    await contract.verifyIdentity(studentAddress)
  );
  check(
    "Reactivated identity access restored",
    await contract.checkAccess(studentAddress, ROLE.STUDENT)
  );

  const reactivationEvent = findEvent(
    reactivationTx,
    contract,
    "IdentityReactivated"
  );
  check(
    "IdentityReactivated event emitted with correct user",
    reactivationEvent &&
      ethers.getAddress(reactivationEvent.args.user) === studentAddress
  );

  // 17. Identity information retrieval
  const identity = await contract.getIdentity(studentAddress);
  check(
    "Identity details retrieved correctly",
    identity[0] === true &&
      identity[1] === true &&
      Number(identity[2]) === ROLE.STUDENT &&
      Number(identity[3]) > 0
  );

  // 18. Unregistered account has default, no-access state
  check(
    "Unregistered account is not verified",
    (await contract.verifyIdentity(outsiderAddress)) === false
  );
  check(
    "Unregistered account denied access",
    (await contract.checkAccess(outsiderAddress, ROLE.STUDENT)) === false
  );

  const unknown = await contract.getIdentity(outsiderAddress);
  check(
    "Unregistered account has default identity values",
    unknown[0] === false &&
      unknown[1] === false &&
      Number(unknown[2]) === ROLE.NONE &&
      Number(unknown[3]) === 0
  );

  // 19. Registered but role-less identity is active yet unauthorized
  await send(() => contract.connect(outsider).registerIdentity());
  status = await contract.getIdentityStatus(outsiderAddress);
  check(
    "Registered role-less identity is registered and active",
    status[0] === true && status[1] === true
  );
  check(
    "Registered role-less identity reports no role (distinguished from active)",
    status[2] === false
  );
  check(
    "Registered role-less identity denied role access",
    (await contract.checkAccess(outsiderAddress, ROLE.STUDENT)) === false
  );

  // 20. Admin access is owner-only
  check(
    "Contract owner passes ADMIN access",
    (await contract.checkAccess(adminAddress, ROLE.ADMIN)) === true
  );
  check(
    "Student denied ADMIN access",
    (await contract.checkAccess(studentAddress, ROLE.ADMIN)) === false
  );
  check(
    "Faculty denied ADMIN access",
    (await contract.checkAccess(facultyAddress, ROLE.ADMIN)) === false
  );
  check(
    "Unregistered non-owner denied ADMIN access",
    (await contract.checkAccess(outsiderAddress, ROLE.ADMIN)) === false
  );

  // 21. Non-owner cannot perform admin-only operations
  await reverts(
    () => contract.connect(student).assignRole(facultyAddress, ROLE.FACULTY),
    "Student cannot assign roles (admin-only)"
  );
  await reverts(
    () => contract.connect(faculty).deactivateIdentity(studentAddress),
    "Faculty cannot deactivate identities (admin-only)"
  );

  console.log(`\n===== ALL ${passed} TESTS PASSED =====`);
  console.log("Admin:  ", adminAddress);
  console.log("Student:", studentAddress);
  console.log("Faculty:", facultyAddress);
  console.log("Outsider:", outsiderAddress);
}

main().catch((error) => {
  console.error("\nTEST FAILED:", error.message);
  process.exitCode = 1;
});
