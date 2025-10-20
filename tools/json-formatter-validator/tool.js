// JSON Formatter & Validator – client-side ES module
// Imports from CTL globals
import { $, $$, on, copyToClipboard, downloadText, readFileAsText } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

// Elements
const els = {
  input: $("#ctl-input"),
  output: $("#ctl-output"),
  inputStats: $("#ctl-input-stats"),
  inputRoot: $("#ctl-input-root"),
  outputStats: $("#ctl-output-stats"),
  indent: $("#ctl-indent"),
  sort: $("#ctl-sort"),
  examples: $("#ctl-examples"),
  file: $("#ctl-file"),

  validate: $("#ctl-validate"),
  pretty: $("#ctl-pretty"),
  minify: $("#ctl-minify"),
  clear: $("#ctl-clear"),
  copy: $("#ctl-copy"),
  download: $("#ctl-download"),

  statusWrap: $("#ctl-status"),
  statusBadge: $("#ctl-status-badge"),
  statusText: $("#ctl-status-text"),
};

// Utils
function countLinesAndChars(text) {
  const lines = text.length ? text.split(/\r\n|\r|\n/).length : 0;
  const chars = text.length;
  return { lines, chars };
}

function setStats() {
  const inVal = els.input.value;
  const outVal = els.output.value;
  const { lines: il, chars: ic } = countLinesAndChars(inVal);
  const { lines: ol, chars: oc } = countLinesAndChars(outVal);
  els.inputStats.textContent = `${il} lines • ${ic} chars`;
  els.outputStats.textContent = `${ol} lines • ${oc} chars`;
  updateRootSummary();
}

function updateRootSummary() {
  try {
    const val = JSON.parse(els.input.value);
    const type = Array.isArray(val) ? "Array" : typeof val === "object" ? "Object" : typeof val;
    let size = "";
    if (type === "Object") size = `${Object.keys(val).length} keys`;
    if (type === "Array") size = `${val.length} items`;
    els.inputRoot.textContent = type && (size ? `${type} • ${size}` : type);
  } catch {
    els.inputRoot.textContent = "";
  }
}

function statusOK(msg = "OK") {
  els.statusWrap.classList.remove("ctl-status--error");
  els.statusWrap.classList.add("ctl-status--ok");
  els.statusBadge.textContent = "OK";
  els.statusText.textContent = msg;
}

function statusError(msg = "Error") {
  els.statusWrap.classList.remove("ctl-status--ok");
  els.statusWrap.classList.add("ctl-status--error");
  els.statusBadge.textContent = "Error";
  els.statusText.textContent = msg;
}

/**
 * Extract error position from V8-style message: "... at position 123"
 * Then compute line/col from original input.
 */
function mapErrorLineColumn(inputText, errorMessage) {
  const match = /position\s+(\d+)/i.exec(errorMessage);
  if (!match) return null;
  const pos = Number(match[1]);
  const upTo = inputText.slice(0, pos);
  const lines = upTo.split(/\r\n|\r|\n/);
  const line = lines.length; // 1-based
  const col = lines[lines.length - 1].length + 1; // 1-based
  return { position: pos, line, column: col };
}

// Deep sort object keys alphabetically
function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  } else if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).sort().forEach(k => {
      out[k] = sortKeys(value[k]);
    });
    return out;
  }
  return value;
}

function parseInput() {
  const raw = els.input.value.trim();
  if (!raw) {
    throw new Error("Empty input.");
  }
  return JSON.parse(raw);
}

function formatOutput(value, indent) {
  const applySort = els.sort.checked;
  const processed = applySort ? sortKeys(value) : value;
  return JSON.stringify(processed, null, indent);
}

function minifyOutput(value) {
  const applySort = els.sort.checked;
  const processed = applySort ? sortKeys(value) : value;
  return JSON.stringify(processed);
}

// Actions
function doValidate() {
  const raw = els.input.value;
  if (!raw.trim()) {
    statusError("No input. Paste JSON or upload a file.");
    return;
  }
  try {
    JSON.parse(raw);
    statusOK("Valid JSON.");
  } catch (e) {
    const pos = mapErrorLineColumn(raw, String(e.message)) || {};
    const where = pos.line ? ` (line ${pos.line}, col ${pos.column})` : "";
    statusError(`Invalid JSON${where}: ${e.message}`);
  }
}

function doPretty() {
  try {
    const val = parseInput();
    const indent = Number(els.indent.value) || 2;
    els.output.value = formatOutput(val, indent);
    statusOK("Formatted successfully.");
  } catch (e) {
    const raw = els.input.value;
    const pos = mapErrorLineColumn(raw, String(e.message)) || {};
    const where = pos.line ? ` (line ${pos.line}, col ${pos.column})` : "";
    statusError(`Cannot format${where}: ${e.message}`);
  } finally {
    setStats();
  }
}

function doMinify() {
  try {
    const val = parseInput();
    els.output.value = minifyOutput(val);
    statusOK("Minified successfully.");
  } catch (e) {
    const raw = els.input.value;
    const pos = mapErrorLineColumn(raw, String(e.message)) || {};
    const where = pos.line ? ` (line ${pos.line}, col ${pos.column})` : "";
    statusError(`Cannot minify${where}: ${e.message}`);
  } finally {
    setStats();
  }
}

function doClear() {
  els.input.value = "";
  els.output.value = "";
  els.examples.value = "";
  statusOK("Cleared.");
  setStats();
  els.input.focus();
}

async function doCopy() {
  if (!els.output.value) {
    statusError("Nothing to copy.");
    return;
  }
  await copyToClipboard(els.output.value);
  toast("Output copied");
}

function doDownload() {
  if (!els.output.value) {
    statusError("Nothing to download.");
    return;
  }
  downloadText("result.json", els.output.value);
  toast("Downloading result.json");
}

async function handleFile(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const text = await readFileAsText(f);
    els.input.value = String(text || "");
    statusOK(`Loaded file: ${f.name}`);
    setStats();
    els.input.focus();
  } catch {
    statusError("Could not read file.");
  } finally {
    e.target.value = ""; // reset so same file can be re-chosen
  }
}

function loadExample(kind) {
  if (kind === "valid") {
    els.input.value = [
      "{",
      '  "name": "CreativeToolsLab",',
      '  "tools": ["json-formatter-validator", "csv-to-json", "password-generator"],',
      '  "active": true,',
      '  "count": 3,',
      '  "meta": { "version": "1.0.0", "tags": ["client-side","free"] }',
      "}"
    ].join("\n");
    statusOK("Loaded valid JSON example.");
  } else if (kind === "invalid") {
    els.input.value = '{ "a": 1 "b": 2 }'; // missing comma
    statusOK("Loaded invalid JSON example.");
  }
  setStats();
  els.input.focus();
}

// Wire up events
on(els.input, "input", setStats);
on(els.output, "input", setStats);

on(els.validate, "click", doValidate);
on(els.pretty, "click", doPretty);
on(els.minify, "click", doMinify);
on(els.clear, "click", doClear);
on(els.copy, "click", doCopy);
on(els.download, "click", doDownload);

on(els.file, "change", handleFile);
on(els.examples, "change", (e) => loadExample(e.target.value));
on(els.indent, "change", () => {
  // Reformat instantly if output already exists
  if (els.output.value) {
    try {
      const parsed = JSON.parse(els.output.value);
      els.output.value = JSON.stringify(parsed, null, Number(els.indent.value));
    } catch {
      // If output isn't valid JSON (shouldn't happen), ignore
    }
    setStats();
  }
});

// Keyboard: Enter triggers primary when button focused; Escape clears status (no modals here)
$("[data-primary]").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.click();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Soft reset status text
    statusOK("Ready.");
  }
});

// Initial stats
setStats();
statusOK("Waiting for input…");

// ----- Basic Tests (dev quick checks) -----
// These are light, inline checks to satisfy MVP test notes; visible only in console.
(function basicTests() {
  // Valid
  const v = '{"x":1,"y":[1,2,3]}';
  try {
    JSON.parse(v);
    // Pretty
    const pretty = JSON.stringify(JSON.parse(v), null, 2);
    console.assert(pretty.includes("\n  "), "Pretty should include indentation");
    // Minify
    const min = JSON.stringify(JSON.parse(v));
    console.assert(!/\s{2,}/.test(min), "Minified should remove whitespace");
  } catch (e) {
    console.warn("Basic test failed:", e);
  }

  // Invalid (missing comma)
  try {
    JSON.parse('{ "a": 1 "b": 2 }');
    console.warn("Invalid JSON should have thrown");
  } catch (_) {}
})();
