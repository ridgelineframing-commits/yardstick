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

test("desktop header keeps utilities above one permanent plan-tool row", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "app", "index.html"), "utf8");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), [], "header introduced duplicate IDs");

  const home = html.match(/<div class="ribbonPanel active" data-panel="home"[\s\S]*?<div class="ribbonPanel" data-panel="takeoff"/);
  assert.ok(home, "permanent tool row was not found");
  for (const label of ["Open", "Save", "Select", "Pan", "Room", "Door", "Window", "Plumbing", "Electrical", "Structure"]) {
    assert.match(home[0], new RegExp(`<span>${label}<\\/span>`), `${label} is missing from the permanent tool row`);
  }
  for (const label of ["Undo", "Redo", "Clear", "Excel", "PDF"]) {
    assert.doesNotMatch(home[0], new RegExp(`<span>${label}<\\/span>`), `${label} is duplicated in the lower ribbon`);
  }
  assert.match(html, /\.menuScale\{margin-left:auto\}/);
  assert.match(html, /\.appMenuBar \[data-click\],\.ribbon \[data-click\]/);
});

test("one SVG master feeds the header and generated app icons", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "app", "index.html"), "utf8");
  const updater = fs.readFileSync(path.join(__dirname, "..", "update-src.js"), "utf8");
  const serviceWorker = fs.readFileSync(path.join(__dirname, "..", "app", "sw.js"), "utf8");
  assert.ok(fs.existsSync(path.join(__dirname, "..", "app", "icon.svg")));
  assert.match(html, /<link rel="icon" href="icon\.svg"/);
  assert.match(html, /background:url\("icon\.svg"\)/);
  assert.match(updater, /'icon\.svg'/);
  assert.match(serviceWorker, /'\.\/icon\.svg'/);
});
