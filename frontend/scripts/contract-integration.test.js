// Integration checks for the frontend contract layer.
// 1. Always validates the shipped frontend ABI (functions, events, types).
// 2. If CONTRACT_ADDRESS is set and Ganache is running, exercises real reads
//    and transactions using exactly that ABI.
// Run: npm run test:integration
import assert from "assert";
import { ethers } from "ethers";
import identityAccessManagerAbi from "../src/config/identityAccessManagerAbi.js";

const RPC_URL = process.env.GANACHE_RPC_URL || "http://127.0.0.1:7545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ROLE = { NONE: 0, STUDENT: 1, FACULTY: 2, ADMIN: 3 };
const ZERO = ethers.ZeroAddress;

let passed = 0;

function ok(label, condition) {
  assert.ok(condition, `${label}: assertion failed`);
  passed += 1;
  console.log(`PASS: ${label}`);
}

function findEntry(type, name) {
  return identityAccessManagerAbi.find((entry) => entry.type === type && entry.name === name);
}

function inputTypes(entry) {
  return (entry?.inputs || []).map((input) => input.type).join(",");
}

function outputTypes(entry) {
  return (entry?.outputs || []).map((output) => output.type).join(",");
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

function findEvent(receipt, contract, name) {
  for (const log of receipt.logs) {
    let parsed;
    try {
      parsed = contract.interface.parseLog(log);
    } catch {
      continue;
    }
    if (parsed && parsed.name === name) return parsed;
  }
  return null;
}

async function main() {
  console.log("\n===== Frontend ABI checks =====\n");

  ok("ABI file exports a non-empty array", Array.isArray(identityAccessManagerAbi) && identityAccessManagerAbi.length > 0);

  const expectedFunctions = [
    ["registerIdentity", "", ""],
    ["assignRole", "address,uint8", ""],
    ["verifyIdentity", "address", "bool"],
    ["getIdentityStatus", "address", "bool,bool,bool"],
    ["checkAccess", "address,uint8", "bool"],
    ["deactivateIdentity", "address", ""],
    ["reactivateIdentity", "address", ""],
    ["getIdentity", "address", "bool,bool,uint8,uint256"],
    ["owner", "", "address"],
  ];

  for (const [name, inputs, outputs] of expectedFunctions) {
    const entry = findEntry("function", name);
    ok(`ABI has function ${name}(${inputs})`, Boolean(entry));
    ok(`ABI ${name} input types`, inputTypes(entry) === inputs);
    ok(`ABI ${name} output types`, outputTypes(entry) === outputs);
  }

  const expectedEvents = [
    ["IdentityRegistered", "address"],
    ["RoleAssigned", "address,uint8"],
    ["IdentityDeactivated", "address"],
    ["IdentityReactivated", "address"],
  ];

  for (const [name, inputs] of expectedEvents) {
    const entry = findEntry("event", name);
    ok(`ABI has event ${name}(${inputs})`, Boolean(entry));
    ok(`ABI ${name} event input types`, inputTypes(entry) === inputs);
  }

  ok("invalid address is rejected", !ethers.isAddress("0xnot-an-address"));
  ok("valid address is accepted", ethers.isAddress("0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"));

  if (!CONTRACT_ADDRESS) {
    console.log("\nNo CONTRACT_ADDRESS set: skipping live Ganache checks.");
    console.log(`\n===== ${passed} ABI TESTS PASSED =====`);
    return;
  }

  ok("CONTRACT_ADDRESS is a valid address", ethers.isAddress(CONTRACT_ADDRESS));

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  let network;
  try {
    network = await provider.getNetwork();
  } catch {
    throw new Error(`Could not reach Ganache at ${RPC_URL}. Start it with "npm run ganache".`);
  }
  ok("connected to Ganache chain 1337", Number(network.chainId) === 1337);

  const admin = await provider.getSigner(0);
  const student = await provider.getSigner(1);
  const faculty = await provider.getSigner(2);
  const adminAddress = await admin.getAddress();
  const studentAddress = await student.getAddress();
  const facultyAddress = await faculty.getAddress();

  const contract = new ethers.Contract(CONTRACT_ADDRESS, identityAccessManagerAbi, admin);
  const owner = await contract.owner();
  ok("owner() matches Ganache account #0", owner.toLowerCase() === adminAddress.toLowerCase());

  if ((await contract.getIdentity(studentAddress))[0]) {
    throw new Error("Test accounts already registered. Restart Ganache and redeploy for a clean run.");
  }

  console.log("\n===== Live contract checks =====\n");

  const initialStatus = await contract.getIdentityStatus(studentAddress);
  ok(
    "getIdentityStatus returns unregistered state",
    initialStatus[0] === false && initialStatus[1] === false && initialStatus[2] === false
  );
  ok("verifyIdentity false before registration", (await contract.verifyIdentity(studentAddress)) === false);
  ok("checkAccess false before registration", (await contract.checkAccess(studentAddress, ROLE.STUDENT)) === false);

  const studentRegTx = await contract.connect(student).registerIdentity();
  const studentReceipt = await studentRegTx.wait();
  ok("student registration transaction mined", studentReceipt.status === 1);
  ok("student registration returns a tx hash", /^0x[0-9a-f]{64}$/i.test(studentRegTx.hash));
  ok("student registered", await contract.verifyIdentity(studentAddress));

  const studentIdentity = await contract.getIdentity(studentAddress);
  ok(
    "getIdentity shows registered, active and no role",
    studentIdentity[0] === true &&
      studentIdentity[1] === true &&
      Number(studentIdentity[2]) === ROLE.NONE &&
      Number(studentIdentity[3]) > 0
  );

  const registeredEvent = findEvent(studentReceipt, contract, "IdentityRegistered");
  ok(
    "IdentityRegistered event has student address",
    registeredEvent && ethers.getAddress(registeredEvent.args.user) === studentAddress
  );

  await reverts(() => contract.connect(student).registerIdentity(), "duplicate registration rejected");

  const facultyRegTx = await contract.connect(faculty).registerIdentity();
  await facultyRegTx.wait();
  ok("faculty registered", await contract.verifyIdentity(facultyAddress));

  await reverts(() => contract.assignRole(ZERO, ROLE.STUDENT), "zero-address role assignment rejected");
  await reverts(() => contract.deactivateIdentity(ZERO), "zero-address deactivation rejected");
  await reverts(
    () => contract.connect(student).assignRole(facultyAddress, ROLE.STUDENT),
    "non-owner role assignment rejected"
  );

  const roleTx = await contract.assignRole(studentAddress, ROLE.STUDENT);
  const roleReceipt = await roleTx.wait();
  ok("student role assigned", await contract.checkAccess(studentAddress, ROLE.STUDENT));
  ok("student denied faculty access", (await contract.checkAccess(studentAddress, ROLE.FACULTY)) === false);

  const roleEvent = findEvent(roleReceipt, contract, "RoleAssigned");
  ok(
    "RoleAssigned event has STUDENT role",
    roleEvent &&
      Number(roleEvent.args.role) === ROLE.STUDENT &&
      ethers.getAddress(roleEvent.args.user) === studentAddress
  );

  await (await contract.assignRole(facultyAddress, ROLE.FACULTY)).wait();
  ok("faculty role assigned", await contract.checkAccess(facultyAddress, ROLE.FACULTY));

  ok("owner passes ADMIN access", (await contract.checkAccess(adminAddress, ROLE.ADMIN)) === true);
  ok("student denied ADMIN access", (await contract.checkAccess(studentAddress, ROLE.ADMIN)) === false);
  ok("faculty denied ADMIN access", (await contract.checkAccess(facultyAddress, ROLE.ADMIN)) === false);

  const deactivateTx = await contract.deactivateIdentity(studentAddress);
  const deactivateReceipt = await deactivateTx.wait();
  ok("student deactivated", (await contract.verifyIdentity(studentAddress)) === false);
  ok("inactive student denied access", (await contract.checkAccess(studentAddress, ROLE.STUDENT)) === false);
  ok("IdentityDeactivated event emitted", Boolean(findEvent(deactivateReceipt, contract, "IdentityDeactivated")));

  await reverts(
    () => contract.connect(faculty).reactivateIdentity(studentAddress),
    "non-owner reactivation rejected"
  );

  const reactivateTx = await contract.reactivateIdentity(studentAddress);
  const reactivateReceipt = await reactivateTx.wait();
  ok("student reactivated", await contract.verifyIdentity(studentAddress));
  ok("reactivated student access restored", await contract.checkAccess(studentAddress, ROLE.STUDENT));
  ok("IdentityReactivated event emitted", Boolean(findEvent(reactivateReceipt, contract, "IdentityReactivated")));

  const registeredEvents = await contract.queryFilter(contract.filters.IdentityRegistered(), 0);
  ok("IdentityRegistered events can be queried", registeredEvents.length >= 2);

  const activityEvents = await Promise.all([
    contract.queryFilter(contract.filters.IdentityRegistered(), 0),
    contract.queryFilter(contract.filters.RoleAssigned(), 0),
    contract.queryFilter(contract.filters.IdentityDeactivated(), 0),
    contract.queryFilter(contract.filters.IdentityReactivated(), 0),
  ]);
  ok("all four event types readable", activityEvents.every((list) => list.length >= 1));
  ok(
    "event records include block numbers and tx hashes",
    activityEvents
      .flat()
      .every((event) => Number(event.blockNumber) >= 0 && /^0x[0-9a-f]{64}$/i.test(event.transactionHash))
  );

  console.log(`\n===== ALL ${passed} INTEGRATION TESTS PASSED =====`);
}

main().catch((error) => {
  console.error("\nINTEGRATION TEST FAILED:", error.message);
  process.exitCode = 1;
});
