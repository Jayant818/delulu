// Try-on ideas from the chat (Jayant TG 3761): the untrusted model JSON is filtered. Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLooks } from "./looks";

test("only hair and nails ideas get through, at most 3, clipped", () => {
  const raw = 'Sure! {"looks": [{"kind": "hair", "label": "Soft waves for the rooftop", "prompt": "Loose soft waves"}, {"kind": "outfit", "label": "Red dress", "prompt": "a red dress"}, {"kind": "nails", "label": "Glossy red", "prompt": "' + "x".repeat(300) + '"}, {"kind": "hair", "label": "Sleek bun", "prompt": "Sleek low bun"}, {"kind": "nails", "label": "Fourth", "prompt": "nude"}]}';
  const looks = parseLooks(raw)!;
  assert.equal(looks.length, 3);
  assert.deepEqual(looks.map((l) => l.kind), ["hair", "nails", "hair"], "no outfit idea (clothes try-on is not built)");
  assert.equal(looks[1].prompt.length, 120);
});

test("face ideas (lashes, makeup) get through", () => {
  assert.deepEqual(parseLooks('{"looks": [{"kind": "face", "label": "Wispy lashes", "prompt": "Wispy natural lashes"}]}')?.map((l) => l.kind), ["face"]);
});

test("garbage gives null, so the app shows the fixed chips", () => {
  assert.equal(parseLooks("[MOCK, no model configured]"), null);
  assert.equal(parseLooks('{"looks": []}'), null);
  assert.equal(parseLooks('{"looks": [{"kind": "outfit", "label": "x", "prompt": "y"}]}'), null);
});
