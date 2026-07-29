(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.YardstickQA = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function area(points) {
    let total = 0;
    for (let index = 0; index < points.length; index += 1) {
      const next = (index + 1) % points.length;
      total += points[index].x * points[next].y - points[next].x * points[index].y;
    }
    return Math.abs(total) / 2;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function finding(id, severity, title, detail, proposal) {
    return { id, severity, title, detail, proposal: proposal || null };
  }

  function review(snapshot) {
    const items = Array.isArray(snapshot && snapshot.items) ? snapshot.items : [];
    const feetPerUnit = Number(snapshot && snapshot.feetPerUnit) || 0;
    const findings = [];
    const rooms = items.filter(item => item.type === "room");

    if (!feetPerUnit) {
      findings.push(finding(
        "scale-missing", "blocker", "Scale is not set",
        "Quantities cannot be trusted until the printed scale is selected or a known dimension is calibrated."
      ));
    }
    if (!items.length) {
      findings.push(finding(
        "takeoff-empty", "info", "No takeoff items yet",
        "Open a floor-plan sheet, confirm its scale, then trace or detect rooms before running QA."
      ));
    }
    if (items.length && !rooms.length) {
      findings.push(finding(
        "rooms-missing", "warning", "No rooms are traced",
        "Doors and fixtures were detected, but area, wall, ceiling, and trim quantities remain incomplete until rooms are traced."
      ));
    }

    const duplicateNames = new Map();
    rooms.forEach(room => {
      const name = String(room.name || "").trim();
      if (!name || /^room\s+\d+$/i.test(name)) {
        findings.push(finding(
          `room-name-${room.id}`, "warning", "Room needs a descriptive name",
          `${room.level || "Current page"} contains “${name || "Unnamed room"}”.`,
          { label: "Rename room", operations: [{ op: "select", id: room.id }] }
        ));
      }
      const key = `${room.level || ""}|${name.toLowerCase()}`;
      duplicateNames.set(key, (duplicateNames.get(key) || 0) + 1);

      if (feetPerUnit && Array.isArray(room.points)) {
        const squareFeet = area(room.points) * feetPerUnit * feetPerUnit;
        if (squareFeet < 12 || squareFeet > 5000) {
          findings.push(finding(
            `room-area-${room.id}`, "warning", "Room area is an outlier",
            `${name || "Room"} measures ${Math.round(squareFeet)} sf. Verify the outline and sheet scale.`,
            { label: "Inspect room", operations: [{ op: "select", id: room.id }] }
          ));
        }
      }
    });
    duplicateNames.forEach((count, key) => {
      if (count > 1 && key.split("|")[1]) {
        findings.push(finding(
          `duplicate-room-${key}`, "warning", "Duplicate room names",
          `${count} rooms on the same sheet share the name “${key.split("|")[1]}”.`
        ));
      }
    });

    items.filter(item => item.type === "door" || item.type === "window").forEach(item => {
      const width = Number(item.width);
      const height = Number(item.height);
      if (!(width > 0) || !(height > 0) || width > 30 || height > 30) {
        findings.push(finding(
          `opening-size-${item.id}`, "blocker", "Opening has an invalid size",
          `${item.type === "door" ? "Door" : "Window"} ${item.code || item.id} needs a valid width and height.`,
          { label: "Inspect opening", operations: [{ op: "select", id: item.id }] }
        ));
      }
    });

    const pointItems = items.filter(item =>
      item.at && ["fixture", "electrical", "door", "window"].includes(item.type)
    );
    for (let left = 0; left < pointItems.length; left += 1) {
      for (let right = left + 1; right < pointItems.length; right += 1) {
        const a = pointItems[left];
        const b = pointItems[right];
        if (a.type !== b.type || (a.level || "") !== (b.level || "")) continue;
        const labelA = a.ftype || a.etype || a.dtype || a.wtype || "";
        const labelB = b.ftype || b.etype || b.dtype || b.wtype || "";
        if (labelA !== labelB || distance(a.at, b.at) > 3) continue;
        findings.push(finding(
          `duplicate-${a.id}-${b.id}`, "warning", "Possible duplicate item",
          `Two ${labelA || a.type} items are placed almost on top of each other on ${a.level || "the current page"}.`,
          { label: "Inspect first item", operations: [{ op: "select", id: a.id }] }
        ));
      }
    }

    const statedTotal = (Array.isArray(snapshot && snapshot.statedAreas) ? snapshot.statedAreas : [])
      .filter(entry => /living|heated|conditioned/i.test(entry.label || ""))
      .reduce((sum, entry) => sum + (Number(entry.sf) || 0), 0);
    const tracedTotal = feetPerUnit
      ? rooms.reduce((sum, room) => sum + area(room.points || []) * feetPerUnit * feetPerUnit, 0)
      : 0;
    if (statedTotal && tracedTotal) {
      const variance = Math.abs(statedTotal - tracedTotal) / statedTotal;
      if (variance > 0.15) {
        findings.push(finding(
          "area-variance", "warning", "Traced and plan-stated areas differ",
          `Traced rooms total ${Math.round(tracedTotal)} sf versus ${Math.round(statedTotal)} plan-stated sf (${Math.round(variance * 100)}% difference).`
        ));
      }
    }

    const rank = { blocker: 0, warning: 1, info: 2 };
    findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        blockers: findings.filter(item => item.severity === "blocker").length,
        warnings: findings.filter(item => item.severity === "warning").length,
        information: findings.filter(item => item.severity === "info").length
      },
      findings
    };
  }

  return { review };
});
