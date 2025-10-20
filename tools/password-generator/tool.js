// Password Generator – ES Module
// Imports from CTL globals
import { $, $$, on, copyToClipboard, storage } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

const els = {
  form: $("#ctl-form"),
  error: $("#ctl-error"),
  lengthRange: $("#ctl-length"),
  lengthNum: $("#ctl-length-num"),
  upper: $("#ctl-upper"),
  lower: $("#ctl-lower"),
  num: $("#ctl-num"),
  sym: $("#ctl-sym"),
  exSim: $("#ctl-ex-sim"),
  exAmb: $("#ctl-ex-amb"),
  noRepeat: $("#ctl-no-repeat"),
  passphrase: $("#ctl-passphrase"),
  words: $("#ctl-words"),
  sep: $("#ctl-sep"),
  title: $("#ctl-title"),
  qty: $("#ctl-qty"),
  generate: $("#ctl-generate"),
  clear: $("#ctl-clear"),
  output: $("#ctl-output"),
  entropy: $("#ctl-entropy"),
  strengthWord: $("#ctl-strength-word"),
  strengthFill: $("#ctl-strength-fill"),
  strengthText: $("#ctl-strength-text"),
};

const LS_KEY = "ctl-password-generator";

// Default state
const state = {
  length: 16,
  sets: { upper: true, lower: true, num: true, sym: false },
  excludeSimilar: false,
  excludeAmbiguous: false,
  noRepeat: false,
  passphrase: false,
  words: 4,
  sep: "-",
  title: false,
  qty: 1,
};

// Character pools
const POOLS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  num: "0123456789",
  sym: `!@#$%^&*+=?_-`,
  // The "ambiguous" group we might exclude from symbols: {}[]()/\‘"~,;:.<>
  ambiguous: `{ } [ ] ( ) / \\ ' " ~ , ; : . < >`.replace(/\s/g, ""),
  similar: "il1O0",
};

// Simple built-in wordlist (kept short for bundle size; still fine for demo)
// Approx entropy per word: log2(WORDS.length)
const WORDS = [
  "cloud","river","ocean","forest","planet","ember","pixel","quantum","rocket","cobalt",
  "violet","neon","canyon","harbor","delta","sage","citrus","breeze","matrix","lunar",
  "atlas","sonic","zenith","orbit","magnet","raven","echo","nova","alpha","gamma",
  "fusion","granite","honey","ivory","jade","krypton","lotus","meteor","nimbus","onyx",
  "plasma","quartz","relay","sierra","tango","umbra","velvet","willow","xenon","yonder",
  "zephyr","apex","binary","cinder","drift","ember","fluent","glyph","harvest","ion"
]; // length ≈ 60 → log2 ≈ 5.9 bits/word

// ---------- Helpers ----------
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}

function clearError() {
  els.error.hidden = true;
  els.error.textContent = "";
}

function fisherYates(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function computePoolChars() {
  let symSet = POOLS.sym;
  if (state.excludeAmbiguous) {
    // remove ambiguous characters from symSet
    const amb = new Set(POOLS.ambiguous.split(""));
    symSet = [...symSet].filter(ch => !amb.has(ch)).join("");
  }

  const selected = [];
  if (state.sets.upper) selected.push(POOLS.upper);
  if (state.sets.lower) selected.push(POOLS.lower);
  if (state.sets.num)   selected.push(POOLS.num);
  if (state.sets.sym)   selected.push(symSet);

  let pool = selected.join("");

  if (state.excludeSimilar) {
    const sim = new Set(POOLS.similar.split(""));
    pool = [...pool].filter(ch => !sim.has(ch)).join("");
  }

  return { pool, selectedSets: selected };
}

function strengthLabel(bits) {
  if (bits < 40) return "Very Weak";
  if (bits < 60) return "Weak";
  if (bits < 80) return "Fair";
  return "Strong";
}

function updateStrengthPreview() {
  let bits = 0;
  if (state.passphrase) {
    bits = state.words * Math.log2(WORDS.length);
  } else {
    const { pool } = computePoolChars();
    const poolSize = Math.max(pool.length, 1);
    bits = state.length * Math.log2(poolSize);
  }
  const label = strengthLabel(bits);
  const pct = clamp((bits / 100) * 100, 0, 100);

  els.entropy.textContent = `${bits.toFixed(1)} bits`;
  els.strengthWord.textContent = label;
  els.strengthFill.style.width = `${pct}%`;
}

function ensureAtLeastOneFromEach(passwordArr, selectedSets) {
  // Replace positions with at least one from each selected set
  const len = passwordArr.length;
  for (let i = 0; i < selectedSets.length && i < len; i++) {
    const set = selectedSets[i];
    passwordArr[i] = set[Math.floor(Math.random() * set.length)];
  }
  return passwordArr;
}

function generateOnePassword() {
  const { pool, selectedSets } = computePoolChars();
  if (!pool.length) {
    throw new Error("No characters available. Enable at least one character set or relax exclusions.");
  }

  if (state.noRepeat && state.length > pool.length) {
    throw new Error("“Avoid repeating characters” is on but length exceeds unique pool size.");
  }

  const result = [];
  const poolArr = [...pool];

  // Fill remaining
  while (result.length < state.length) {
    const ch = poolArr[Math.floor(Math.random() * poolArr.length)];
    if (state.noRepeat && result.includes(ch)) continue;
    result.push(ch);
  }

  ensureAtLeastOneFromEach(result, selectedSets);
  return fisherYates(result).join("");
}

function titleCase(word) {
  return word.slice(0,1).toUpperCase() + word.slice(1).toLowerCase();
}

function generateOnePassphrase() {
  const words = [];
  const count = clamp(state.words, 3, 6);
  const sep = state.sep;
  for (let i = 0; i < count; i++) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    words.push(state.title ? titleCase(w) : w);
  }
  return words.join(sep);
}

function renderOutput(items) {
  els.output.innerHTML = "";
  items.forEach((txt, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "ctl-pass";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "ctl-in";
    input.value = txt;
    input.readOnly = true;
    input.setAttribute("aria-label", `Generated ${state.passphrase ? "passphrase" : "password"} ${idx+1}`);

    const btn = document.createElement("button");
    btn.className = "ctl-btn";
    btn.type = "button";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", `Copy ${state.passphrase ? "passphrase" : "password"} ${idx+1}`);

    on(btn, "click", async () => {
      await copyToClipboard(input.value);
      toast("Copied!");
    });

    wrap.appendChild(input);
    wrap.appendChild(btn);
    els.output.appendChild(wrap);
  });
}

// ---------- Event wiring ----------
function syncLengthInputs(fromRange) {
  if (fromRange) {
    els.lengthNum.value = els.lengthRange.value;
  } else {
    const v = clamp(parseInt(els.lengthNum.value || "16", 10), 8, 128);
    els.lengthNum.value = String(v);
    els.lengthRange.value = String(v);
  }
  state.length = parseInt(els.lengthRange.value, 10);
  updateStrengthPreview();
}

function readUIToState() {
  state.length = parseInt(els.lengthRange.value, 10);
  state.sets.upper = els.upper.checked;
  state.sets.lower = els.lower.checked;
  state.sets.num = els.num.checked;
  state.sets.sym = els.sym.checked;
  state.excludeSimilar = els.exSim.checked;
  state.excludeAmbiguous = els.exAmb.checked;
  state.noRepeat = els.noRepeat.checked;
  state.passphrase = els.passphrase.checked;
  state.words = clamp(parseInt(els.words.value || "4", 10), 3, 6);
  state.sep = els.sep.value;
  state.title = els.title.checked;
  state.qty = clamp(parseInt(els.qty.value || "1", 10), 1, 20);
}

function writeStateToUI() {
  els.lengthRange.value = String(state.length);
  els.lengthNum.value = String(state.length);
  els.upper.checked = state.sets.upper;
  els.lower.checked = state.sets.lower;
  els.num.checked = state.sets.num;
  els.sym.checked = state.sets.sym;
  els.exSim.checked = state.excludeSimilar;
  els.exAmb.checked = state.excludeAmbiguous;
  els.noRepeat.checked = state.noRepeat;
  els.passphrase.checked = state.passphrase;
  els.words.value = String(state.words);
  els.sep.value = state.sep;
  els.title.checked = state.title;
  els.qty.value = String(state.qty);
  updateStrengthPreview();
}

function generateBatch() {
  clearError();
  readUIToState();

  if (!state.passphrase) {
    // Ensure at least one set selected
    if (!state.sets.upper && !state.sets.lower && !state.sets.num && !state.sets.sym) {
      showError("Turn on at least one character set (A–Z, a–z, 0–9, Symbols).");
      renderOutput([]);
      return;
    }
  }

  try {
    const out = [];
    for (let i = 0; i < state.qty; i++) {
      out.push(state.passphrase ? generateOnePassphrase() : generateOnePassword());
    }
    renderOutput(out);
    storage.set(LS_KEY, state); // save settings
    updateStrengthPreview();
  } catch (err) {
    showError(err.message || String(err));
    renderOutput([]);
  }
}

// Keyboard affordances: Enter submits, Esc clears error
on(document, "keydown", (e) => {
  if (e.key === "Escape") {
    clearError();
  }
});

// Form events
on(els.form, "submit", (e) => {
  e.preventDefault();
  generateBatch();
});

on(els.clear, "click", () => {
  els.output.innerHTML = "";
  toast("Cleared");
});

// Sync length inputs
on(els.lengthRange, "input", () => syncLengthInputs(true));
on(els.lengthNum, "input", () => syncLengthInputs(false));

// Any option change updates strength preview
[
  els.upper, els.lower, els.num, els.sym,
  els.exSim, els.exAmb, els.noRepeat,
  els.passphrase, els.words, els.sep, els.title
].forEach(el => on(el, "change", updateStrengthPreview));

// Quantity clamp
on(els.qty, "input", () => {
  els.qty.value = String(clamp(parseInt(els.qty.value || "1", 10), 1, 20));
});

// ---------- Init ----------
(function init() {
  // Load settings if available
  const saved = storage.get(LS_KEY);
  if (saved && typeof saved === "object") {
    Object.assign(state, saved);
  }
  writeStateToUI();
  generateBatch(); // initial
})();

// ---------- Basic Tests (quick manual) ----------
/*
Run in console to sanity-check:

// 1) All pools off → error
els.upper.checked = els.lower.checked = els.num.checked = els.sym.checked = false; generateBatch();

// 2) Only numbers, length 6 → digits only
els.upper.checked = els.lower.checked = els.sym.checked = false; els.num.checked = true; els.lengthRange.value = "6"; els.lengthNum.value = "6"; generateBatch();

// 3) Quantity > 1 → multiple rows
els.qty.value = "5"; generateBatch();

// 4) Entropy updates with length/pools
// Observe strength bar / bits as you toggle options and length.
*/
