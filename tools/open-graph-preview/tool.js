// Open Graph Preview (CTL)
// Tech: Vanilla JS (ES Modules). No external APIs.
// Imports: /assets/js/ctl.js, /assets/js/ui.js (already loaded by index.html)
import { $, $$, on, copyToClipboard, downloadText } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

/** ---------- State ---------- */
const state = {
  meta: {
    "og:title": "",
    "og:description": "",
    "og:image": "",
    "og:url": "",
    "og:type": "website",
    "twitter:card": "summary_large_image",
    // Twitter mirrors unless user pastes explicit twitter tags in raw
    "twitter:title": "",
    "twitter:description": "",
    "twitter:image": "",
  },
  pasted: {}, // keys present in raw textarea (to respect explicit twitter:* overrides)
};

/** ---------- DOM ---------- */
const el = {
  url: $("#ctl-url"),
  title: $("#ctl-title"),
  desc: $("#ctl-desc"),
  type: $("#ctl-type"),
  twCard: $("#ctl-twitter-card"),
  raw: $("#ctl-raw"),
  copy: $("#ctl-copy"),
  download: $("#ctl-download"),
  reset: $("#ctl-reset"),
  gen: $("#ctl-generated"),
  vlist: $("#ctl-validation-list"),
  titleCount: $("#ctl-title-count"),
  descCount: $("#ctl-desc-count"),
  img: $("#ctl-image"),
  imgStatus: $("#ctl-image-status"),
  // Previews
  fb: { img: $("#ctl-fb-img"), title: $("#ctl-fb-title"), desc: $("#ctl-fb-desc"), domain: $("#ctl-fb-domain") },
  tw: { img: $("#ctl-tw-img"), title: $("#ctl-tw-title"), desc: $("#ctl-tw-desc"), domain: $("#ctl-tw-domain") },
  li: { img: $("#ctl-li-img"), title: $("#ctl-li-title"), desc: $("#ctl-li-desc"), domain: $("#ctl-li-domain") },
};

/** ---------- Helpers ---------- */
function domainFromUrl(u) {
  try { return new URL(u).host.replace(/^www\./, ""); } catch { return "example.com"; }
}
function softCount(el, countEl, limit) {
  const n = (el.value || "").trim().length;
  countEl.textContent = `${n}/${limit} chars`;
  countEl.classList.remove("ctl-count--ok", "ctl-count--warn");
  countEl.classList.add(n > limit ? "ctl-count--warn" : "ctl-count--ok");
}
function setMeta(k, v) {
  state.meta[k] = v ?? "";
}
function syncFromFields() {
  setMeta("og:title", el.title.value.trim());
  setMeta("og:description", el.desc.value.trim());
  setMeta("og:image", el.img.value.trim());
  setMeta("og:url", el.url.value.trim());
  setMeta("og:type", el.type.value);
  setMeta("twitter:card", el.twCard.value);

  // Mirror to twitter:* unless user pasted explicit ones
  if (!state.pasted["twitter:title"]) setMeta("twitter:title", state.meta["og:title"]);
  if (!state.pasted["twitter:description"]) setMeta("twitter:description", state.meta["og:description"]);
  if (!state.pasted["twitter:image"]) setMeta("twitter:image", state.meta["og:image"]);
}
function parseRaw(text) {
  // Reset pasted flags
  state.pasted = {};
  // Very lenient parser for <meta ...> lines
  const out = {};
  const re = /<meta\s+([^>]*?)>/gi;
  let m;
  while ((m = re.exec(text))) {
    const tag = m[1];
    const propMatch = /(?:property|name)\s*=\s*"(.*?)"/i.exec(tag);
    const contentMatch = /content\s*=\s*"(.*?)"/i.exec(tag);
    if (!propMatch || !contentMatch) continue;
    const key = propMatch[1].trim();
    const val = contentMatch[1].trim();
    out[key] = val;
    state.pasted[key] = true;
  }
  return out;
}
function applyParsedToUI(parsed) {
  // Only map known keys into fields; leave others for raw-only
  if (parsed["og:url"] !== undefined) el.url.value = parsed["og:url"];
  if (parsed["og:title"] !== undefined) el.title.value = parsed["og:title"];
  if (parsed["og:description"] !== undefined) el.desc.value = parsed["og:description"];
  if (parsed["og:image"] !== undefined) el.img.value = parsed["og:image"];
  if (parsed["og:type"] !== undefined) el.type.value = parsed["og:type"];
  if (parsed["twitter:card"] !== undefined) el.twCard.value = parsed["twitter:card"];
}
function generateMetaBlock() {
  const m = state.meta;
  const lines = [];

  // Open Graph
  pushIf(m["og:title"], '  <meta property="og:title" content="%s">', "og:title");
  pushIf(m["og:description"], '  <meta property="og:description" content="%s">', "og:description");
  pushIf(m["og:image"], '  <meta property="og:image" content="%s">', "og:image");
  pushIf(m["og:url"], '  <meta property="og:url" content="%s">', "og:url");
  pushIf(m["og:type"], '  <meta property="og:type" content="%s">', "og:type");

  // Twitter
  pushIf(m["twitter:card"], '  <meta name="twitter:card" content="%s">', "twitter:card");
  pushIf(m["twitter:title"], '  <meta name="twitter:title" content="%s">', "twitter:title");
  pushIf(m["twitter:description"], '  <meta name="twitter:description" content="%s">', "twitter:description");
  pushIf(m["twitter:image"], '  <meta name="twitter:image" content="%s">', "twitter:image");

  return `<!-- Paste inside <head> -->\n${lines.join("\n")}\n`;

  function escapeHtmlAttr(s) { return String(s).replace(/"/g, "&quot;"); }
  function pushIf(val, tmpl, key) {
    if (!val) return;
    // Respect explicitly pasted twitter:* even if fields differ
    if (key.startsWith("twitter:") && state.pasted[key]) {
      val = state.pasted[key] ? state.meta[key] : val;
    }
    lines.push(tmpl.replace("%s", escapeHtmlAttr(val)));
  }
}
function updateGenerated() {
  const block = generateMetaBlock();
  el.gen.textContent = block;
}
function updatePreviews() {
  const m = state.meta;
  const title = m["og:title"] || "Your Title Goes Here";
  const desc = m["og:description"] || "Your description goes here to explain the content succinctly.";
  const url = m["og:url"] || "https://example.com";
  const domain = domainFromUrl(url);
  const img = m["og:image"] || "";

  // Facebook-like
  setPreview(el.fb, { title, desc, domain, img });

  // Twitter-like
  setPreview(el.tw, { title, desc, domain, img });

  // LinkedIn-like
  setPreview(el.li, { title, desc, domain, img });

  function setPreview(target, data) {
    target.title.textContent = data.title;
    target.desc.textContent = data.desc;
    target.domain.textContent = data.domain.toUpperCase();
    if (data.img) {
      target.img.src = data.img;
      target.img.alt = "";
    } else {
      target.img.removeAttribute("src");
      target.img.alt = "";
    }
  }
}
function validate() {
  const m = state.meta;
  const items = [];
  const need = ["og:title", "og:description", "og:image", "og:url"];
  need.forEach(k => {
    if (m[k] && m[k].trim() !== "") items.push({ type: "ok", msg: `Present: ${k}` });
    else items.push({ type: "err", msg: `Missing: ${k}` });
  });
  // Soft length limits
  const tlen = (m["og:title"] || "").length;
  const dlen = (m["og:description"] || "").length;
  if (tlen > 70) items.push({ type: "warn", msg: `Title is long (${tlen}). Aim ≤ 60–70.` });
  else if (tlen > 0) items.push({ type: "ok", msg: `Title length OK (${tlen}).` });

  if (dlen > 200) items.push({ type: "warn", msg: `Description is long (${dlen}). Aim ≤ 160–200.` });
  else if (dlen > 0) items.push({ type: "ok", msg: `Description length OK (${dlen}).` });

  // Image presence already covered; dimensions shown separately
  renderValidation(items);
}
function renderValidation(items) {
  el.vlist.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    li.textContent = it.msg;
    li.className = it.type === "ok" ? "ctl-ok" : it.type === "warn" ? "ctl-warn" : "ctl-err";
    el.vlist.appendChild(li);
  }
}
function refreshAll() {
  syncFromFields();
  softCount(el.title, el.titleCount, 70);
  softCount(el.desc, el.descCount, 200);
  updateGenerated();
  updatePreviews();
  validate();
}
function loadImageDimensions(url) {
  el.imgStatus.textContent = "";
  el.imgStatus.className = "ctl-image-status";
  if (!url) return;
  const image = new Image();
  image.onload = () => {
    el.imgStatus.textContent = `Loaded: ${image.naturalWidth}×${image.naturalHeight}`;
    el.imgStatus.classList.add("ctl-image-status--ok");
  };
  image.onerror = () => {
    el.imgStatus.textContent = "Image failed to load (check URL or CORS).";
    el.imgStatus.classList.add("ctl-image-status--error");
  };
  image.src = url;
}

/** ---------- Events ---------- */
// Field changes → state
["input", "change"].forEach(ev => {
  on(el.url, ev, refreshAll);
  on(el.title, ev, refreshAll);
  on(el.desc, ev, refreshAll);
  on(el.type, ev, refreshAll);
  on(el.twCard, ev, refreshAll);
  on(el.img, ev, () => { loadImageDimensions(el.img.value.trim()); refreshAll(); });
});

// Raw textarea parsing (debounced)
let rawTimer = null;
on(el.raw, "input", () => {
  clearTimeout(rawTimer);
  rawTimer = setTimeout(() => {
    const parsed = parseRaw(el.raw.value || "");
    // Merge parsed into state.meta first
    Object.keys(parsed).forEach(k => setMeta(k, parsed[k]));
    applyParsedToUI(parsed);
    refreshAll();
  }, 150);
});

// Copy / Download / Reset
on(el.copy, "click", async () => {
  await copyToClipboard(el.gen.textContent);
  toast("Meta block copied");
});
on(el.download, "click", () => {
  const html = `<!-- Minimal snippet for testing -->
<!doctype html>
<html><head>
<meta charset="utf-8">
${el.gen.textContent.trim()}
<title>Meta Test</title>
</head><body><h1>Meta Test</h1><p>Open Graph / Twitter tags included in &lt;head&gt;.</p></body></html>`;
  downloadText("meta.html", html);
  toast("meta.html downloaded");
});
// Reset should also clear status + previews
on($("#ctl-form"), "reset", () => {
  setTimeout(() => {
    state.pasted = {};
    Object.keys(state.meta).forEach(k => state.meta[k] = "");
    state.meta["og:type"] = "website";
    state.meta["twitter:card"] = "summary_large_image";
    el.imgStatus.textContent = "";
    el.imgStatus.className = "ctl-image-status";
    refreshAll();
    toast("Reset");
  }, 0);
});

// Keyboard nicety: Ctrl/Cmd + Enter copies meta block
on(document, "keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    el.copy.click();
  }
});

/** ---------- Initialize ---------- */
refreshAll();
