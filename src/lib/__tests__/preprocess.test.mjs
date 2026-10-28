// Run with: npm test   (Node >= 22.18 strips TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resizeBilinearPIL, softmax, toNormalizedCHW } from "../preprocess.ts";

const fixture = JSON.parse(readFileSync(new URL("./pillow-fixture.json", import.meta.url), "utf8"));

for (const [i, c] of fixture.cases.entries()) {
  test(`bilinear resize matches Pillow exactly (case ${i}: ${c.w}x${c.h} -> ${c.outW}x${c.outH}, ${c.channels}ch)`, () => {
    const got = resizeBilinearPIL(Uint8Array.from(c.src), c.w, c.h, c.outW, c.outH, c.channels);
    assert.equal(got.length, c.expected.length);
    let maxDiff = 0;
    for (let k = 0; k < got.length; k++) maxDiff = Math.max(maxDiff, Math.abs(got[k] - c.expected[k]));
    assert.equal(maxDiff, 0, `max pixel difference vs Pillow ${fixture.pillow_version}: ${maxDiff}`);
  });
}

test("normalisation produces CHW float32 with mean/std applied", () => {
  // 2x2 image would be 4 pixels; use size=1 -> plane of 1 pixel for a clear check
  const out = toNormalizedCHW(Uint8Array.from([255, 0, 128]), 1, [0.5, 0.5, 0.5], [0.25, 0.25, 0.25]);
  assert.equal(out.length, 3);
  assert.ok(Math.abs(out[0] - 2) < 1e-6);  // R: (1 - 0.5) / 0.25
  assert.ok(Math.abs(out[1] + 2) < 1e-6);  // G: (0 - 0.5) / 0.25
});

test("softmax sums to 1 and is stable for large logits", () => {
  const p = softmax([1000, 1001, 999]);
  assert.ok(Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-12);
  assert.ok(p[1] > p[0] && p[0] > p[2]);
});
