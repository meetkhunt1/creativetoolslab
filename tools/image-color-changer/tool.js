// Minimal color changer. WebGL2 if possible, CPU fallback. OKLab distance with soft mask.
const CBefore = document.getElementById('canvasBefore');
const CAfter  = document.getElementById('canvasAfter');
const fileInput = document.getElementById('fileInput');
const btnUpload = document.getElementById('btnUpload');
const btnDownload = document.getElementById('btnDownload');
const btnPick = document.getElementById('btnPick');
const btnApply = document.getElementById('btnApply');
const btnReset = document.getElementById('btnReset');
const srcColor = document.getElementById('srcColor');
const tgtColor = document.getElementById('tgtColor');
const tol      = document.getElementById('tol');
const tolVal   = document.getElementById('tolVal');
const preserveL= document.getElementById('preserveL');
const note     = document.getElementById('note');

let imgW=0, imgH=0, srcPixels=null, isSVG=false, svgText='';
let gl=null, prog=null, vao=null, tex=null;

const VS = `#version 300 es
in vec2 aPos; out vec2 vUV; void main(){ vUV=aPos*0.5+0.5; gl_Position=vec4(aPos,0,1); }`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3 uSrcOK, uTgtOK;
uniform float uTolEnd, uPreserveL;
in vec2 vUV; out vec4 outColor;
float srgbToLinear(float x){ return x<=0.04045? x/12.92 : pow((x+0.055)/1.055, 2.4); }
float linearToSrgb(float x){ float s=clamp(x,0.,1.); return s<=0.0031308? 12.92*s : 1.055*pow(s,1./2.4)-0.055; }
vec3 rgb_to_oklab(vec3 s){ float rL=srgbToLinear(s.r), gL=srgbToLinear(s.g), bL=srgbToLinear(s.b);
  float l=0.4122214708*rL+0.5363325363*gL+0.0514459929*bL;
  float m=0.2119034982*rL+0.6806995451*gL+0.1073969566*bL;
  float q=0.0883024619*rL+0.2817188376*gL+0.6299787005*bL;
  float l_=pow(l,1./3.), m_=pow(m,1./3.), q_=pow(q,1./3.);
  return vec3(0.2104542553*l_+0.793617785*m_-0.0040720468*q_,
              1.9779984951*l_-2.428592205*m_+0.4505937099*q_,
              0.0259040371*l_+0.7827717662*m_-0.808675766*q_);
}
vec3 oklab_to_rgb(vec3 ok){
  float L=ok.x,A=ok.y,B=ok.z;
  float l_=pow(L+0.3963377774*A+0.2158037573*B,3.);
  float m_=pow(L-0.1055613458*A-0.0638541728*B,3.);
  float q_=pow(L-0.0894841775*A-1.291485548*B,3.);
  float rL= 4.0767416621*l_-3.3077115913*m_+0.2309699292*q_;
  float gL=-1.2684380046*l_+2.6097574011*m_-0.3413193965*q_;
  float bL=-0.0041960863*l_-0.7034186147*m_+1.707614701*q_;
  return vec3(linearToSrgb(rL), linearToSrgb(gL), linearToSrgb(bL));
}
void main(){
  vec4 C = texture(uTex, vUV);
  if (C.a<=0.) { outColor=C; return; }
  vec3 rgb = C.rgb / C.a;
  vec3 ok  = rgb_to_oklab(rgb);
  float d  = distance(ok, uSrcOK);
  float t  = clamp(d / max(0.0001, uTolEnd), 0., 1.);
  float mask = 1. - (3.*t*t - 2.*t*t*t); // smoothstep inverse
  vec3 outOK = vec3(uPreserveL>0.5 ? ok.x : uTgtOK.x, mix(ok.yz, uTgtOK.yz, mask));
  vec3 outRGB = clamp(oklab_to_rgb(outOK), 0., 1.);
  outColor = vec4(outRGB * C.a, C.a);
}`;

// helpers
function hexToRgb(hex){ const s=hex.replace('#',''); const v=s.length===3? s.split('').map(c=>c+c).join('') : s;
  const n=parseInt(v,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function rgb8ToOKLab(r,g,b){
  const srgbToLinear = x => { x/=255; return x<=0.04045? x/12.92 : Math.pow((x+0.055)/1.055,2.4); };
  const rL=srgbToLinear(r), gL=srgbToLinear(g), bL=srgbToLinear(b);
  const l=0.4122214708*rL+0.5363325363*gL+0.0514459929*bL;
  const m=0.2119034982*rL+0.6806995451*gL+0.1073969566*bL;
  const q=0.0883024619*rL+0.2817188376*gL+0.6299787005*bL;
  const l_=Math.cbrt(l), m_=Math.cbrt(m), q_=Math.cbrt(q);
  return [0.2104542553*l_+0.793617785*m_-0.0040720468*q_,
          1.9779984951*l_-2.428592205*m_+0.4505937099*q_,
          0.0259040371*l_+0.7827717662*m_-0.808675766*q_];
}

// UI events
btnUpload.onclick = ()=> fileInput.click();
fileInput.onchange = async e => { const f=e.target.files[0]; if (!f) return; await loadFile(f); };
tol.oninput = ()=> { tolVal.textContent = Number(tol.value).toFixed(2); };
btnPick.onclick = async ()=>{
  if (!('EyeDropper' in window)) { note.textContent = 'Eyedropper not supported. Use the Source color input.'; return; }
  try { const r = await new window.EyeDropper().open(); srcColor.value = r.sRGBHex; } catch(_) {}
};
btnApply.onclick = ()=> applyRecolor();
btnReset.onclick = ()=> resetAfter();
btnDownload.onclick = async ()=>{
  const blob = await new Promise(res=> CAfter.toBlob(res,'image/png'));
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='recolor.png'; a.click();
  URL.revokeObjectURL(a.href);
};

// Drag and drop
for (const el of [CBefore, CAfter]) {
  el.addEventListener('dragover', e=> e.preventDefault());
  el.addEventListener('drop', async e=> { e.preventDefault(); const f=e.dataTransfer.files[0]; if (f) await loadFile(f); });
}

// Load file and draw in Before
async function loadFile(file){
  isSVG = file.type==='image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
  let bmp;
  if (isSVG) {
    svgText = await file.text();
    bmp = await rasterizeSVG(svgText);
  } else {
    bmp = await decodeImage(file);
  }
  imgW=bmp.width; imgH=bmp.height;
  fitCanvas(CBefore, imgW, imgH); fitCanvas(CAfter, imgW, imgH);
  const ctxB = CBefore.getContext('2d', { willReadFrequently: true });
  ctxB.clearRect(0,0,CBefore.width,CBefore.height);
  ctxB.drawImage(bmp, 0, 0, CBefore.width, CBefore.height);
  // keep original pixels at full res for processing
  const full = document.createElement('canvas');
  full.width = imgW; full.height = imgH;
  full.getContext('2d').drawImage(bmp, 0, 0);
  srcPixels = full.getContext('2d').getImageData(0,0,imgW,imgH).data;
  btnApply.disabled = false; btnReset.disabled = false; btnDownload.disabled = false;
  note.textContent = isSVG ? 'SVG loaded. Apply will recolor stops, fills, strokes. After shows raster preview.' : 'Raster image loaded. Adjust controls then click Apply.';
  // prepare GL
  initGLIfNeeded();
}

async function decodeImage(file){
  if ('ImageDecoder' in window) {
    const dec = new ImageDecoder({ data: await file.arrayBuffer(), type: file.type || 'image/png' });
    const frame = await dec.decode();
    return await createImageBitmap(frame.image);
  } else {
    return await createImageBitmap(await file.arrayBuffer());
  }
}
async function rasterizeSVG(text){
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  const p = new Promise((res, rej)=>{ img.onload=()=>res(img); img.onerror=rej; });
  img.src = url; await p; URL.revokeObjectURL(url);
  return createImageBitmap(img);
}

function fitCanvas(cv, w, h){
  const maxD = Math.min(1024, Math.max(512, Math.floor(window.innerWidth*0.45)));
  let scale = 1;
  if (Math.max(w,h) > maxD) scale = maxD / Math.max(w,h);
  cv.width = Math.max(1, Math.floor(w*scale));
  cv.height= Math.max(1, Math.floor(h*scale));
}

function initGLIfNeeded(){
  if (gl) return;
  gl = CAfter.getContext('webgl2', { premultipliedAlpha: true, alpha: true });
  if (!gl) { note.textContent = 'WebGL2 not available. CPU path will be used. It may be slower.'; return; }
  const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, VS); gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, FS); gl.compileShader(fs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(vs));
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(fs));
  prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
  const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

function applyRecolor(){
  if (!srcPixels) return;
  const sOK = rgb8ToOKLab(...hexToRgb(srcColor.value));
  const tOK = rgb8ToOKLab(...hexToRgb(tgtColor.value));
  const tolEnd = parseFloat(tol.value);

  if (gl) {
    // GL path
    if (!tex) {
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imgW, imgH, 0, gl.RGBA, gl.UNSIGNED_BYTE, srcPixels);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, imgW, imgH, gl.RGBA, gl.UNSIGNED_BYTE, srcPixels);
    }
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);
    gl.uniform3f(gl.getUniformLocation(prog, 'uSrcOK'), sOK[0], sOK[1], sOK[2]);
    gl.uniform3f(gl.getUniformLocation(prog, 'uTgtOK'), tOK[0], tOK[1], tOK[2]);
    gl.uniform1f(gl.getUniformLocation(prog, 'uTolEnd'), tolEnd);
    gl.uniform1f(gl.getUniformLocation(prog, 'uPreserveL'), preserveL.checked ? 1 : 0);
    gl.viewport(0,0,CAfter.width, CAfter.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  } else {
    // CPU path
    const out = new Uint8ClampedArray(srcPixels); // will write over
    for (let i=0;i<out.length;i+=4){
      const a = out[i+3]/255;
      if (a<=0) continue;
      const r = a>0? out[i]/a : out[i], g = a>0? out[i+1]/a : out[i+1], b = a>0? out[i+2]/a : out[i+2];
      const ok = rgb8ToOKLab(Math.round(r),Math.round(g),Math.round(b));
      const dL=ok[0]-sOK[0], dA=ok[1]-sOK[1], dB=ok[2]-sOK[2];
      const d = Math.hypot(dL,dA,dB);
      const t  = Math.min(1, Math.max(0, d / Math.max(0.0001, tolEnd)));
      const mask = 1 - (3*t*t - 2*t*t*t);
      const L = preserveL.checked ? ok[0] : (ok[0]*(1-mask) + tOK[0]*mask);
      const A = ok[1]*(1-mask) + tOK[1]*mask;
      const B = ok[2]*(1-mask) + tOK[2]*mask;
      // convert back to sRGB 0..1 then to premultiplied u8
      // reuse shader’s inverse in JS is overkill. Use oklabToRgb8 adapted:
      const l_ = Math.pow(L + 0.3963377774*A + 0.2158037573*B, 3);
      const m_ = Math.pow(L - 0.1055613458*A - 0.0638541728*B, 3);
      const q_ = Math.pow(L - 0.0894841775*A - 1.2914855480*B, 3);
      let rL =  4.0767416621*l_ - 3.3077115913*m_ + 0.2309699292*q_;
      let gL = -1.2684380046*l_ + 2.6097574011*m_ - 0.3413193965*q_;
      let bL = -0.0041960863*l_ - 0.7034186147*m_ + 1.7076147010*q_;
      const lin2srgb = x => { x = x<=0?0:(x>=1?1:x); return x<=0.0031308? 12.92*x : 1.055*Math.pow(x,1/2.4)-0.055; };
      const R = Math.max(0, Math.min(1, lin2srgb(rL)));
      const G = Math.max(0, Math.min(1, lin2srgb(gL)));
      const Bc= Math.max(0, Math.min(1, lin2srgb(bL)));
      out[i  ] = Math.round(R*255*a);
      out[i+1] = Math.round(G*255*a);
      out[i+2] = Math.round(Bc*255*a);
    }
    const ctxA = CAfter.getContext('2d');
    const scaled = document.createElement('canvas'); scaled.width = imgW; scaled.height = imgH;
    const id = new ImageData(out, imgW, imgH); scaled.getContext('2d').putImageData(id, 0, 0);
    ctxA.clearRect(0,0,CAfter.width, CAfter.height);
    ctxA.drawImage(scaled, 0, 0, CAfter.width, CAfter.height);
  }
}

function resetAfter(){
  if (!srcPixels) return;
  const ctxA = CAfter.getContext('2d');
  ctxA.clearRect(0,0,CAfter.width, CAfter.height);
  const tmp = document.createElement('canvas'); tmp.width=imgW; tmp.height=imgH;
  tmp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(srcPixels), imgW, imgH), 0, 0);
  ctxA.drawImage(tmp, 0, 0, CAfter.width, CAfter.height);
}
