export function toast(msg){
  const n = document.createElement('div'); n.textContent = msg; n.setAttribute('role','status');
  n.style.cssText = `position:fixed;left:50%;bottom:24px;transform:translateX(-50%);
    background:var(--primary);color:#fff;padding:10px 14px;border-radius:999px;
    box-shadow:0 10px 30px rgba(14,129,226,.25);z-index:9999;font:600 14px Inter;`;
  document.body.appendChild(n); setTimeout(()=> n.remove(), 1400);
}
