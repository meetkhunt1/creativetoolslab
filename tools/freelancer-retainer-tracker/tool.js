// CTL – Freelancer Retainer Tracker (frontend-only)
// Imports
import { $, $$, on, storage, downloadText } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

// Constants
const KEY = "ctl-freelancer-retainer-tracker-v1";

// State
let rows = storage.get(KEY, []);
let filterMode = "all"; // all | active | pending

// Elements
const form = $("#ctl-form");
const tbody = $("#ctl-tbody");
const totalMonthlyEl = $("#ctl-total-monthly");
const totalPendingEl = $("#ctl-total-pending");
const avgRateEl = $("#ctl-avg-rate");
const statusRegion = $("#ctl-status-region");
const filterSel = $("#ctl-filter");
const exportBtn = $("#ctl-export-btn");

// Helpers
function currency(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  // Leave currency symbol generic; users can read their own values
  return "₹" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function announce(msg) {
  statusRegion.textContent = msg;
}

function persist() {
  storage.set(KEY, rows);
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function getVisibleRows() {
  if (filterMode === "active") return rows.filter(r => r.active === true);
  if (filterMode === "pending") return rows.filter(r => r.paymentStatus === "Pending");
  return rows.slice();
}

// Totals
function recomputeTotals() {
  const vis = getVisibleRows();
  const monthlyTotal = vis.reduce((sum, r) => sum + (Number(r.retainerAmount) || 0), 0);
  const pending = vis
    .filter(r => r.paymentStatus === "Pending")
    .reduce((sum, r) => sum + (Number(r.retainerAmount) || 0), 0);
  const rates = vis.map(r => Number(r.hourlyRate)).filter(v => !isNaN(v) && v > 0);
  const avgRate = rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length) : null;

  totalMonthlyEl.textContent = currency(monthlyTotal);
  totalPendingEl.textContent = currency(pending);
  avgRateEl.textContent = avgRate ? currency(avgRate) : "—";
}

// Rendering
function render() {
  const vis = getVisibleRows();
  tbody.innerHTML = "";
  for (const r of vis) {
    const tr = document.createElement("tr");
    tr.dataset.id = r.id;

    tr.innerHTML = `
      <td data-key="clientName" tabindex="0" class="ctl-cell">${escapeHtml(r.clientName)}</td>
      <td data-key="retainerAmount" tabindex="0" class="ctl-cell">${numOrDash(r.retainerAmount)}</td>
      <td data-key="hoursWorked" tabindex="0" class="ctl-cell">${numOrDash(r.hoursWorked)}</td>
      <td data-key="hourlyRate" tabindex="0" class="ctl-cell">${numOrDash(r.hourlyRate)}</td>
      <td data-key="paymentStatus" tabindex="0" class="ctl-cell">
        ${renderStatusTag(r.paymentStatus)}
      </td>
      <td data-key="active" tabindex="0" class="ctl-cell">${r.active ? "Yes" : "No"}</td>
      <td class="ctl-col-actions">
        <button class="ctl-action" data-edit>Edit</button>
        <button class="ctl-action" data-del>Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
  recomputeTotals();
}

function renderStatusTag(status) {
  const cls = status === "Paid" ? "ctl-tag ctl-tag--paid" : "ctl-tag ctl-tag--pending";
  return `<span class="${cls}" data-status="${status}">${status}</span>`;
}

function numOrDash(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  return isNaN(n) ? "—" : String(n);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"'`=\/]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"
  }[c]));
}

// CRUD
function addRow(data) {
  const row = {
    id: uid(),
    clientName: data.clientName.trim(),
    retainerAmount: Number(data.retainerAmount) || 0,
    hoursWorked: isFinite(Number(data.hoursWorked)) ? Number(data.hoursWorked) : "",
    hourlyRate: isFinite(Number(data.hourlyRate)) ? Number(data.hourlyRate) : "",
    paymentStatus: data.paymentStatus === "Paid" ? "Paid" : "Pending",
    active: data.active !== "false"
  };
  rows.push(row);
  persist();
  render();
  toast("Added");
  announce(`Added ${row.clientName}.`);
}

async function deleteRow(id, clientName) {
  const ok = await confirmModal({
    title: "Delete entry",
    body: `Remove "${clientName}" from the tracker?`,
    ok: "Delete",
    cancel: "Cancel"
  });
  if (!ok) return;
  rows = rows.filter(r => r.id !== id);
  persist();
  render();
  toast("Deleted");
  announce(`Deleted ${clientName}.`);
}

function updateRow(id, patch) {
  const i = rows.findIndex(r => r.id === id);
  if (i === -1) return;
  rows[i] = { ...rows[i], ...patch };
  persist();
  render();
  toast("Saved");
  announce(`Updated ${rows[i].clientName}.`);
}

// Inline editing
let editing = null; // { td, id, key, prev, input }

function beginEdit(td) {
  if (editing) endEdit(false);
  const tr = td.closest("tr");
  const id = tr.dataset.id;
  const key = td.dataset.key;
  if (!id || !key) return;

  // Special handling for paymentStatus / active as selects
  const isSelect = key === "paymentStatus" || key === "active";
  const current = getCellValue(td, key);

  td.classList.add("ctl-editing");
  td.innerHTML = isSelect ? selectHtml(key, current) : `<input class="ctl-edit-input" type="${isNumericKey(key) ? "number" : "text"}" step="0.01" value="${escapeAttr(current)}">`;

  const input = isSelect ? td.querySelector("select") : td.querySelector("input");
  input.classList.add(isSelect ? "ctl-edit-select" : "ctl-edit-input");
  input.focus();
  if (!isSelect && input.select) input.select();

  editing = { td, id, key, prev: current, input };

  // Keyboard controls
  on(input, "keydown", (e) => {
    if (e.key === "Enter") { endEdit(true); }
    if (e.key === "Escape") { endEdit(false); }
  });
  // Commit on blur for convenience
  on(input, "blur", () => endEdit(true));
}

function endEdit(commit) {
  if (!editing) return;
  const { td, id, key, prev, input } = editing;
  const val = commit ? readInputValue(key, input) : prev;

  td.classList.remove("ctl-editing");
  if (key === "paymentStatus") {
    td.innerHTML = renderStatusTag(val);
  } else if (key === "active") {
    td.textContent = val === "true" || val === true ? "Yes" : "No";
  } else {
    td.textContent = val === "" ? "—" : val;
  }

  if (commit && val !== prev) {
    const patch = mapPatch(key, val);
    updateRow(id, patch);
  }
  editing = null;
}

function getCellValue(td, key) {
  if (key === "paymentStatus") {
    const tag = td.querySelector("[data-status]");
    return tag ? tag.getAttribute("data-status") : "Pending";
  }
  if (key === "active") {
    return (td.textContent || "").trim().toLowerCase() === "yes" ? "true" : "false";
  }
  const raw = (td.textContent || "").trim();
  if (isNumericKey(key)) {
    const n = Number(raw);
    return isNaN(n) ? "" : String(n);
  }
  return raw;
}

function readInputValue(key, input) {
  if (key === "paymentStatus") return input.value === "Paid" ? "Paid" : "Pending";
  if (key === "active") return input.value;
  if (isNumericKey(key)) {
    const n = Number(input.value);
    return isFinite(n) ? String(n) : "";
  }
  return input.value.trim();
}

function isNumericKey(key) {
  return ["retainerAmount", "hoursWorked", "hourlyRate"].includes(key);
}

function mapPatch(key, val) {
  switch (key) {
    case "clientName": return { clientName: String(val) };
    case "retainerAmount": return { retainerAmount: Number(val) || 0 };
    case "hoursWorked": return { hoursWorked: val === "" ? "" : Number(val) };
    case "hourlyRate": return { hourlyRate: val === "" ? "" : Number(val) };
    case "paymentStatus": return { paymentStatus: val === "Paid" ? "Paid" : "Pending" };
    case "active": return { active: val === "true" || val === true };
    default: return {};
  }
}

function selectHtml(key, current) {
  if (key === "paymentStatus") {
    return `
      <select class="ctl-edit-select" aria-label="Payment Status">
        <option value="Pending" ${current === "Pending" ? "selected" : ""}>Pending</option>
        <option value="Paid" ${current === "Paid" ? "selected" : ""}>Paid</option>
      </select>
    `;
  }
  if (key === "active") {
    return `
      <select class="ctl-edit-select" aria-label="Active">
        <option value="true" ${current === "true" ? "selected" : ""}>Yes</option>
        <option value="false" ${current === "false" ? "selected" : ""}>No</option>
      </select>
    `;
  }
  return "";
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}

// Eve
