(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.YardstickCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ITEM_TYPES = new Set([
    "room", "door", "window", "fixture", "electrical", "structure",
    "cabinet", "countertop", "extwall", "comment", "draw", "line",
    "arrow", "rect", "ellipse", "polygon", "text"
  ]);

  function parseLength(input, options) {
    const bareUnit = options && options.bareUnit === "inches" ? "inches" : "feet";
    if (input == null) return NaN;
    const value = String(input).trim();
    if (!value) return NaN;

    let match = value.match(/^(-?\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)?\s*"?$/);
    if (match) return Number(match[1]) + (match[2] ? Number(match[2]) : 0) / 12;

    match = value.match(/^(-?\d+)\s*-\s*(\d+(?:\.\d+)?)\s*"?$/);
    if (match) return Number(match[1]) + Number(match[2]) / 12;

    match = value.match(/^(-?\d+(?:\.\d+)?)\s*"$/);
    if (match) return Number(match[1]) / 12;

    match = value.match(/^(-?\d+(?:\.\d+)?)\s*(?:ft|feet|foot)$/i);
    if (match) return Number(match[1]);

    const bare = Number(value);
    if (!Number.isFinite(bare)) return NaN;
    return bareUnit === "inches" ? bare / 12 : bare;
  }

  function formatFeet(feet) {
    if (!Number.isFinite(feet)) return "";
    const sign = feet < 0 ? "-" : "";
    let whole = Math.floor(Math.abs(feet));
    let inches = Math.round((Math.abs(feet) - whole) * 12);
    if (inches === 12) {
      whole += 1;
      inches = 0;
    }
    return `${sign}${whole}'-${inches}"`;
  }

  function isPoint(value) {
    return !!value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y));
  }

  function cleanString(value, fallback, maxLength) {
    const result = typeof value === "string" ? value.trim() : "";
    return (result || fallback || "").slice(0, maxLength || 500);
  }

  function cleanColor(value, fallback) {
    return /^#[0-9a-f]{3,8}$/i.test(String(value || "")) ? value : fallback;
  }

  function cleanPoints(points, minLength) {
    if (!Array.isArray(points)) return null;
    const cleaned = points
      .filter(isPoint)
      .slice(0, 5000)
      .map(point => ({ x: Number(point.x), y: Number(point.y) }));
    return cleaned.length >= (minLength || 1) ? cleaned : null;
  }

  function normalizeItem(raw, fallbackId) {
    if (!raw || !ITEM_TYPES.has(raw.type)) return null;
    const item = {
      id: Number.isSafeInteger(raw.id) && raw.id > 0 ? raw.id : fallbackId,
      type: raw.type,
      level: cleanString(raw.level, "Page 1", 80)
    };

    if (raw.at && isPoint(raw.at)) item.at = { x: Number(raw.at.x), y: Number(raw.at.y) };
    if (raw.points) {
      const minimum = raw.type === "room" || raw.type === "polygon" ? 3 : 2;
      const points = cleanPoints(raw.points, minimum);
      if (!points) return null;
      item.points = points;
    }
    if (!item.at && !item.points) return null;

    const numeric = ["width", "height", "ceiling", "size"];
    numeric.forEach(key => {
      const value = Number(raw[key]);
      if (Number.isFinite(value) && value >= 0 && value < 100000) item[key] = value;
    });

    ["name", "floor", "notes", "ftype", "etype", "dtype", "wtype", "subtype",
      "callout", "text", "cat", "code"].forEach(key => {
      if (raw[key] != null) item[key] = cleanString(raw[key], "", key === "notes" ? 4000 : 300);
    });

    if (raw.tempered != null) item.tempered = !!raw.tempered;
    if (raw.color != null) item.color = cleanColor(raw.color, "#334155");
    return item;
  }

  function normalizeJob(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Job file must contain an object.");
    }
    const sourceItems = Array.isArray(raw.items) ? raw.items : [];
    if (sourceItems.length > 20000) throw new Error("Job contains too many items.");

    let nextId = 1;
    const items = [];
    const ids = new Set();
    for (const source of sourceItems) {
      const item = normalizeItem(source, nextId);
      if (!item) continue;
      while (ids.has(item.id)) item.id += 1;
      ids.add(item.id);
      nextId = Math.max(nextId, item.id + 1);
      items.push(item);
    }

    const feetPerUnit = Number(raw.feetPerUnit);
    const statedAreas = (Array.isArray(raw.statedAreas) ? raw.statedAreas : [])
      .slice(0, 1000)
      .map(area => ({
        label: cleanString(area && area.label, "Area", 200),
        sf: Math.max(0, Math.min(10000000, Number(area && area.sf) || 0)),
        page: Math.max(1, Math.min(10000, Number(area && area.page) || 1))
      }));

    const normalized = {
      v: 4,
      proj: cleanString(raw.proj, "", 300),
      origName: cleanString(raw.origName, "", 300),
      feetPerUnit: Number.isFinite(feetPerUnit) && feetPerUnit > 0 ? feetPerUnit : null,
      cal: raw.cal && isPoint(raw.cal.p0) && isPoint(raw.cal.p1) && Number(raw.cal.knownFt) > 0
        ? { p0: raw.cal.p0, p1: raw.cal.p1, knownFt: Number(raw.cal.knownFt) }
        : null,
      scaleLabel: cleanString(raw.scaleLabel, "", 100) || null,
      items,
      statedAreas,
      areasAdopted: !!raw.areasAdopted,
      idc: nextId,
      roomColorIdx: Math.max(0, Number(raw.roomColorIdx) || 0),
      numPages: Math.max(0, Math.min(10000, Number(raw.numPages) || 0))
    };

    if (raw.pdf && typeof raw.pdf.b64 === "string" && raw.pdf.b64.length <= 60 * 1024 * 1024) {
      normalized.pdf = {
        name: cleanString(raw.pdf.name, "plan.pdf", 300),
        b64: raw.pdf.b64
      };
    }
    if (raw.img && typeof raw.img.src === "string" && raw.img.src.length <= 60 * 1024 * 1024 &&
        /^data:image\//i.test(raw.img.src)) {
      normalized.img = {
        name: cleanString(raw.img.name, "image", 300),
        src: raw.img.src
      };
    }
    return normalized;
  }

  function deepClone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  return {
    ITEM_TYPES,
    parseLength,
    formatFeet,
    normalizeJob,
    deepClone
  };
});
