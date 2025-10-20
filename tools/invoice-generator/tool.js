// Invoice Generator — fully client-side (ES modules)
// Imports from global helpers
import { $, $$, on, copyToClipboard, readImageToCanvas, storage } from "/assets/js/ctl.js";
import { toast, confirmModal } from "/assets/js/ui.js";

/* ----------------------------
   Constants / State
----------------------------- */
const KEY_LAST = "ctl_invoice_last";
const KEY_INV_NO = "ctl_invoice_number_counter";

const els = {
  proformaToggle: $("#ctl-proforma-toggle"),
  centsToggle: $("#ctl-cents-toggle"),
  bizName: $("#ctl-biz-name"),
  bizAddress: $("#ctl-biz-address"),
  bizEmail: $("#ctl-biz-email"),
  bizPhone: $("#ctl-biz-phone"),
  logoUrl: $("#ctl-logo-url"),
  logoFile: $("#ctl-logo-file"),
  logoCanvas: $("#ctl-logo-canvas"),
  clientName: $("#ctl-client-name"),
  clientAddress: $("#ctl-client-address"),
  clientEmail: $("#ctl-client-email"),
  currency: $("#ctl-currency"),
  invoiceNo: $("#ctl-invoice-no"),
  issueDate: $("#ctl-issue-date"),
  dueDate: $("#ctl-due-date"),
  taxMode: $("#ctl-tax-mode"),
  taxPreset: $("#ctl-tax-preset"),
  notes: $("#ctl-notes"),
  itemsBody: $("#ctl-items-body"),
  addRow: $("#ctl-add-row"),
  dupRow: $("#ctl-dup-row"),
  delRow: $("#ctl-del-row"),
  subtotal: $("#ctl-subtotal"),
  totalDiscount: $("#ctl-total-discount"),
  totalTax: $("#ctl-total-tax"),
  grandTotal: $("#ctl-grand-total"),
  currencyPill: $("#ctl-currency-pill"),
  headingPrint: $("#ctl-invoice-heading-print"),
  btnPrint: $("#ctl-print"),
  btnCopyLink: $("#ctl-copy-link"),
  btnSave: $("#ctl-save"),
  btnReset: $("#ctl-reset"),
  status: $("#ctl-status"),
};

const state = {
  cents: false,
  proforma: false,
  currency: "INR",
  taxPreset: "",
  taxMode: "after-discount", // or "before-discount"
  items: [],
  meta: {
    invoiceNo: "",
    issueDate: "",
    dueDate: "",
    notes: "",
  },
  business: { name: "", address: "", email: "", phone: "", logoURL: "", logoBlob: null },
  client: { name: "", address: "", email: "" },
};

/* ----------------------------
   Utilities
----------------------------- */
const numberFormatter = () =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: state.currency,
    minimumFractionDigits: state.cents ? 2 : 0,
    maximumFractionDigits: state.cents ? 2 : 0,
  });

function fmtMoney(n) {
  if (!isFinite(n)) return "—";
  return numberFormatter().format(n);
}

function parseNum(v) {
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return isFinite(n) ? n : 0;
}

function setStatus(msg) {
  els.status.textContent = msg;
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function drawLogoToCanvas(srcImg) {
  const c = els.logoCanvas;
  const ctx = c.getContext("2d");
  // Clear
  ctx.clearRect(0, 0, c.width, c.height);
  // Fill white for print clarity
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);

  const iw = srcImg.naturalWidth || srcImg.width;
  const ih = srcImg.naturalHeight || srcImg.height;

  // contain within canvas
  const scale = Math.min(c.width / iw, c.height / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = (c.width - w) / 2;
  const y = (c.height - h) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(srcImg, x, y, w, h);
}

async function loadLogoFromFile(file) {
  if (!file) return;
  const { img } = await readImageToCanvas(file);
  drawLogoToCanvas(img);
  state.business.logoBlob = await fileToDataURL(file);
}

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result || ""));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

async function loadLogoFromURL(url) {
  if (!url) return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => drawLogoToCanvas(img);
  img.onerror = () => setStatus("Logo URL failed to load.");
  img.src = url;
}

/* ----------------------------
   Items Table
----------------------------- */
function newItem() {
  const preset = state.taxPreset ? parseNum(state.taxPreset) : 0;
  return { id: crypto.randomUUID(), name: "", qty: 1, price: 0, tax: preset, discount: 0, selected: false };
}

function renderItems() {
  els.itemsBody.innerHTML = "";
  state.items.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.id = it.id;
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><input class="ctl-in" type="text" value="${escapeHTML(it.name)}" aria-label="Item name"></td>
      <td><input class="ctl-in ctl-num" type="number" inputmode="decimal" value="${it.qty}" min="0" step="any" aria-label="Quantity"></td>
      <td><input class="ctl-in ctl-num" type="number" inputmode="decimal" value="${it.price}" min="0" step="any" aria-label="Price"></td>
      <td><input class="ctl-in ctl-num" type="number" inputmode="decimal" value="${it.tax}" min="0" step="any" aria-label="Tax percent"></td>
      <td><input class="ctl-in ctl-num" type="number" inputmode="decimal" value="${it.discount}" min="0" step="any" aria-label="Discount percent"></td>
      <td class="ctl-num" data-total>—</td>
      <td style="text-align:center"><input type="checkbox" ${it.selected ? "checked" : ""} aria-label="Select row"></td>
    `;
    els.itemsBody.appendChild(tr);
  });
  recalc();
}

function getRowValues(tr) {
  const [nameEl, qtyEl, priceEl, taxEl, discEl] = $$("input", tr);
  return {
    name: nameEl.value,
    qty: parseNum(qtyEl.value),
    price: parseNum(priceEl.value),
    tax: parseNum(taxEl.value),
    discount: parseNum(discEl.value),
    selected: $$("input", tr)[6]?.checked || false,
  };
}

function updateItemFromRow(tr) {
  const id = tr.dataset.id;
  const it = state.items.find((x) => x.id === id);
  if (!it) return;
  const vals = getRowValues(tr);
  Object.assign(it, vals);
}

function lineTotal(it) {
  // qty * price, then (discount or not), then tax depending on mode
  const base = it.qty * it.price;
  const taxBase = state.taxMode === "after-discount" ? base * (1 - it.discount / 100) : base;
  const discounted = state.taxMode === "after-discount" ? taxBase : base * (1 - it.discount / 100);
  const taxed = discounted * (1 + it.tax / 100);
  return Math.max(0, taxed);
}

function recalc() {
  let subtotal = 0, totalDiscount = 0, totalTax = 0, grand = 0;

  $$("#ctl-items-body tr").forEach((tr, i) => {
    updateItemFromRow(tr);
    const it = state.items[i];
    const base = it.qty * it.price;
    let discAmount = 0, taxAmount = 0, total = 0;

    if (state.taxMode === "after-discount") {
      const afterDisc = base * (1 - it.discount / 100);
      discAmount = base - afterDisc;
      taxAmount = afterDisc * (it.tax / 100);
      total = afterDisc + taxAmount;
    } else {
      const taxOnBase = base * (it.tax / 100);
      taxAmount = taxOnBase;
      const afterDisc = (base + taxOnBase) * (1 - it.discount / 100);
      total = afterDisc;
      discAmount = base + taxOnBase - afterDisc;
    }

    subtotal += base;
    totalDiscount += discAmount;
    totalTax += taxAmount;
    grand += total;

    const totalCell = $("[data-total]", tr);
    if (totalCell) totalCell.textContent = fmtMoney(total);
  });

  els.subtotal.textContent = fmtMoney(subtotal);
  els.totalDiscount.textContent = fmtMoney(totalDiscount);
  els.totalTax.textContent = fmtMoney(totalTax);
  els.grandTotal.textContent = fmtMoney(grand);
}

/* ----------------------------
   Events
----------------------------- */
on(els.addRow, "click", () => {
  state.items.push(newItem());
  renderItems();
});

on(els.dupRow, "click", () => {
  const selected = state.items.find((it) => it.selected);
  if (!selected) return toast("Select a row to duplicate");
  const copy = { ...selected, id: crypto.randomUUID(), selected: false };
  state.items.push(copy);
  renderItems();
});

on(els.delRow, "click", async () => {
  const hasSel = state.items.some((it) => it.selected);
  if (!hasSel) return toast("Select a row to delete");
  const ok = await confirmModal({ title: "Delete rows", body: "Remove selected row(s)?", ok: "Delete" });
  if (!ok) return;
  state.items = state.items.filter((it) => !it.selected);
  renderItems();
});

on(els.itemsBody, "input", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  updateItemFromRow(tr);
  recalc();
});

on(els.itemsBody, "change", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  updateItemFromRow(tr);
  recalc();
});

on(els.currency, "change", () => {
  state.currency = els.currency.value;
  els.currencyPill.textContent = state.currency;
  recalc();
});

on(els.centsToggle, "change", () => {
  state.cents = !!els.centsToggle.checked;
  recalc();
});

on(els.taxMode, "change", () => {
  state.taxMode = els.taxMode.value;
  recalc();
});

on(els.taxPreset, "change", () => {
  state.taxPreset = els.taxPreset.value;
  toast("Tax preset will apply to new rows");
});

on(els.logoFile, "change", async () => {
  const f = els.logoFile.files?.[0];
  if (f) {
    await loadLogoFromFile(f);
    state.business.logoURL = ""; // prefer file
  }
});

on(els.logoUrl, "input", () => {
  const url = els.logoUrl.value.trim();
  state.business.logoURL = url;
  if (url) loadLogoFromURL(url);
});

on(els.proformaToggle, "change", () => {
  state.proforma = !!els.proformaToggle.checked;
  els.headingPrint.textContent = state.proforma ? "Proforma Invoice" : "Invoice";
});

on(els.btnPrint, "click", () => {
  window.print();
});

on(els.btnCopyLink, "click", async () => {
  gatherStateFromUI();
  const json = JSON.stringify(state);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  const url = `${location.origin}${location.pathname}#${b64}`;
  await copyToClipboard(url);
  toast("Link copied!");
});

on(els.btnSave, "click", () => {
  gatherStateFromUI();
  storage.set(KEY_LAST, state);
  toast("Saved!");
});

on(els.btnReset, "click", async () => {
  const ok = await confirmModal({ title: "Reset form", body: "Clear all fields and local data?", ok: "Reset" });
  if (!ok) return;
  storage.del(KEY_LAST);
  // keep invoice counter
  location.hash = "";
  location.reload();
});

/* Auto-increment invoice number */
function setNextInvoiceNo() {
  let n = storage.get(KEY_INV_NO, 1001);
  els.invoiceNo.value = String(n);
  state.meta.invoiceNo = String(n);
  storage.set(KEY_INV_NO, n + 1);
}

/* Collect UI → state for saving/linking */
function gatherStateFromUI() {
  state.business.name = els.bizName.value;
  state.business.address = els.bizAddress.value;
  state.business.email = els.bizEmail.value;
  state.business.phone = els.bizPhone.value;
  state.business.logoURL = els.logoUrl.value;

  state.client.name = els.clientName.value;
  state.client.address = els.clientAddress.value;
  state.client.email = els.clientEmail.value;

  state.currency = els.currency.value;
  state.cents = !!els.centsToggle.checked;
  state.proforma = !!els.proformaToggle.checked;
  state.taxPreset = els.taxPreset.value;
  state.taxMode = els.taxMode.value;

  state.meta.invoiceNo = els.invoiceNo.value;
  state.meta.issueDate = els.issueDate.value;
  state.meta.dueDate = els.dueDate.value;
  state.meta.notes = els.notes.value;

  // items already synced by recalc/updateItemFromRow
}

/* Load state → UI */
function applyStateToUI(s) {
  els.bizName.value = s.business.name || "";
  els.bizAddress.value = s.business.address || "";
  els.bizEmail.value = s.business.email || "";
  els.bizPhone.value = s.business.phone || "";
  els.logoUrl.value = s.business.logoURL || "";

  els.clientName.value = s.client.name || "";
  els.clientAddress.value = s.client.address || "";
  els.clientEmail.value = s.client.email || "";

  els.currency.value = s.currency || "INR";
  els.centsToggle.checked = !!s.cents;
  els.proformaToggle.checked = !!s.proforma;
  els.taxPreset.value = s.taxPreset || "";
  els.taxMode.value = s.taxMode || "after-discount";
  els.invoiceNo.value = s.meta.invoiceNo || "";
  els.issueDate.value = s.meta.issueDate || todayISO();
  els.dueDate.value = s.meta.dueDate || todayISO();
  els.notes.value = s.meta.notes || "";

  els.currencyPill.textContent = els.currency.value;
  els.headingPrint.textContent = s.proforma ? "Proforma Invoice" : "Invoice";

  state.items = Array.isArray(s.items) && s.items.length ? s.items : [newItem()];
  renderItems();

  if (s.business.logoURL) loadLogoFromURL(s.business.logoURL);
}

/* Escape helper for safe injection */
function escapeHTML(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ----------------------------
   Init
----------------------------- */
function initFromHashOrStorage() {
  // Hash (copy-link restore)
  if (location.hash.length > 1) {
    try {
      const b64 = location.hash.slice(1);
      const json = decodeURIComponent(escape(atob(b64)));
      const saved = JSON.parse(json);
      Object.assign(state, saved);
      applyStateToUI(state);
      setStatus("Invoice restored from link.");
      return;
    } catch {
      // ignore
    }
  }
  // Local storage
  const saved = storage.get(KEY_LAST, null);
  if (saved) {
    Object.assign(state, saved);
    applyStateToUI(state);
    setStatus("Loaded last invoice.");
    return;
  }

  // Fresh
  state.currency = "INR";
  els.currency.value = "INR";
  els.issueDate.value = todayISO();
  els.dueDate.value = todayISO();
  state.items = [newItem()];
  renderItems();
  setStatus("Ready.");
}

function init() {
  initFromHashOrStorage();
  if (!state.meta.invoiceNo) setNextInvoiceNo();
  // Recalculate when meta changes
  ["input", "change"].forEach((ev) => {
    on(document, ev, (e) => {
      if (e.target.closest("#app")) {
        if (e.target === els.currency || e.target.closest("#ctl-items-body")) return; // handled
        recalc();
      }
    });
  });
}

init();
