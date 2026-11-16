
import { ethers } from "ethers";
import fs from "fs";
import assert from "assert";

const RPC_URL = "http://127.0.0.1:7545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Set CONTRACT_ADDRESS before running tests");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Ganache test accounts
const admin = await provider.getSigner(0);
const student = await provider.getSigner(1);
const faculty = await provider.getSigner(2);

const abi = JSON.parse(
  fs.readFileSync(
    "./artifacts/contracts_IdentityAccessManager_sol_IdentityAccessManager.abi",
    "utf8"
  )
);

const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  abi,
  admin
);

async function main() {
  const adminAddress = await admin.getAddress();
  const studentAddress = await student.getAddress();
  const facultyAddress = await faculty.getAddress();

  console.log("\n===== DecentraID Smart Contract Tests =====\n");

  // Test 1: Student registration
  await (await contract.connect(student).registerIdentity()).wait();
  assert.equal(
    await contract.verifyIdentity(studentAddress),
    true
  );
  console.log("PASS: Student identity registered");

  // Test 2: Faculty registration
  await (await contract.connect(faculty).registerIdentity()).wait();
  assert.equal(
    await contract.verifyIdentity(facultyAddress),
    true
  );
  console.log("PASS: Faculty identity registered");

  // Test 3: Admin assigns Student role (enum value 1)
  await (await contract.assignRole(studentAddress, 1)).wait();
  assert.equal(
    await contract.checkAccess(studentAddress, 1),
    true
  );
  console.log("PASS: Student role assigned and access granted");

  // Test 4: Admin assigns Faculty role (enum value 2)
  await (await contract.assignRole(facultyAddress, 2)).wait();
  assert.equal(
    await contract.checkAccess(facultyAddress, 2),
    true
  );
  console.log("PASS: Faculty role assigned and access granted");

  // Test 5: Wrong role must be denied
  assert.equal(
    await contract.checkAccess(studentAddress, 2),
    false
  );
  console.log("PASS: Student denied Faculty access");

  // Test 6: Deactivate Student
  await (await contract.deactivateIdentity(studentAddress)).wait();
  assert.equal(
    await contract.verifyIdentity(studentAddress),
    false
  );
  assert.equal(
    await contract.checkAccess(studentAddress, 1),
    false
  );
  console.log("PASS: Deactivated Student access denied");

  // Test 7: Reactivate Student
  await (await contract.reactivateIdentity(studentAddress)).wait();
  assert.equal(
    await contract.verifyIdentity(studentAddress),
    true
  );
  assert.equal(
    await contract.checkAccess(studentAddress, 1),
    true
  );
  console.log("PASS: Reactivated Student access restored");

  // Test 8: Non-admin cannot assign roles
  let accessControlPassed = false;

  try {
    await (
      await contract.connect(student).assignRole(facultyAddress, 1)
    ).wait();
  } catch {
    accessControlPassed = true;
  }

  assert.equal(accessControlPassed, true);
  console.log("PASS: Non-admin role assignment rejected");

  // Test 9: Read identity details
  const identity = await contract.getIdentity(studentAddress);

  assert.equal(identity[0], true);
  assert.equal(identity[1], true);
  assert.equal(Number(identity[2]), 1);

  console.log("PASS: Student identity details retrieved");

  console.log("\n===== ALL 9 TESTS PASSED =====");
  console.log("Admin:", adminAddress);
  console.log("Student:", studentAddress);
  console.log("Faculty:", facultyAddress);
}

main().catch((error) => {
  console.error("\nTEST FAILED:", error.message);
  process.exitCode = 1;
});
