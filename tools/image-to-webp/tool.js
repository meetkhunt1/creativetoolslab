// Image to WebP — ES module
import { $, $$, on, readImageToCanvas } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

/** -----------------------------
 * State
 * ----------------------------- */
const state = {
  items: [], // { id, file, name, ext, origBytes, imgW, imgH, dataUrl, webpBytes, outW, outH, qOverride, wOverride, hOverride, lockAspect }
  batch: {
    quality: 80,
    width: null,
    height: null,
    lock: true
  }
};

const els = {
  drop: $("#ctl-drop"),
  file: $("#ctl-file"),
  list: $("#ctl-list"),
  status: $("#ctl-status"),
  error: $("#ctl-error"),
  quality: $("#ctl-quality"),
  qualityVal: $("#ctl-quality-val"),
  width: $("#ctl-width"),
  height: $("#ctl-height"),
  lock: $("#ctl-lock"),
  alpha: $("#ctl-alpha"),
  downloadAll: $("#ctl-download-all"),
  clear: $("#ctl-clear")
};

/** -----------------------------
 * Helpers
 * ----------------------------- */
const bytesToNice = b => {
  if (!Number.isFinite(b)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = b;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const stem = filename => filename.replace(/\.[^.]+$/, "");

const ext = filename => {
  const m = filename.match(/\.([^.]+)$/i);
  return m ? m[1].toLowerCase() : "";
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function dataUrlBytes(dataUrl) {
  try {
    const base64 = dataUrl.split(",")[1] || "";
    return atob(base64).length;
  } catch {
    return NaN;
  }
}

function calcResize(srcW, srcH, wantW, wantH, lock) {
  let outW = srcW, outH = srcH;
  if (wantW || wantH) {
    if (lock) {
      if (wantW && !wantH) {
        const ratio = wantW / srcW;
        outW = Math.max(1, Math.round(srcW * ratio));
        outH = Math.max(1, Math.round(srcH * ratio));
      } else if (!wantW && wantH) {
        const ratio = wantH / srcH;
        outW = Math.max(1, Math.round(srcW * ratio));
        outH = Math.max(1, Math.round(srcH * ratio));
      } else if (wantW && wantH) {
        // fit within box, preserving aspect
        const r = Math.min(wantW / srcW, wantH / srcH);
        outW = Math.max(1, Math.round(srcW * r));
        outH = Math.max(1, Math.round(srcH * r));
      }
    } else {
      outW = Math.max(1, Math.round(wantW || srcW));
      outH = Math.max(1, Math.round(wantH || srcH));
    }
  }
  return { outW, outH };
}

function isSupportedImage(file) {
  return /image\/(png|jpe?g)/i.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
}

function setError(msg) {
  if (!msg) {
    els.error.style.display = "none";
    els.error.textContent = "";
    return;
  }
  els.error.style.display = "block";
  els.error.textContent = msg;
}

function setStatus(msg) {
  els.status.textContent = msg || "";
}

/** -----------------------------
 * Processing
 * ----------------------------- */
async function processItem(item, opts = {}) {
  // Use per-item override if present, else batch
  const q = clamp(Number.isFinite(item.qOverride) ? item.qOverride : state.batch.quality, 0, 100);
  const wTarget = item.wOverride ?? state.batch.width;
  const hTarget = item.hOverride ?? state.batch.height;
  const lock = item.lockAspect ?? state.batch.lock;

  const { canvas, img } = await readImageToCanvas(item.file);
  item.imgW = img.naturalWidth;
  item.imgH = img.naturalHeight;

  const { outW, outH } = calcResize(item.imgW, item.imgH, toNumOrNull(wTarget), toNumOrNull(hTarget), lock);

  // Draw (resize if needed)
  let outCanvas = canvas;
  if (outW !== canvas.width || outH !== canvas.height) {
    outCanvas = document.createElement("canvas");
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ictx = outCanvas.getContext("2d");
    ictx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, outW, outH);
  }

  const qualityFloat = q / 100;
  const dataUrl = outCanvas.toDataURL("image/webp", qualityFloat);
  const webpBytes = dataUrlBytes(dataUrl);

  Object.assign(item, {
    dataUrl,
    webpBytes,
    outW,
    outH
  });

  if (!opts.silent) renderList();
}

function toNumOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function handleFiles(files) {
  setError("");
  const accepted = [];
  for (const file of files) {
    if (!isSupportedImage(file)) {
      setError(`Unsupported file: ${file.name}. Please use PNG or JPEG.`);
      continue;
    }
    const id = crypto.randomUUID();
    const name = file.name;
    const e = ext(name);
    const item = {
      id,
      file,
      name,
      ext: e,
      origBytes: file.size,
      imgW: null,
      imgH: null,
      dataUrl: null,
      webpBytes: null,
      outW: null,
      outH: null,
      qOverride: null,
      wOverride: null,
      hOverride: null,
      lockAspect: null
    };
    state.items.push(item);
    accepted.push(item);
  }

  if (accepted.length) {
    setStatus(`Processing ${accepted.length} image${accepted.length > 1 ? "s" : ""}…`);
    // Process sequentially to avoid UI jank with huge files
    for (const it of accepted) {
      try {
        // processItem will render after each by default
        // pass silent true and render once? Keep feedback continuous.
        // We'll keep default for responsiveness.
        // eslint-disable-next-line no-await-in-loop
        await processItem(it);
      } catch (err) {
        console.error(err);
        setError(`Failed to process ${it.name}.`);
      }
    }
    setStatus(`Ready. ${state.items.length} item(s).`);
  } else if (!state.items.length) {
    setStatus("");
  }
}

/** -----------------------------
 * UI Rendering
 * ----------------------------- */
function renderList() {
  els.list.innerHTML = "";
  if (!state.items.length) {
    els.list.innerHTML = `<div class="ctl-help">No images yet. Use the drag & drop area above to add files.</div>`;
    return;
  }
  const frag = document.createDocumentFragment();

  state.items.forEach(item => {
    const div = document.createElement("div");
    div.className = "ctl-item";
    div.setAttribute("data-id", item.id);

    const safeOut = item.dataUrl ? `<img src="${item.dataUrl}" alt="Preview of ${item.name} as WebP">` : `<div class="ctl-help">Processing…</div>`;

    div.innerHTML = `
      <div class="ctl-item__head">
        <div class="ctl-item__name" title="${item.name}">${item.name}</div>
        <span class="ctl-pill">${item.outW || item.imgW || "?"}×${item.outH || item.imgH || "?"} px</span>
      </div>

      <div class="ctl-item__thumb">${safeOut}</div>

      <div class="ctl-item__meta">
        <div class="ctl-item__row">
          <span>Original</span>
          <strong>${bytesToNice(item.origBytes)}</strong>
        </div>
        <div class="ctl-item__row">
          <span>Estimated WebP</span>
          <strong>${bytesToNice(item.webpBytes)}</strong>
        </div>

        <div class="ctl-item__actions">
          <button class="ctl-btn" data-action="download" ${item.dataUrl ? "" : "disabled"}>Download WebP</button>
          <button class="ctl-btn ctl-btn--ghost" data-action="reprocess">Reprocess</button>
          <button class="ctl-btn ctl-btn--ghost" data-action="toggle-edit" aria-expanded="false" aria-controls="edit-${item.id}">Edit</button>
          <button class="ctl-btn ctl-btn--ghost" data-action="remove">Remove</button>
        </div>
      </div>

      <div id="edit-${item.id}" class="ctl-item__edit" hidden>
        <div class="u-flex u-gap-3">
          <label for="q-${item.id}" style="min-width:80px">Quality</label>
          <input id="q-${item.id}" class="ctl-in" type="number" min="0" max="100" step="1" value="${item.qOverride ?? state.batch.quality}" aria-label="Quality override">
        </div>

        <div class="u-flex u-gap-3">
          <label for="w-${item.id}" style="min-width:80px">Width</label>
          <input id="w-${item.id}" class="ctl-in" type="number" min="1" placeholder="Batch default" value="${item.wOverride ?? ""}" aria-label="Width override">
        </div>

        <div class="u-flex u-gap-3">
          <label for="h-${item.id}" style="min-width:80px">Height</label>
          <input id="h-${item.id}" class="ctl-in" type="number" min="1" placeholder="Batch default" value="${item.hOverride ?? ""}" aria-label="Height override">
        </div>

        <div class="u-flex u-items-center u-gap-3">
          <input id="lock-${item.id}" type="checkbox" ${ (item.lockAspect ?? state.batch.lock) ? "checked" : ""} aria-label="Lock aspect ratio for this item">
          <label for="lock-${item.id}">Lock aspect ratio</label>
        </div>

        <div class="u-flex u-gap-3 u-mt-3">
          <button class="ctl-btn" data-action="save-edit">Apply &amp; Reprocess</button>
          <button class="ctl-btn ctl-btn--ghost" data-action="reset-edit">Reset to batch</button>
        </div>
      </div>
    `;

    frag.appendChild(div);
  });

  els.list.appendChild(frag);
}

/** -----------------------------
 * Downloads
 * ----------------------------- */
function downloadItem(item) {
  if (!item.dataUrl) return;
  const a = document.createElement("a");
  a.href = item.dataUrl;
  a.download = `${stem(item.name)}.webp`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadAllSequential() {
  if (!state.items.length) return;
  for (const it of state.items) {
    if (!it.dataUrl) continue;
    downloadItem(it);
    // small delay to let browser handle multiple downloads
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 150));
  }
  toast("Downloads started");
}

/** -----------------------------
 * Events: uploader
 * ----------------------------- */
on(els.drop, "click", () => els.file.click());
on(els.drop, "keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); els.file.click(); }
});
on(els.file, "change", e => {
  if (e.target.files?.length) handleFiles(e.target.files);
  els.file.value = ""; // allow re-selecting same files
});

["dragenter", "dragover"].forEach(ev =>
  on(els.drop, ev, e => { e.preventDefault(); e.stopPropagation(); els.drop.classList.add("ctl-drop--over"); })
);
["dragleave", "drop"].forEach(ev =>
  on(els.drop, ev, e => { e.preventDefault(); e.stopPropagation(); els.drop.classList.remove("ctl-drop--over"); })
);
on(els.drop, "drop", e => {
  if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
});

/** -----------------------------
 * Events: batch controls
 * ----------------------------- */
on(els.quality, "input", () => {
  const q = clamp(parseInt(els.quality.value, 10) || 0, 0, 100);
  state.batch.quality = q;
  els.qualityVal.textContent = String(q);
});

function syncNumber(el, prop) {
  on(el, "input", () => {
    const v = toNumOrNull(el.value);
    state.batch[prop] = v;
  });
}
syncNumber(els.width, "width");
syncNumber(els.height, "height");

on(els.lock, "change", () => {
  state.batch.lock = !!els.lock.checked;
});

on(els.downloadAll, "click", downloadAllSequential);

on(els.clear, "click", () => {
  state.items = [];
  renderList();
  setStatus("");
});

/** -----------------------------
 * Events: per-item actions (event delegation)
 * ----------------------------- */
on(els.list, "click", async e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const card = e.target.closest(".ctl-item");
  const id = card?.getAttribute("data-id");
  const item = state.items.find(x => x.id === id);
  if (!item) return;

  const action = btn.getAttribute("data-action");
  if (action === "download") {
    downloadItem(item);
  } else if (action === "reprocess") {
    try {
      setStatus(`Reprocessing ${item.name}…`);
      await processItem(item);
      setStatus(`Ready. ${state.items.length} item(s).`);
      toast("Reprocessed");
    } catch (err) {
      console.error(err);
      setError(`Failed to reprocess ${item.name}.`);
    }
  } else if (action === "remove") {
    state.items = state.items.filter(x => x.id !== id);
    renderList();
    setStatus(`${state.items.length} item(s) remaining.`);
  } else if (action === "toggle-edit") {
    const panel = $("#edit-" + id);
    const expanded = panel.hasAttribute("hidden") ? false : true;
    if (expanded) {
      panel.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    } else {
      panel.removeAttribute("hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  } else if (action === "save-edit") {
    const qEl = $("#q-" + id);
    const wEl = $("#w-" + id);
    const hEl = $("#h-" + id);
    const lockEl = $("#lock-" + id);
    item.qOverride = clamp(parseInt(qEl.value, 10) || state.batch.quality, 0, 100);
    item.wOverride = toNumOrNull(wEl.value);
    item.hOverride = toNumOrNull(hEl.value);
    item.lockAspect = !!lockEl.checked;
    try {
      setStatus(`Reprocessing ${item.name} with overrides…`);
      await processItem(item);
      setStatus(`Ready. ${state.items.length} item(s).`);
      toast("Overrides applied");
    } catch (err) {
      console.error(err);
      setError(`Failed to apply overrides for ${item.name}.`);
    }
  } else if (action === "reset-edit") {
    Object.assign(item, { qOverride: null, wOverride: null, hOverride: null, lockAspect: null });
    renderList();
    toast("Item reset to batch settings");
  }
});

/** -----------------------------
 * Init
 * ----------------------------- */
renderList();
setStatus("");
setError("");
