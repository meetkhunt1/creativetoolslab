// Cron Expression Generator – tool.js (ES module, vanilla JS)
// Imports from global CTL system
import { $, $$, on, copyToClipboard } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

/* ------------------------
   DOM ELEMENTS
------------------------- */
const el = {
  min: $("#ctl-min"),
  hour: $("#ctl-hour"),
  dom: $("#ctl-dom"),
  mon: $("#ctl-mon"),
  dow: $("#ctl-dow"),
  out: $("#ctl-cron-out"),
  copy: $("#ctl-copy"),
  reset: $("#ctl-reset"),
  cronIn: $("#ctl-cron-in"),
  status: $("#ctl-parse-status"),
  next: $("#ctl-next"),
  form: $("#ctl-form"),
};
const FIELDS = ["min", "hour", "dom", "mon", "dow"];

/* ------------------------
   HELPERS: parsing & validation
------------------------- */
const MONTH_NAMES = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};
const DOW_NAMES = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

function tokenizeList(expr) {
  return expr.split(",").map((s) => s.trim()).filter(Boolean);
}
function clampDow7To0(v) {
  // Accept 0-6; treat 7 as Sunday (0)
  return v === 7 ? 0 : v;
}
function expandToken(token, min, max, nameMap) {
  // Supports: "*", "n", "a-b", "*/s", "a-b/s", names via nameMap
  if (token === "*") return range(min, max);

  const stepMatch = token.split("/");
  const base = stepMatch[0];
  const step = stepMatch[1] ? toInt(stepMatch[1]) : 1;

  let values = [];
  if (base.includes("-")) {
    const [a, b] = base.split("-").map((p) => resolveValue(p, nameMap));
    if (!isInt(a) || !isInt(b)) return null;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    values = range(lo, hi);
  } else {
    const v = resolveValue(base, nameMap);
    if (!isInt(v)) return null;
    values = [v];
  }

  if (!isInt(step) || step < 1) return null;

  // Apply step
  const stepped = [];
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  for (let n = minVal; n <= maxVal; n++) {
    if (values.includes(n) && ((n - minVal) % step === 0)) stepped.push(n);
  }

  return stepped.filter((n) => n >= min && n <= max);
}
function resolveValue(token, nameMap) {
  const u = token.toUpperCase();
  if (nameMap && nameMap[u] != null) return nameMap[u];
  return toInt(token);
}
function toInt(s) {
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
}
function isInt(n) {
  return Number.isInteger(n);
}
function range(a, b) {
  const out = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

function parseField(expr, { min, max, names, isDow = false }) {
  const s = (expr || "").trim().toUpperCase();
  if (!s) return { ok: false, set: null, reason: "Empty" };

  // Quickly reject unsupported special chars
  if (/[?L#]/.test(s)) {
    return { ok: false, set: null, reason: "Unsupported field: contains ? L #" };
  }

  if (s === "*") {
    let set = range(min, max);
    if (isDow) set = set.map(clampDow7To0);
    return { ok: true, set };
  }

  const tokens = tokenizeList(s);
  let acc = [];
  for (const t of tokens) {
    const vals = expandToken(t, min, max, names);
    if (!vals) return { ok: false, set: null, reason: `Invalid token: ${t}` };
    acc = acc.concat(vals);
  }

  // Normalize DOW '7' to '0'
  if (isDow) acc = acc.map(clampDow7To0);

  // Unique + sort
  const uniq = [...new Set(acc)].sort((a, b) => a - b);
  if (uniq.some((n) => n < min || n > max)) {
    return { ok: false, set: null, reason: "Out of range" };
  }
  return { ok: true, set: uniq };
}

function parseCron(cron) {
  const parts = (cron || "").trim().split(/\s+/);
  if (parts.length !== 5) return { ok: false, reason: "Requires 5 fields" };

  const [mi, ho, da, mo, dw] = parts;

  const minute = parseField(mi, { min: 0, max: 59 });
  if (!minute.ok) return { ok: false, reason: `Minute: ${minute.reason}` };

  const hour = parseField(ho, { min: 0, max: 23 });
  if (!hour.ok) return { ok: false, reason: `Hour: ${hour.reason}` };

  const day = parseField(da, { min: 1, max: 31 });
  if (!day.ok) return { ok: false, reason: `Day: ${day.reason}` };

  const month = parseField(mo, { min: 1, max: 12, names: MONTH_NAMES });
  if (!month.ok) return { ok: false, reason: `Month: ${month.reason}` };

  const weekday = parseField(dw, { min: 0, max: 6, names: DOW_NAMES, isDow: true });
  if (!weekday.ok) return { ok: false, reason: `Weekday: ${weekday.reason}` };

  return { ok: true, sets: { minute: minute.set, hour: hour.set, day: day.set, month: month.set, weekday: weekday.set } };
}

/* ------------------------
   NEXT RUN SIMULATION
------------------------- */
function matchesDate(dt, sets) {
  const m = dt.getMinutes();
  const h = dt.getHours();
  const D = dt.getDate();
  const M = dt.getMonth() + 1;
  const W = dt.getDay(); // 0–6, Sun=0

  return (
    sets.minute.includes(m) &&
    sets.hour.includes(h) &&
    sets.day.includes(D) &&
    sets.month.includes(M) &&
    sets.weekday.includes(W)
  );
}

function nextRuns(cron, limit = 10, maxScanMinutes = 200000) {
  const parsed = parseCron(cron);
  if (!parsed.ok) return { ok: false, reason: parsed.reason, times: [] };

  const out = [];
  // Start from next minute
  let dt = new Date();
  dt.setSeconds(0, 0);
  dt = new Date(dt.getTime() + 60 * 1000);

  let scanned = 0;
  while (out.length < limit && scanned < maxScanMinutes) {
    if (matchesDate(dt, parsed.sets)) {
      out.push(new Date(dt.getTime())); // copy
      // Jump at least one minute forward
      dt = new Date(dt.getTime() + 60 * 1000);
    } else {
      dt = new Date(dt.getTime() + 60 * 1000);
    }
    scanned++;
  }

  if (out.length === 0) {
    return { ok: false, reason: "No matching times found in scan window", times: [] };
  }
  return { ok: true, times: out };
}

/* ------------------------
   SYNC: builder <-> parser
------------------------- */
let internalUpdate = false;

function builderToCron() {
  // Build a 5-field CRON string from inputs (default to '*')
  const v = {
    minute: (el.min.value || "*").trim(),
    hour: (el.hour.value || "*").trim(),
    day: (el.dom.value || "*").trim(),
    month: (el.mon.value || "*").trim(),
    weekday: (el.dow.value || "*").trim(),
  };
  const cron = `${v.minute} ${v.hour} ${v.day} ${v.month} ${v.weekday}`;

  internalUpdate = true;
  el.out.textContent = cron;
  el.cronIn.value = cron;
  internalUpdate = false;

  validateAndPreview(cron);
}

function cronToBuilder(cron) {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [mi, ho, da, mo, dw] = parts;

  internalUpdate = true;
  el.min.value = mi;
  el.hour.value = ho;
  el.dom.value = da;
  el.mon.value = mo;
  el.dow.value = dw;
  el.out.textContent = cron;
  internalUpdate = false;

  validateAndPreview(cron);
  return true;
}

function validateAndPreview(cron) {
  const res = parseCron(cron);
  if (!res.ok) {
    el.status.textContent = `Invalid: ${res.reason}`;
    el.status.className = "ctl-validate ctl-validate--err";
    el.next.innerHTML = "";
    return;
  }

  // OK
  el.status.textContent = "Valid CRON";
  el.status.className = "ctl-validate ctl-validate--ok";

  const runs = nextRuns(cron, 10);
  if (!runs.ok) {
    el.next.innerHTML = `<li>${runs.reason}</li>`;
    return;
  }
  el.next.innerHTML = runs.times
    .map((d) => `<li>${d.toLocaleString()}</li>`)
    .join("");
}

/* ------------------------
   EVENTS
------------------------- */
FIELDS.forEach((f) => {
  on(el[f === "dom" ? "dom" : f], "input", () => {
    if (internalUpdate) return;
    builderToCron();
  });
});

on(el.cronIn, "input", () => {
  if (internalUpdate) return;
  const s = el.cronIn.value;
  const ok = cronToBuilder(s);
  if (!ok) {
    // Soft feedback only if user typed more than 5 fields
    const parts = s.trim().split(/\s+/);
    if (parts.length > 5) {
      el.status.textContent = "Invalid: requires exactly 5 fields";
      el.status.className = "ctl-validate ctl-validate--err";
    }
  }
});

on(el.copy, "click", async () => {
  const text = el.out.textContent.trim();
  try {
    await copyToClipboard(text);
    toast("CRON copied");
  } catch {
    toast("Copy failed");
  }
});

on(el.reset, "click", () => {
  internalUpdate = true;
  el.min.value = "*";
  el.hour.value = "*";
  el.dom.value = "*";
  el.mon.value = "*";
  el.dow.value = "*";
  internalUpdate = false;
  builderToCron();
});

// Example chips
$$(".ctl-chip").forEach((btn) => {
  on(btn, "click", () => {
    const cron = btn.getAttribute("data-example");
    el.cronIn.value = cron;
    cronToBuilder(cron);
    toast("Example applied");
  });
});

// Keyboard: Enter on parser applies to builder (already live) – just ensure focus feedback
on(el.cronIn, "keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    // Already synced via input; update preview explicitly
    validateAndPreview(el.cronIn.value.trim());
  }
});

/* ------------------------
   INIT
------------------------- */
function init() {
  // Default to */5 minutes as a friendly start
  el.min.value = "*/5";
  el.hour.value = "*";
  el.dom.value = "*";
  el.mon.value = "*";
  el.dow.value = "*";
  builderToCron();
}
init();
