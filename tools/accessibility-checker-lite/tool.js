// Accessibility Checker Lite (client-side only)
// Namespaced with ctl- and aligned with CTL global helpers.

import { $, $$, on, copyToClipboard, downloadText } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

// ---------- DOM ----------
const form = $("#ctl-form");
const textarea = $("#ctl-html");
const btnAnalyze = $("#ctl-analyze");
const btnClear = $("#ctl-clear");
const btnSample = $("#ctl-sample");
const btnCopyJson = $("#ctl-copy-json");
const btnDownloadJson = $("#ctl-download-json");
const btnCopyTemplate = $("#ctl-copy-template");

const passEl = $("#ctl-pass");
const warnEl = $("#ctl-warn");
const errorEl = $("#ctl-error");
const issuesList = $("#ctl-issues");
const msgEl = $("#ctl-message");
const reportPreview = $("#ctl-report-preview");

// ---------- Utilities ----------
const sampleHTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Sample</title></head>
<body>
  <header><h1>Welcome</h1></header>
  <nav><a href="#learn">Learn more</a></nav>
  <main>
    <section>
      <h2>Intro</h2>
      <p style="color:#999">Low contrast paragraph on white</p>
      <img src="photo.jpg">
      <p><a href="#">Click here</a> to proceed.</p>
      <form>
        <input id="email" type="email" placeholder="Email">
        <button>Submit</button>
      </form>
    </section>
  </main>
  <footer><small>© 2025</small></footer>
</body>
</html>`;

const fixedSkeleton = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Accessible Page</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <header role="banner">
    <h1>Page Title</h1>
    <nav aria-label="Primary">
      <ul>
        <li><a href="#main">Skip to content</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>

  <main id="main">
    <h2>Section heading</h2>
    <p>Body text with sufficient contrast.</p>

    <img src="example.jpg" alt="Descriptive alternative text">

    <form>
      <label for="email">Email</label>
      <input id="email" type="email" required>
      <button type="submit">Submit</button>
    </form>
  </main>

  <footer role="contentinfo">
    <p>© Your brand</p>
  </footer>
</body>
</html>`;

// Trim helper
const t = (s) => String(s ?? "").trim();

// Build simple selector
function simpleSelector(el) {
  if (!el || !el.tagName) return "";
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = (el.className && typeof el.className === "string")
    ? "." + el.className.trim().split(/\s+/).join(".")
    : "";
  return `${tag}${id}${cls}`;
}

// Snippet helper
function snippetFor(el) {
  if (!el) return "";
  return `<${el.tagName.toLowerCase()}${el.id ? ` id="${el.id}"` : ""}${el.className ? ` class="${el.className}"` : ""}>`;
}

// ---------- Contrast ----------
function hexToRgb(hex) {
  hex = hex.replace("#", "").trim();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const int = parseInt(hex, 16);
  if (Number.isNaN(int)) return null;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
function parseCssColor(s) {
  if (!s) return null;
  s = s.trim().toLowerCase();
  // rgb(a)
  const rgbm = s.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbm) return { r: +rgbm[1], g: +rgbm[2], b: +rgbm[3] };
  // hex
  const hexm = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexm) return hexToRgb(hexm[0]);
  // named minimal support
  const basic = { black: "#000000", white: "#ffffff", gray: "#808080", red: "#ff0000", blue: "#0000ff", green: "#008000", darkgray: "#a9a9a9", lightgray: "#d3d3d3" };
  if (basic[s]) return hexToRgb(basic[s]);
  return null;
}
function luminance({ r, g, b }) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrastRatio(fgRgb, bgRgb) {
  const L1 = luminance(fgRgb);
  const L2 = luminance(bgRgb);
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (light + 0.05) / (dark + 0.05);
}

// ---------- Checks ----------
function runChecks(doc) {
  /** @type {{rule:string,severity:'Info'|'Warning'|'Error',message:string,selector:string,snippet:string}[]} */
  const issues = [];
  const add = (rule, severity, message, el = null) => {
    issues.push({
      rule,
      severity,
      message,
      selector: el ? simpleSelector(el) : "",
      snippet: el ? snippetFor(el) : ""
    });
  };

  // Headings outline
  const headings = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")];
  const levels = headings.map((h) => +h.tagName.substring(1));
  if (headings.length === 0) add("Headings", "Warning", "No headings found. Include an <h1>.", null);
  if (!levels.includes(1)) add("Headings", "Warning", "No <h1> found on the page.", null);
  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1];
    const cur = levels[i];
    if (cur - prev > 1) add("Headings", "Warning", `Skipped level from h${prev} to h${cur}.`, headings[i]);
  }

  // Images alt
  doc.querySelectorAll("img").forEach((img) => {
    const alt = img.getAttribute("alt");
    if (alt == null || t(alt) === "") {
      add("Image Alt", "Error", "Image missing non-empty alt attribute.", img);
    }
  });

  // Links text
  const genericPhrases = ["click here", "learn more", "read more", "more", "here", "details"];
  doc.querySelectorAll("a").forEach((a) => {
    const text = t(a.textContent || "");
    if (text.length === 0) add("Link Text", "Warning", "Link has empty/whitespace-only text.", a);
    const lower = text.toLowerCase();
    if (genericPhrases.includes(lower)) {
      add("Link Text", "Warning", `Generic link text (“${text}”). Make it descriptive.`, a);
    }
  });

  // Form labels
  const formCtrls = doc.querySelectorAll("input,select,textarea");
  formCtrls.forEach((el) => {
    const id = el.getAttribute("id");
    const hasFor = id ? !!doc.querySelector(`label[for="${CSS.escape(id)}"]`) : false;
    const inLabel = !!el.closest("label");
    const ariaLabel = t(el.getAttribute("aria-label"));
    const ariaLabelledby = t(el.getAttribute("aria-labelledby"));
    const ok = hasFor || inLabel || ariaLabel.length > 0 || ariaLabelledby.length > 0;
    if (!ok) add("Form Labels", "Error", "Form control lacks label (label[for], wrapping label, or aria-*).", el);
  });

  // Landmarks (recommend)
  const hasMain = !!doc.querySelector("main");
  const hasHeader = !!doc.querySelector("header");
  const hasNav = !!doc.querySelector("nav");
  const hasFooter = !!doc.querySelector("footer");
  if (!hasMain) add("Landmarks", "Info", "Consider adding <main> to identify primary content.");
  if (!hasHeader) add("Landmarks", "Info", "Consider adding <header> for banner/site header.");
  if (!hasNav) add("Landmarks", "Info", "Consider adding <nav> for primary navigation.");
  if (!hasFooter) add("Landmarks", "Info", "Consider adding <footer> for site info.");

  // Color contrast (best-effort):
  // We only check elements that declare a color and optionally a background via inline style/attributes.
  // If bg is unknown, assume white (#ffffff).
  const candidates = [...doc.querySelectorAll("*")].filter((el) => {
    const s = (el.getAttribute("style") || "").toLowerCase();
    return s.includes("color:") || s.includes("background") || el.hasAttribute("color") || el.hasAttribute("bgcolor");
  });

  candidates.forEach((el) => {
    const style = el.getAttribute("style") || "";
    const colorAttr = el.getAttribute("color");
    const bgcolorAttr = el.getAttribute("bgcolor");
    const colorMatch = style.match(/color\s*:\s*([^;]+)/i);
    const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);

    const fg = parseCssColor(colorAttr || (colorMatch ? colorMatch[1] : null));
    const bg = parseCssColor(bgcolorAttr || (bgMatch ? bgMatch[1] : null)) || parseCssColor("#ffffff");

    // Only check if we have a foreground color and there's visible text
    const text = t(el.textContent || "");
    if (fg && text.length > 0) {
      const ratio = contrastRatio(fg, bg);
      if (ratio < 4.5) {
        add("Color Contrast", "Error", `Low contrast (${ratio.toFixed(2)}:1). Needs ≥ 4.5:1 for normal text.`, el);
      }
    }
  });

  return issues;
}

// ---------- Render ----------
function renderIssues(issues) {
  issuesList.innerHTML = "";
  let pass = 0, warn = 0, error = 0;

  if (!issues.length) {
    pass = 1; // treat as one "all good" pass
    const li = document.createElement("li");
    li.className = "ctl-issue";
    li.dataset.sev = "Info";
    li.innerHTML = `<h4>All clear</h4><p>No issues found by the lite checks.</p>`;
    issuesList.appendChild(li);
  } else {
    issues.forEach((it) => {
      if (it.severity === "Warning") warn++;
      else if (it.severity === "Error") error++;
    });
    // Count passes as total checks minus warnings/errors (approx). For UI simplicity we show 0.
    pass = 0;

    for (const it of issues) {
      const li = document.createElement("li");
      li.className = "ctl-issue";
      li.dataset.sev = it.severity;
      li.innerHTML = `
        <h4>${it.rule} — <em>${it.severity}</em></h4>
        <p>${it.message}</p>
        ${it.snippet ? `<div class="ctl-meta">Snippet: <code>${escapeHtml(it.snippet)}</code></div>` : ""}
        ${it.selector ? `<div class="ctl-meta">Selector: <code>${escapeHtml(it.selector)}</code></div>` : ""}
      `;
      issuesList.appendChild(li);
    }
  }

  passEl.textContent = String(pass);
  warnEl.textContent = String(warn);
  errorEl.textContent = String(error);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Wire up ----------
on(form, "submit", (e) => {
  e.preventDefault();
  analyzeNow();
});

on(btnClear, "click", () => {
  textarea.value = "";
  issuesList.innerHTML = "";
  passEl.textContent = "0";
  warnEl.textContent = "0";
  errorEl.textContent = "0";
  reportPreview.textContent = "{}";
  hideMsg();
  toast("Cleared");
});

on(btnSample, "click", () => {
  textarea.value = sampleHTML;
  toast("Sample loaded");
  textarea.focus();
});

on(btnCopyTemplate, "click", async () => {
  await copyToClipboard(fixedSkeleton);
  toast("Template copied");
});

on(btnCopyJson, "click", async () => {
  const txt = reportPreview.textContent || "{}";
  await copyToClipboard(txt);
  toast("Report JSON copied");
});

on(btnDownloadJson, "click", () => {
  const txt = reportPreview.textContent || "{}";
  downloadText("a11y-report.json", txt);
  toast("Download started");
});

// Keyboard niceties
on(window, "keydown", (e) => {
  if (e.key === "Escape") {
    hideMsg();
  }
});

// ---------- Analyze ----------
function analyzeNow() {
  const html = t(textarea.value);
  if (!html) {
    showMsg("Please paste some HTML or load the sample.", true);
    return;
  }

  let doc;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(html, "text/html");
  } catch {
    showMsg("Unable to parse HTML.", true);
    return;
  }

  const issues = runChecks(doc);
  renderIssues(issues);

  const report = {
    summary: {
      pass: Number(passEl.textContent),
      warnings: Number(warnEl.textContent),
      errors: Number(errorEl.textContent)
    },
    issues
  };

  reportPreview.textContent = JSON.stringify(report, null, 2);
  hideMsg();
  toast("Analysis complete");
}

// ---------- Messaging ----------
function showMsg(text, isError = false) {
  msgEl.textContent = text;
  msgEl.hidden = false;
  msgEl.style.color = isError ? "var(--danger)" : "inherit";
}
function hideMsg() {
  msgEl.hidden = true;
  msgEl.textContent = "";
}

// Autofocus for quicker workflow
textarea.focus();
