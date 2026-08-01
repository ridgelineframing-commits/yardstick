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

test("desktop HTML5 plan drops are enabled and handled across the app", () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src-tauri", "tauri.conf.json"), "utf8"));
  const html = fs.readFileSync(path.join(__dirname, "..", "app", "index.html"), "utf8");
  assert.equal(config.app.windows[0].dragDropEnabled, false);
  assert.match(html, /document\.addEventListener\('drop',/);
  assert.match(html, /function droppedPlanFile\(dt\)/);
});

test("beta wall workflow is present in the canonical shell", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "app", "index.html"), "utf8");
  assert.match(html, />Beta Features</);
  assert.match(html, /data-tool="exterior"/);
  assert.match(html, /data-tool="interior"/);
  assert.match(html, /id="btnBuildRooms"/);
});
