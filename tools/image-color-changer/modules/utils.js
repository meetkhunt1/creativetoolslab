// modules/utils.js
export const debounce = (fn, ms=200)=>{
  let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a), ms); };
};
export const throttle = (fn, ms=200)=>{
  let t=null, lastArgs=null;
  return function(...a){
    lastArgs=a;
    if(!t){ fn.apply(this,a); t=setTimeout(()=>{ t=null; if(lastArgs!==a) fn.apply(this,lastArgs); }, ms); }
  };
};
export const generateId = ()=> "id_" + Math.random().toString(36).slice(2, 11);

// type guards
export function isSvgImage(source){
  if(source instanceof File){ return source.type==="image/svg+xml" || source.name.toLowerCase().endsWith(".svg"); }
  if(typeof source==="string"){
    if(source.startsWith("data:")) return source.includes("image/svg+xml");
    return source.includes("<svg") || source.toLowerCase().endsWith(".svg");
  }
  return false;
}

// convert CSS color → rgb object using computed style (your original helper)
export function colorToRgb(color){
  const el = document.createElement("div");
  el.style.color = color;
  document.body.appendChild(el);
  const comp = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = comp.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? { r:+m[1], g:+m[2], b:+m[3] } : null;
}
