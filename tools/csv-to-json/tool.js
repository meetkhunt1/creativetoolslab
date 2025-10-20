// CSV to JSON – ES module (client-only)
import { $, $$, on, copyToClipboard, downloadText, readFileAsText } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

/* ---------- Elements ---------- */
const el = {
  drop: $("#ctl-drop"),
  choose: $("#ctl-choose"),
  file: $("#ctl-file"),
  input: $("#ctl-input"),
  samples: $("#ctl-samples"),
  loadSample: $("#ctl-load-sample"),
  delim: $("#ctl-delim"),
  quote: $("#ctl-quote"),
  header: $("#ctl-header"),
  trim: $("#ctl-trim"),
  emptyNull: $("#ctl-empty-null"),
  numberify: $("#ctl-numberify"),
  sanitize: $("#ctl-sanitize"),
  outmode: $("#ctl-outmode"),
  rowlimit: $("#ctl-rowlimit"),
  pretty: $("#ctl-pretty"),
  validate: $("#ctl-validate"),
  copy: $("#ctl-copy"),
  download: $("#ctl-download"),
  reset: $("#ctl-reset"),
  output: $("#ctl-output"),
  status: $("#ctl-status"),
  error: $("#ctl-error"),
  summary: $("#ctl-summary-text"),
};

let lastResult = {
  json: "",
  rows: 0,
  cols: 0,
  delimiter: ",",
  hadHeaders: true,
};

/* ---------- Helpers ---------- */
function sanitizeSnake(s) {
  return String(s)
    .trim()
    .replace(/[^\w\s]+/g, " ")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function detectDelimiter(text) {
  // Check first ~5 non-empty lines
  const lines = text.split(/\r?\n/).slice(0, 10).filter(Boolean);
  const cand = [
    { d: ",", score: 0 },
    { d: ";", score: 0 },
    { d: "\t", score: 0 },
    { d: "|", score: 0 },
  ];
  for (const l of lines) {
    for (const c of cand) {
      // Count occurrences not in quotes (quick heuristic)
      c.score += countSepOutsideQuotes(l, c.d, '"');
    }
  }
  cand.sort((a, b) => b.score - a.score);
  return (cand[0]?.score ?? 0) > 0 ? cand[0].d : ",";
}

function countSepOutsideQuotes(line, sep, quoteChar) {
  let inQ = false, count = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === quoteChar) {
      // handle escaped quote ("")
      if (inQ && line[i + 1] === quoteChar) { i++; continue; }
      inQ = !inQ;
    } else if (ch === sep && !inQ) {
      count++;
    }
  }
  return count;
}

function numberify(val) {
  if (val === "" || val === null || typeof val !== "string") return val;
  if (/^[+-]?\d+$/.test(val)) return parseInt(val, 10);
  if (/^[+-]?(?:\d*\.\d+|\d+\.\d*)(?:[eE][+-]?\d+)?$/.test(val)) return parseFloat(val);
  return val;
}

/* CSV parser with quotes + escaped quotes ("") */
function parseCSV(text, { delimiter, quoteChar, trim, rowLimit }) {
  const rows = [];
  let i = 0, line = 1, col = 1;
  const len = text.length;
  const pushVal = (arr, val) => arr.push(trim ? String(val).trim() : val);

  while (i <= len) {
    if (rowLimit && rows.length >= rowLimit) break;
    const row = [];
    let val = "";
    let inQ = false;

    while (i < len) {
      const ch = text[i];

      if (inQ) {
        if (ch === quoteChar) {
          if (text[i + 1] === quoteChar) { val += quoteChar; i += 2; col += 2; continue; }
          inQ = false; i++; col++; continue;
        }
        if (ch === "\n") { val += ch; i++; line++; col = 1; continue; }
        val += ch; i++; col++; continue;
      } else {
        if (ch === quoteChar) { inQ = true; i++; col++; continue; }
        if (ch === delimiter) { pushVal(row, val); val = ""; i++; col++; continue; }
        if (ch === "\n") { pushVal(row, val); val = ""; i++; line++; col = 1; break; }
        if (ch === "\r") { i++; continue; } // ignore CR
        val += ch; i++; col++; continue;
      }
    }

    // End of file or last value
    if (i >= len) {
      // If we ended while in quotes, it's an error
      if (inQ) {
        const err = new Error(`Unclosed quote at line ${line}, col ${col}`);
        err.line = line; err.col = col;
        throw err;
      }
      // Push pending
      if (val !== "" || row.length > 0) pushVal(row, val);
    }

    // Ignore trailing empty line
    if (!(row.length === 1 && row[0] === "" && i >= len)) {
      rows.push(row);
    }
  }

  return rows;
}

function toJSON(rows, { headerOn, sanitizeMode, emptyToNull, castNumbers, outMode }) {
  if (!rows.length) return outMode === "arrays" ? [] : [];
  let startIdx = 0;
  let headers = [];

  if (headerOn) {
    headers = rows[0].map(h => (sanitizeMode === "snake" ? sanitizeSnake(h) : String(h)));
    startIdx = 1;
  }

  if (outMode === "arrays") {
    // Keep arrays; optionally cast & nullify
    const out = [];
    for (let r = startIdx; r < rows.length; r++) {
      const arr = rows[r].map(v => {
        let val = v;
        if (emptyToNull && val === "") val = null;
        if (castNumbers && val !== null) val = numberify(val);
        return val;
      });
      out.push(arr);
    }
    return out;
  } else {
    // objects
    const out = [];
    if (!headerOn) {
      // fabricate headers: c1,c2,...
      const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
      headers = Array.from({ length: maxCols }, (_, i) => `c${i + 1}`);
    }
    for (let r = startIdx; r < rows.length; r++) {
      const row = rows[r];
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        let val = row[c] ?? "";
        if (emptyToNull && val === "") val = null;
        if (val !== null && castNumbers) val = numberify(val);
        obj[headers[c]] = val;
      }
      out.push(obj);
    }
    return out;
  }
}

function prettyJSON(data, prettyOpt) {
  if (prettyOpt === "min") return JSON.stringify(data);
  const spaces = Number(prettyOpt) || 2;
  return JSON.stringify(data, null, spaces);
}

function setSummary({ rows, cols, delimiter, hadHeaders }) {
  const name = delimiter === "\t" ? "tab (\\t)" : delimiter === "," ? "comma (,)" : delimiter === ";" ? "semicolon (;)" : delimiter === "|" ? "pipe (|)" : delimiter;
  el.summary.textContent = `Rows: ${rows} • Columns: ${cols} • Delimiter: ${name} • Headers: ${hadHeaders ? "Yes" : "No"}`;
}

/* ---------- Main action ---------- */
function runValidate() {
  clearAlert();
  const text = el.input.value;
  if (!text.trim()) {
    showAlert("Paste CSV or choose a file first.");
    return;
  }

  // resolve delimiter
  let delimiter = el.delim.value;
  delimiter = delimiter === "auto" ? detectDelimiter(text) : (delimiter === "\\t" ? "\t" : delimiter);

  const opts = {
    delimiter,
    quoteChar: el.quote.value === "'" ? "'" : '"',
    trim: el.trim.value === "on",
    rowLimit: parseInt(el.rowlimit.value || "", 10) || undefined,
  };

  let rows;
  try {
    rows = parseCSV(text, opts);
  } catch (e) {
    showAlert(e.message || "Parse error");
    setStatus(`Error at line ${e.line ?? "?"}, column ${e.col ?? "?"}`);
    el.output.textContent = "";
    return;
  }

  const headerOn = el.header.value === "on";
  const json = toJSON(rows, {
    headerOn,
    sanitizeMode: el.sanitize.value,
    emptyToNull: el.emptyNull.value === "on",
    castNumbers: el.numberify.value === "on",
    outMode: el.outmode.value,
  });

  const pretty = prettyJSON(json, el.pretty.value);
  el.output.textContent = pretty;

  // Summary
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  setStatus(`Parsed successfully.`);
  setSummary({ rows: headerOn ? Math.max(0, rows.length - 1) : rows.length, cols, delimiter, hadHeaders: headerOn });

  lastResult = {
    json: pretty,
    rows: headerOn ? Math.max(0, rows.length - 1) : rows.length,
    cols,
    delimiter,
    hadHeaders: headerOn,
  };
}

function setStatus(msg) { el.status.textContent = msg; }
function showAlert(msg) { el.error.hidden = false; el.error.textContent = msg; }
function clearAlert() { el.error.hidden = true; el.error.textContent = ""; }

/* ---------- Events ---------- */
// Dropzone keyboard + mouse
on(el.drop, "keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.file.click(); }
});
on(el.choose, "click", () => el.file.click());

on(el.drop, "dragenter", (e) => { e.preventDefault(); el.drop.classList.add("is-drag"); });
on(el.drop, "dragover", (e) => { e.preventDefault(); });
on(el.drop, "dragleave", () => el.drop.classList.remove("is-drag"));
on(el.drop, "drop", async (e) => {
  e.preventDefault();
  el.drop.classList.remove("is-drag");
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  await handleFile(file);
});

on(el.file, "change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await handleFile(file);
});

async function handleFile(file) {
  try {
    const txt = await readFileAsText(file);
    el.input.value = txt;
    toast(`Loaded: ${file.name}`);
  } catch {
    showAlert("Could not read the file.");
  }
}

// Samples
const SAMPLES = {
  people: `name,age,city
Amit,29,Surat
Riya,31,Ahmedabad
"Patel, Kiran",27,Vadodara`,
  products: `sku\tname\tprice\tin_stock
P-1001\tPhone Case\t199\ttrue
P-1002\tUSB-C Cable\t299.99\tfalse`
};

on(el.loadSample, "click", () => {
  const key = el.samples.value;
  if (!key) return toast("Choose a sample first");
  el.input.value = SAMPLES[key] || "";
  toast("Sample loaded");
});

// Actions
on(el.validate, "click", runValidate);

on(el.copy, "click", async () => {
  const out = el.output.textContent || "";
  if (!out.trim()) return toast("Nothing to copy");
  await copyToClipboard(out);
  toast("JSON copied");
});

on(el.download, "click", () => {
  const out = el.output.textContent || "";
  if (!out.trim()) return toast("Nothing to download");
  downloadText("data.json", out);
});

on(el.reset, "click", () => {
  el.input.value = "";
  el.output.textContent = "";
  el.status.textContent = "";
  el.summary.textContent = "—";
  clearAlert();
  toast("Reset");
});

/* ---------- Basic Tests (console) ---------- */
function runBasicTests() {
  // 1) Simple CSV headers → objects
  const csv1 = "a,b\n1,2\n3,4";
  const rows1 = parseCSV(csv1, { delimiter: ",", quoteChar: '"', trim: true });
  const json1 = toJSON(rows1, { headerOn: true, sanitizeMode: "off", emptyToNull: false, castNumbers: true, outMode: "objects" });
  console.assert(Array.isArray(json1) && json1[0].a === 1 && json1[0].b === 2, "Test 1 failed");

  // 2) Quoted with commas
  const csv2 = 'name,city\n"Patel, Kiran",Vadodara';
  const rows2 = parseCSV(csv2, { delimiter: ",", quoteChar: '"', trim: true });
  const json2 = toJSON(rows2, { headerOn: true, sanitizeMode: "off", emptyToNull: false, castNumbers: false, outMode: "objects" });
  console.assert(json2[0].name === "Patel, Kiran", "Test 2 failed");

  // 3) TSV detection
  const csv3 = "a\tb\tc\n1\t2\t3";
  const det = detectDelimiter(csv3);
  console.assert(det === "\t", "Test 3 failed");

  // 4) No headers → arrays
  const csv4 = "1,2\n3,4";
  const rows4 = parseCSV(csv4, { delimiter: ",", quoteChar: '"', trim: true });
  const json4 = toJSON(rows4, { headerOn: false, sanitizeMode: "off", emptyToNull: false, castNumbers: true, outMode: "arrays" });
  console.assert(Array.isArray(json4) && Array.isArray(json4[0]) && json4[0][0] === 1, "Test 4 failed");
}
try { runBasicTests(); } catch { /* ignore in UI */ }
