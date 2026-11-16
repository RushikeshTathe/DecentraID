// Unit tests for activity ordering/dedupe helpers. No chain required.
import assert from "assert";
import {
  activityEventKey,
  dedupeActivityEvents,
  sortActivityEvents,
  combineActivityEvents,
} from "../src/services/eventUtils.js";

let passed = 0;

function ok(label, condition) {
  assert.ok(condition, `${label}: assertion failed`);
  passed += 1;
  console.log(`PASS: ${label}`);
}

ok(
  "activity key combines transaction hash and log index",
  activityEventKey({ transactionHash: "0xaa", index: 2 }) === "0xaa:2"
);

const sample = [
  { type: "B", transactionHash: "0xb", blockNumber: 5, index: 1 },
  { type: "A", transactionHash: "0xa", blockNumber: 5, index: 3 },
  { type: "C", transactionHash: "0xc", blockNumber: 6, index: 0 },
  { type: "D", transactionHash: "0xb", blockNumber: 5, index: 1 },
];

const deduped = dedupeActivityEvents(sample);
ok("dedupe removes duplicate log entries", deduped.length === 3);

const combined = combineActivityEvents(sample);
ok("sort orders by block desc then log index desc", combined.map((event) => event.type).join(",") === "C,A,B");

ok("empty history returns an empty list", combineActivityEvents([]).length === 0);

const byLogIndex = sortActivityEvents([
  { blockNumber: 1, logIndex: 1 },
  { blockNumber: 1, logIndex: 2 },
]);
ok("sort supports logIndex fallback", byLogIndex[0].logIndex === 2);

console.log(`\n===== ALL ${passed} ACTIVITY TESTS PASSED =====`);
