// modules/app.js
import { $, $$, on } from "/assets/js/ctl.js";
import { toast } from "/assets/js/ui.js";

import { HistoryManager } from "./history.js";
import { debounce, throttle, generateId, isSvgImage } from "./utils.js";
import {
  extractColorsFromSvg,
  replaceColorsInSvg,
  svgToDataUrl,
  convertSvgToFormat,
  parseSvgContent,
} from "./svg.js";
import {
  replaceColorsInImage,
  convertImageFormat,
} from "./raster.js";

export function initApp(){
  // scope everything inside the wrapper
  const root = document.getElementById("ctl-image-color-changer");
  if(!root){ console.warn("[icc] wrapper not found"); return; }

  // Elements (keep your IDs/classes exactly)
  const dropzone = $("#dropzone", root);
  const fileInput = $("#file-input", root);
  const uploadContainer = $("#upload-container", root);
  const editorContainer = $("#editor-container", root);
  const originalImageHolder = $("#original-image-holder", root);
  const modifiedImageHolder = $("#modified-image-holder", root);
  const colorReplacementsContainer = $("#color-replacements-container", root);
  const addColorBtn = $("#add-color-btn", root);
  const downloadBtn = $("#download-btn", root);
  const downloadFormatSelect = $("#download-format", root);
  const undoBtn = $("#undo-btn", root);
  const redoBtn = $("#redo-btn", root);
  const resetBtn = $("#reset-btn", root);
  const backBtn = $("#back-btn", root);
  const helpModal = $("#help-modal");
  const closeModalBtn = $(".ctl-close-modal");

  // State (same behavior)
  let originalFile = null;
  let originalImage = null;
  let modifiedImage = null;
  let isSvg = false;
  let colorPairs = [];
  const history = new HistoryManager(undoBtn, redoBtn);

  // --- Event listeners (identical UX) ---
  on(dropzone, "click", ()=> fileInput.click());
  on(fileInput, "change", e => { if(e.target.files.length) handleFiles(e.target.files); });

  on(dropzone, "dragover", e => { e.preventDefault(); dropzone.classList.add("active"); });
  on(dropzone, "dragleave", ()=> dropzone.classList.remove("active"));
  on(dropzone, "drop", e=>{
    e.preventDefault(); dropzone.classList.remove("active");
    if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });

  on(addColorBtn, "click", addColorPair);
  on(downloadBtn, "click", handleDownload);
  on(undoBtn, "click", ()=> applyHistoryState(history.undo()));
  on(redoBtn, "click", ()=> applyHistoryState(history.redo()));
  on(resetBtn, "click", handleReset);
  on(backBtn, "click", goBackToUpload);
  if(closeModalBtn && helpModal){
    on(closeModalBtn, "click", ()=> helpModal.classList.remove("active"));
    on(helpModal, "click", e=>{ if(e.target===helpModal) helpModal.classList.remove("active"); });
  }

  function handleFiles(files){
    const file = files[0];

    if(file.size > 10*1024*1024){ toast("File size exceeds 10MB"); return; }

    const valid = ["image/jpeg","image/png","image/svg+xml","image/webp"];
    if(!valid.includes(file.type) && !file.name.toLowerCase().endsWith(".svg")){
      toast("Upload JPG, PNG, SVG, or WEBP"); return;
    }

    originalFile = file; colorPairs = []; history.reset();

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target.result;
      isSvg = isSvgImage(file);

      if(isSvg){ processSvgFile(String(content)); }
      else { processRasterImage(String(content)); }

      uploadContainer.style.display = "none";
      editorContainer.style.display = "block";
    };
    isSvgImage(file) ? reader.readAsText(file) : reader.readAsDataURL(file);
  }

  function processSvgFile(svgText){
    const svgEl = parseSvgContent(svgText);
    originalImage = svgEl.cloneNode(true);
    originalImageHolder.innerHTML = "";
    originalImageHolder.appendChild(originalImage.cloneNode(true));

    modifiedImage = svgEl.cloneNode(true);
    modifiedImageHolder.innerHTML = "";
    modifiedImageHolder.appendChild(modifiedImage.cloneNode(true));

    const colors = extractColorsFromSvg(svgEl);
    colorReplacementsContainer.innerHTML = "";
    colorPairs = [];

    if(colors.length){
      colors.forEach(c => addColorPairWithValues(c, c));
      toast(`${colors.length} colors detected in SVG`);
    } else {
      addColorPair();
    }
    history.addState(createImageState(modifiedImage, colorPairs));
  }

  function processRasterImage(dataUrl){
    const img = new Image();
    img.onload = ()=>{
      originalImage = img;
      originalImageHolder.innerHTML = "";
      const o = document.createElement("img"); o.src = dataUrl;
      originalImageHolder.appendChild(o);

      modifiedImageHolder.innerHTML = "";
      const m = document.createElement("img"); m.src = dataUrl;
      modifiedImageHolder.appendChild(m);
      modifiedImage = m;

      colorReplacementsContainer.innerHTML = "";
      colorPairs = [];
      addColorPair();
      history.addState(createImageState(modifiedImage, colorPairs));
    };
    img.src = dataUrl;
  }

  // ---- UI builders (same markup) ----
  function addColorPair(){
    const id = generateId();
    const pair = { id, source: "#cccccc", target: "#000000" };
    colorPairs.push(pair);
    renderColorPair(pair);
    updateImage();
  }
  function addColorPairWithValues(source, target){
    const id = generateId();
    const pair = { id, source, target };
    colorPairs.push(pair);
    renderColorPair(pair);
  }
  function renderColorPair(pair){
    const el = document.createElement("div");
    el.className = "ctl-color-pair";
    el.dataset.id = pair.id;
    el.innerHTML = `
      <div class="ctl-color-picker-group">
        <div class="ctl-color-picker-label">Source Color</div>
        <div class="ctl-color-picker">
          <input type="color" class="ctl-source-color" value="${pair.source}" aria-label="Source Color">
          <input type="text" class="ctl-source-color-text" value="${pair.source}" maxlength="7" aria-label="Source Hex">
        </div>
      </div>
      <div class="ctl-color-picker-group">
        <div class="ctl-color-picker-label">Target Color</div>
        <div class="ctl-color-picker">
          <input type="color" class="ctl-target-color" value="${pair.target}" aria-label="Target Color">
          <input type="text" class="ctl-target-color-text" value="${pair.target}" maxlength="7" aria-label="Target Hex">
        </div>
      </div>
      <button class="ctl-remove-color-btn" aria-label="Remove Color Pair">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
    colorReplacementsContainer.appendChild(el);

    const srcCol = $(".ctl-source-color", el);
    const tgtCol = $(".ctl-target-color", el);
    const rm = $(".ctl-remove-color-btn", el);
    const srcText = $(".ctl-source-color-text", el);
    const tgtText = $(".ctl-target-color-text", el);

    const debSrc = debounce(()=> { updatePair(pair.id, "source", srcCol.value); history.addState(createImageState(modifiedImage, colorPairs)); }, 100);
    const debTgt = debounce(()=> { updatePair(pair.id, "target", tgtCol.value); history.addState(createImageState(modifiedImage, colorPairs)); }, 100);

    on(srcCol, "input", debSrc);
    on(tgtCol, "input", debTgt);

    on(srcCol, "change", ()=>{ updateImage(); history.addState(createImageState(modifiedImage, colorPairs)); });
    on(tgtCol, "change", ()=>{ updateImage(); history.addState(createImageState(modifiedImage, colorPairs)); });

    on(rm, "click", ()=> removePair(pair.id));

    // text ↔ color sync
    on(srcCol, "input", ()=> srcText.value = srcCol.value.toUpperCase());
    on(tgtCol, "input", ()=> tgtText.value = tgtCol.value.toUpperCase());
    on(srcText, "input", ()=> tryHex(srcText.value, v=>{ srcCol.value=v; updatePair(pair.id,"source",v); updateImage(); }));
    on(tgtText, "input", ()=> tryHex(tgtText.value, v=>{ tgtCol.value=v; updatePair(pair.id,"target",v); updateImage(); }));
  }

  function tryHex(val, ok){
    const v = String(val).trim();
    if(/^#([0-9A-F]{3}){1,2}$/i.test(v)) ok(v);
  }

  function updatePair(id, key, value){
    const i = colorPairs.findIndex(p=>p.id===id);
    if(i>-1){ colorPairs[i][key]=value; updateImage(); }
  }

  function removePair(id){
    const i = colorPairs.findIndex(p=>p.id===id);
    if(i>-1){
      colorPairs.splice(i,1);
      const el = root.querySelector(`.ctl-color-pair[data-id="${id}"]`);
      if(el) el.remove();
      updateImage();
      history.addState(createImageState(modifiedImage, colorPairs));
    }
  }

  function updateImage(){
    if(isSvg){
      const newSvg = replaceColorsInSvg(originalImage, colorPairs);
      modifiedImageHolder.innerHTML = "";
      modifiedImageHolder.appendChild(newSvg);
      modifiedImage = newSvg;
    } else {
      replaceColorsInImage(originalImage, colorPairs)
        .then(dataUrl => { modifiedImage.src = dataUrl; })
        .catch(err => { console.error(err); toast("Error updating image"); });
    }
  }

  function handleDownload(){
    const fmt = downloadFormatSelect.value;
    if(isSvg && modifiedImage){
      const url = svgToDataUrl(modifiedImage);
      convertSvgToFormat(url, fmt)
        .then(dataUrl => download(dataUrl, fmt, originalFile?.name))
        .catch(()=> toast("Error preparing download"));
    } else if(modifiedImage){
      convertImageFormat(modifiedImage.src, fmt)
        .then(dataUrl => download(dataUrl, fmt, originalFile?.name))
        .catch(()=> toast("Error preparing download"));
    }
  }

  function download(dataUrl, format, originalName="image"){
    const a = document.createElement("a");
    const base = (originalName.split(".")[0]||"image");
    a.href = dataUrl; a.download = `${base}_modified.${format}`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function applyHistoryState(state){
    if(!state) return;
    colorPairs = JSON.parse(JSON.stringify(state.colorPairs));
    colorReplacementsContainer.innerHTML = "";
    colorPairs.forEach(renderColorPair);

    if(state.isSvg){
      const svgEl = parseSvgContent(state.svgContent);
      modifiedImageHolder.innerHTML = "";
      modifiedImageHolder.appendChild(svgEl);
      modifiedImage = svgEl;
    } else {
      if(modifiedImage) modifiedImage.src = state.imageData;
    }
  }

  function handleReset(){
    if(isSvg){
      const resetSvg = originalImage.cloneNode(true);
      modifiedImageHolder.innerHTML = "";
      modifiedImageHolder.appendChild(resetSvg);
      modifiedImage = resetSvg;
    } else if(originalImage){
      modifiedImage.src = originalImage.src;
    }
    colorPairs = [];
    colorReplacementsContainer.innerHTML = "";

    if(isSvg){
      const colors = extractColorsFromSvg(originalImage);
      if(colors.length){ colors.forEach(c=> addColorPairWithValues(c,c)); }
      else { addColorPair(); }
    } else {
      addColorPair();
    }

    history.addState(createImageState(modifiedImage, colorPairs));
  }

  function goBackToUpload(){
    originalFile = originalImage = modifiedImage = null;
    isSvg = false; colorPairs = []; history.reset();
    originalImageHolder.innerHTML = "";
    modifiedImageHolder.innerHTML = "";
    colorReplacementsContainer.innerHTML = "";
    uploadContainer.style.display = "block";
    editorContainer.style.display = "none";
  }

  // utility used by history
  function createImageState(imageEl, pairs){
    if(imageEl && imageEl.tagName?.toLowerCase()==="svg"){
      return { isSvg:true, svgContent:imageEl.outerHTML, colorPairs:JSON.parse(JSON.stringify(pairs)) };
    }
    return { isSvg:false, imageData:imageEl?.src, colorPairs:JSON.parse(JSON.stringify(pairs)) };
  }
}
