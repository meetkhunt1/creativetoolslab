// modules/svg.js
import { colorToRgb } from "./utils.js";

// pull colors from SVG (same logic as your file)
export function extractColorsFromSvg(svgElement){
  const colors = new Set();
  const isValid = c => c && c!=="none" && c!=="transparent" && !String(c).includes("url(");

  const process = (el)=>{
    if(!el || el.nodeType!==1) return;
    const fill = el.getAttribute("fill");  if(isValid(fill)) colors.add(fill);
    const stroke = el.getAttribute("stroke"); if(isValid(stroke)) colors.add(stroke);
    const style = el.getAttribute("style");
    if(style){
      const f = style.match(/fill:\s*([^;]+)/);   if(f && isValid(f[1])) colors.add(f[1]);
      const s = style.match(/stroke:\s*([^;]+)/); if(s && isValid(s[1])) colors.add(s[1]);
    }
    Array.from(el.children).forEach(process);
  };
  process(svgElement);
  return Array.from(colors);
}

export function replaceColorsInSvg(svgElement, colorPairs){
  const cloned = svgElement.cloneNode(true);

  const matches = (c1, c2, tol=0)=>{
    if(c1===c2) return true;
    if(!tol) return false;
    const a = colorToRgb(c1), b = colorToRgb(c2);
    if(!a || !b) return false;
    const dist = Math.hypot(a.r-b.r, a.g-b.g, a.b-b.b);
    const max = 441.7; const threshold = (tol/100)*max;
    return dist <= threshold;
  };

  const mapStyle = (style, src, tgt)=>{
    return style
      .replace(/fill:\s*([^;]+)/g, (m,c)=> matches(c,src) ? `fill: ${tgt}` : m)
      .replace(/stroke:\s*([^;]+)/g, (m,c)=> matches(c,src) ? `stroke: ${tgt}` : m);
  };

  const process = (el)=>{
    if(!el || el.nodeType!==1) return;
    if(el.hasAttribute("fill")){
      const v = el.getAttribute("fill");
      colorPairs.forEach(p=>{ if(matches(v,p.source)) el.setAttribute("fill", p.target); });
    }
    if(el.hasAttribute("stroke")){
      const v = el.getAttribute("stroke");
      colorPairs.forEach(p=>{ if(matches(v,p.source)) el.setAttribute("stroke", p.target); });
    }
    if(el.hasAttribute("style")){
      let st = el.getAttribute("style");
      colorPairs.forEach(p=>{ st = mapStyle(st, p.source, p.target); });
      el.setAttribute("style", st);
    }
    Array.from(el.children).forEach(process);
  };
  process(cloned);
  return cloned;
}

export function svgToDataUrl(svgElement){
  const str = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([str], { type: "image/svg+xml" });
  return URL.createObjectURL(blob);
}

export function convertSvgToFormat(svgUrl, format){
  return new Promise((resolve, reject)=>{
    if(format==="svg"){
      fetch(svgUrl).then(r=>r.text()).then(txt=>{
        const blob = new Blob([txt], { type:"image/svg+xml" });
        resolve(URL.createObjectURL(blob));
      }).catch(reject);
      return;
    }
    const img = new Image();
    img.onload = ()=>{
      const scale = 2;
      const c = document.createElement("canvas");
      c.width = img.naturalWidth*scale; c.height = img.naturalHeight*scale;
      const ctx = c.getContext("2d"); ctx.scale(scale,scale); ctx.drawImage(img,0,0);
      const type = format==="jpeg" ? "image/jpeg" : (format==="webp" ? "image/webp" : "image/png");
      resolve(c.toDataURL(type, 0.9));
    };
    img.onerror = reject;
    img.src = svgUrl;
  });
}

export function parseSvgContent(svgText){
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  return doc.documentElement;
}
