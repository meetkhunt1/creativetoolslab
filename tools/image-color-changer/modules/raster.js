// modules/raster.js
import { colorToRgb } from "./utils.js";

export function replaceColorsInImage(image, colorPairs, tolerance=0){
  return new Promise((resolve)=>{
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    c.width = image.naturalWidth; c.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0,0,c.width,c.height);
    const data = imageData.data;

    const rgbPairs = colorPairs.map(p=>({ source: colorToRgb(p.source), target: colorToRgb(p.target) }));
    const maxDist = 441.7;
    const thresholds = rgbPairs.map(()=> (tolerance/100)*maxDist );

    for(let i=0;i<data.length;i+=4){
      const r=data[i], g=data[i+1], b=data[i+2];
      for(let j=0;j<rgbPairs.length;j++){
        const src = rgbPairs[j].source; if(!src) continue;
        const dist = Math.hypot(r-src.r, g-src.g, b-src.b);
        if(dist <= thresholds[j]){
          const tgt = rgbPairs[j].target || src;
          data[i]=tgt.r; data[i+1]=tgt.g; data[i+2]=tgt.b;
          break;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    resolve(c.toDataURL("image/png"));
  });
}

export function convertImageFormat(dataUrl, format){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>{
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);

      if(format==="jpeg"){
        ctx.globalCompositeOperation="destination-over";
        ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height);
      }
      const type = format==="jpeg" ? "image/jpeg" : (format==="webp" ? "image/webp" : "image/png");
      resolve(c.toDataURL(type, 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
