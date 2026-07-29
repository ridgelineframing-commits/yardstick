const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("the inline application script parses", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "app", "index.html"), "utf8");
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<\/body>/);
  assert.ok(match, "inline application script was not found");
  assert.doesNotThrow(() => new vm.Script(match[1], { filename: "app/index.inline.js" }));
});

test("the generated app has no CDN runtime dependencies", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "src", "index.html"), "utf8");
  assert.doesNotMatch(html, /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/);
  for (const asset of ["core.js", "qa-agent.js", "sw.js", "vendor/pdf.min.js", "vendor/pdf.worker.min.js"]) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", "src", asset)), `${asset} is missing`);
  }
});
