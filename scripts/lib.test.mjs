import test from "node:test";
import assert from "node:assert/strict";
import { classify, startSeconds, videoId } from "./lib.mjs";

test("videoId", () => {
  assert.equal(videoId("https://www.youtube.com/watch?v=aircAruvnKk&t=5s"), "aircAruvnKk");
  assert.equal(videoId("https://youtu.be/aircAruvnKk?t=90"), "aircAruvnKk");
  assert.equal(videoId("https://example.com/watch?v=aircAruvnKk"), null);
  assert.equal(videoId("not a url"), null);
});
test("startSeconds", () => {
  assert.equal(startSeconds("https://youtu.be/x?t=90"), 90);
  assert.equal(startSeconds("https://youtu.be/x?t=1h2m3s"), 3723);
  assert.equal(startSeconds("https://youtu.be/x"), null);
});
test("classify", () => {
  assert.deepEqual(classify("MIT 6.006 Lecture: sorting algorithms", "math"), { topic: "computer-science", level: "university", matched: true });
  assert.equal(classify("zzz", "arts").topic, "arts");
  assert.equal(classify("zzz", "arts").matched, false);
  assert.equal(classify("Why is Ukraine the West's Fault?", "arts").matched, false);
  assert.equal(classify("Rapid capital markets", "arts").topic === "computer-science", false);
});
