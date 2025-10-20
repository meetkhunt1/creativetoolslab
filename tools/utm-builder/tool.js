// UTM Builder — ES module
import { $, $$, on, copyToClipboard, storage } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

const els = {
  form: $("#ctl-form"),

  base: $("#ctl-base"),
  baseErr: $("#ctl-base-err"),

  source: $("#ctl-source"),
  sourcePreset: $("#ctl-source-preset"),
  sourceErr: $("#ctl-source-err"),

  medium: $("#ctl-medium"),
  mediumPreset: $("#ctl-medium-preset"),
  mediumErr: $("#ctl-medium-err"),

  campaign: $("#ctl-campaign"),
  campaignErr: $("#ctl-campaign-err"),

  term: $("#ctl-term"),
  content: $("#ctl-content"),

  lower: $("#ctl-lower"),
  space: $("#ctl-space"),
  timestamp: $("#ctl-timestamp"),

  preview: $("#ctl-preview"),
  output: $("#ctl-output"),

  copyUrl: $("#ctl-copy-url"),
  copyQuery: $("#ctl-copy-query"),
  share: $("#ctl-share"),

  reset: $("#ctl-reset"),
  save: $("#ctl-save"),
  load: $("#ctl-load"),
};

const SETTINGS_KEY = "ctl-utm-settings";

/** Utility: safe URL parse; returns URL or null */
function parseUrl(value) {
  try {
    // Allow relative-like inputs to fail fast
    const u = new URL(value);
    return u;
  } catch {
    return null;
  }
}

/** Apply formatting rules to a single value */
function formatValue(v, { lower, space }) {
  let out = String(v || "").trim();
  if (lower) out = out.toLowerCase();
  if (space === "-" || space === "_") out = out.replace(/\s+/g, space);
  return out;
}

/** YYYYMMDD string in local time */
function yyyymmdd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Build final URL and query string, preserving existing params and UTM order */
function buildUrl() {
  // Validate base first
  const baseUrl = els.base.value.trim();
  const url = parseUrl(baseUrl);

  // Collect values
  const opts = {
    lower: els.lower.checked,
    space: els.space.value,
  };

  const source = formatValue(els.source.value, opts);
  const medium = formatValue(els.medium.value, opts);
  let campaign = formatValue(els.campaign.value, opts);
  const term = formatValue(els.term.value, opts);
  const content = formatValue(els.content.value, opts);

  if (els.timestamp.checked && campaign) {
    campaign = `${campaign}-${yyyymmdd()}`;
  }

  // Validation flags
  const v = {
    base: !!url,
    source: !!source,
    medium: !!medium,
    campaign: !!campaign,
  };

  // Toggle field errors
  els.baseErr.hidden = v.base;
  els.sourceErr.hidden = v.source;
  els.mediumErr.hidden = v.medium;
  els.campaignErr.hidden = v.campaign;

  if (!v.base || !v.source || !v.medium || !v.campaign) {
    // Show minimal preview/output when invalid base; keep UX responsive
    els.preview.textContent = "";
    els.output.value = "";
    return { href: "", query: "" };
  }

  // Start with existing non-utm params in original order
  const existing = new URLSearchParams(url.search);
  const nonUtmPairs = [];
  existing.forEach((val, key) => {
    if (!/^utm_/i.test(key)) {
      nonUtmPairs.push([key, val]);
    }
  });

  // Build new params with required UTM order
  const params = new URLSearchParams();

  // 1) non-utm existing first (preserve)
  for (const [k, v] of nonUtmPairs) params.append(k, v);

  // 2) utm_* in order (replace any existing)
  params.append("utm_source", source);
  params.append("utm_medium", medium);
  params.append("utm_campaign", campaign);
  if (term) params.append("utm_term", term);
  if (content) params.append("utm_content", content);

  // Assign back to URL
  url.search = params.toString();

  const href = url.toString();
  const query = url.search.startsWith("?") ? url.search.slice(1) : url.search;

  // Live preview & output
  els.preview.textContent = href;
  els.output.value = href;

  return { href, query };
}

/** Copy helpers */
async function copyUrl() {
  const { href } = buildUrl();
  if (!href) return;
  await copyToClipboard(href);
  toast("Copied URL!");
}
async function copyQuery() {
  const { query } = buildUrl();
  if (!query) return;
  await copyToClipboard(query);
  toast("Copied query string!");
}

/** Share (fallback to copy) */
async function shareUrl() {
  const { href } = buildUrl();
  if (!href) return;
  if (navigator.share) {
    try {
      await navigator.share({ url: href, title: "UTM Link" });
      return;
    } catch {
      // fall through to copy
    }
  }
  await copyToClipboard(href);
  toast("Link copied (share not available)");
}

/** Save/load last settings (optional) */
function currentSettings() {
  return {
    source: els.source.value,
    medium: els.medium.value,
    campaign: els.campaign.value,
    term: els.term.value,
    content: els.content.value,
    lower: els.lower.checked,
    space: els.space.value,
    timestamp: els.timestamp.checked,
  };
}
function applySettings(s) {
  if (!s) return;
  els.source.value = s.source ?? "";
  els.medium.value = s.medium ?? "";
  els.campaign.value = s.campaign ?? "";
  els.term.value = s.term ?? "";
  els.content.value = s.content ?? "";
  els.lower.checked = !!s.lower;
  els.space.value = s.space ?? "none";
  els.timestamp.checked = !!s.timestamp;
}

/** Wire up events */
function init() {
  // Real-time updates
  const inputs = [
    els.base, els.source, els.medium, els.campaign, els.term, els.content,
    els.lower, els.space, els.timestamp,
  ];
  for (const el of inputs) {
    on(el, "input", buildUrl);
    on(el, "change", buildUrl);
    on(el, "keydown", (e) => { if (e.key === "Enter") buildUrl(); });
  }

  // Presets → inputs
  on(els.sourcePreset, "change", () => { if (els.sourcePreset.value) els.source.value = els.sourcePreset.value; buildUrl(); });
  on(els.mediumPreset, "change", () => { if (els.mediumPreset.value) els.medium.value = els.mediumPreset.value; buildUrl(); });

  // Actions
  on(els.copyUrl, "click", copyUrl);
  on(els.copyQuery, "click", copyQuery);
  on(els.share, "click", shareUrl);

  on(els.reset, "click", () => {
    // native form reset will clear fields; delay build to after reset
    setTimeout(() => {
      // clear errors & preview
      els.baseErr.hidden = true;
      els.sourceErr.hidden = true;
      els.mediumErr.hidden = true;
      els.campaignErr.hidden = true;
      buildUrl();
      toast("Cleared");
    }, 0);
  });

  on(els.save, "click", () => {
    storage.set(SETTINGS_KEY, currentSettings());
    toast("Settings saved");
  });

  on(els.load, "click", () => {
    const s = storage.get(SETTINGS_KEY, null);
    if (!s) { toast("No saved settings"); return; }
    applySettings(s);
    buildUrl();
    toast("Settings loaded");
  });

  // Initial preview
  buildUrl();
}

// Kick off
init();
