export const $  = (s, r=document) => r.querySelector(s);
export const $$ = (s, r=document) => [...r.querySelectorAll(s)];
export const on = (el, ev, cb, opts) => el.addEventListener(ev, cb, opts);

export function copyToClipboard(text){ return navigator.clipboard.writeText(text); }

export function downloadText(filename, text){
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

export function readFileAsText(file){
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result||'')); fr.onerror = rej; fr.readAsText(file); });
}

export function readImageToCanvas(file){
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url); res({ canvas:c, ctx, img }); };
    img.onerror = rej; img.src = url;
  });
}

export const storage = {
  get(k, d=null){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
  del(k){ localStorage.removeItem(k); }
};
