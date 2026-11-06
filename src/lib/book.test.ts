// The diary's scroll -> page mapping. Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { bookPosition, restAt } from "./book";

test("scroll progress rests, turns, rests (3 spreads)", () => {
  assert.equal(bookPosition(-1, 3), 0);
  assert.equal(bookPosition(0.1, 3), 0); // resting on spread 1
  assert.equal(bookPosition(0.3, 3), 0.5); // halfway through the first turn
  assert.equal(bookPosition(0.5, 3), 1); // resting on spread 2
  assert.equal(bookPosition(0.7, 3), 1.5);
  assert.equal(bookPosition(1, 3), 2);
  assert.equal(bookPosition(2, 3), 2);
});

test("each spread's rest point maps back to that spread", () => {
  for (let i = 0; i < 3; i++) assert.equal(bookPosition(restAt(i, 3), 3), i);
});
