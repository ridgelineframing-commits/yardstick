const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../app/core.js");
const qa = require("../app/qa-agent.js");

test("architectural bare values are feet by default", () => {
  assert.equal(core.parseLength("10"), 10);
  assert.equal(core.parseLength("3"), 3);
  assert.equal(core.parseLength("36\""), 3);
  assert.equal(core.parseLength("2'8\""), 2 + 8 / 12);
  assert.equal(core.parseLength("2-8"), 2 + 8 / 12);
});

test("bare values can explicitly be parsed as inches", () => {
  assert.equal(core.parseLength("36", { bareUnit: "inches" }), 3);
});

test("job normalization removes unsupported and malformed items", () => {
  const result = core.normalizeJob({
    items: [
      { id: 1, type: "room", level: "Page 1", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], name: "<img onerror=1>" },
      { id: 2, type: "unknown", at: { x: 1, y: 2 } },
      { id: 3, type: "door", at: { x: "bad", y: 1 } }
    ]
  });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, "<img onerror=1>");
  assert.equal(result.v, 4);
});

test("QA blocks quantity use when scale is missing", () => {
  const result = qa.review({ items: [], statedAreas: [] });
  assert.equal(result.summary.blockers, 1);
  assert.equal(result.findings[0].id, "scale-missing");
});

test("QA detects invalid opening dimensions", () => {
  const result = qa.review({
    feetPerUnit: 0.1,
    items: [{ id: 9, type: "door", level: "Page 1", at: { x: 1, y: 1 }, width: 0, height: 7 }]
  });
  assert.ok(result.findings.some(item => item.id === "opening-size-9"));
});

test("QA warns when detected items exist without traced rooms", () => {
  const result = qa.review({
    feetPerUnit: 0.1,
    items: [{ id: 1, type: "fixture", level: "Page 1", at: { x: 2, y: 2 }, ftype: "Sink" }]
  });
  assert.ok(result.findings.some(item => item.id === "rooms-missing"));
});
