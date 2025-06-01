/**
 * Image Color Changer
 * Main application script
 */

// Global variables
let originalFile = null;
let originalImage = null;
let modifiedImage = null;
let isSvg = false;
let colorPairs = [];
const historyManager = new HistoryManager();

// Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadContainer = document.getElementById('upload-container');
const editorContainer = document.getElementById('editor-container');
const originalImageHolder = document.getElementById('original-image-holder');
const modifiedImageHolder = document.getElementById('modified-image-holder');
const colorReplacementsContainer = document.getElementById('color-replacements-container');
const addColorBtn = document.getElementById('add-color-btn');
// const colorToleranceSlider = document.getElementById('color-tolerance');
// const toleranceValueDisplay = document.getElementById('tolerance-value');
const downloadBtn = document.getElementById('download-btn');
const downloadFormatSelect = document.getElementById('download-format');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const resetBtn = document.getElementById('reset-btn');
const backBtn = document.getElementById('back-btn');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeModalBtn = document.querySelector('.close-modal');

// Initialize the application
function init() {
    setupEventListeners();
}

// Throttle utility
function throttle(fn, delay) {
    let timeout = null;
    let lastArgs;
    return function (...args) {
        lastArgs = args;
        if (!timeout) {
            fn.apply(this, args);
            timeout = setTimeout(() => {
                timeout = null;
                if (lastArgs !== args) fn.apply(this, lastArgs);
            }, delay);
        }
    };
}

function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}


// Set up event listeners
function setupEventListeners() {
    // Upload event listeners
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('active');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('active');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('active');

        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // Editor event listeners
    addColorBtn.addEventListener('click', addColorPair);
    // colorToleranceSlider.addEventListener('input', updateToleranceValue);
    downloadBtn.addEventListener('click', handleDownload);
    undoBtn.addEventListener('click', handleUndo);
    redoBtn.addEventListener('click', handleRedo);
    resetBtn.addEventListener('click', handleReset);
    backBtn.addEventListener('click', goBackToUpload);

    // Help modal
    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('active');
    });

    closeModalBtn.addEventListener('click', () => {
        helpModal.classList.remove('active');
    });

    // Close modal when clicking outside content
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('active');
        }
    });
}

// Handle file input change
function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFiles(e.target.files);
    }
}

// Process uploaded files
function handleFiles(files) {
    const file = files[0];

    // Check file size
    if (file.size > 10 * 1024 * 1024) { // 5MB limit
        showNotification('File size exceeds 10MB limit', 'error');
        return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.svg')) {
        showNotification('Please upload a valid image file (JPG, PNG, SVG, WEBP)', 'error');
        return;
    }

    // Store original file for reference
    originalFile = file;

    // Clear previous data
    colorPairs = [];
    historyManager.reset();

    // Process the file
    const reader = new FileReader();

    reader.onload = function (e) {
        const fileContent = e.target.result;
        isSvg = isSvgImage(file);

        if (isSvg) {
            processSvgFile(fileContent);
        } else {
            processRasterImage(fileContent);
        }

        // Show editor, hide upload
        uploadContainer.style.display = 'none';
        editorContainer.style.display = 'block';
    };

    if (isSvgImage(file)) {
        reader.readAsText(file);
    } else {
        reader.readAsDataURL(file);
    }
}

// Process SVG file
function processSvgFile(svgContent) {
    // Parse SVG content
    const svgElement = parseSvgContent(svgContent);

    // Store original SVG
    originalImage = svgElement.cloneNode(true);
    originalImageHolder.innerHTML = '';
    originalImageHolder.appendChild(originalImage.cloneNode(true));

    // Set the initial modified image
    modifiedImage = svgElement.cloneNode(true);
    modifiedImageHolder.innerHTML = '';
    modifiedImageHolder.appendChild(modifiedImage.cloneNode(true));

    // Extract colors from SVG
    const colors = extractColorsFromSvg(svgElement);

    // Clear previous color pairs
    colorReplacementsContainer.innerHTML = '';
    colorPairs = [];

    // If colors found, add them to the color pairs
    if (colors.length > 0) {
        colors.forEach(color => {
            addColorPairWithValues(color, color);
        });

        // Show notification of detected colors
        showNotification(`${colors.length} colors detected in SVG`, 'success');
    } else {
        // Add a default color pair if no colors found
        addColorPair();
    }

    // Add initial state to history
    historyManager.addState(createImageState(modifiedImage, colorPairs));
}

// Process raster image (PNG, JPG, etc.)
function processRasterImage(dataUrl) {
    const img = new Image();

    img.onload = function () {
        // Store original image
        originalImage = img;
        originalImageHolder.innerHTML = '';
        const originalImgElement = document.createElement('img');
        originalImgElement.src = dataUrl;
        originalImageHolder.appendChild(originalImgElement);

        // Set the initial modified image
        modifiedImageHolder.innerHTML = '';
        const modifiedImgElement = document.createElement('img');
        modifiedImgElement.src = dataUrl;
        modifiedImageHolder.appendChild(modifiedImgElement);
        modifiedImage = modifiedImgElement;

        // Clear previous color pairs and add a default one
        colorReplacementsContainer.innerHTML = '';
        colorPairs = [];
        addColorPair();

        // Add initial state to history
        historyManager.addState(createImageState(modifiedImage, colorPairs));
    };

    img.src = dataUrl;
}

// Add a new color pair to the UI
function addColorPair() {
    const colorPairId = generateId();
    const colorPair = {
        id: colorPairId,
        source: '#cccccc',
        target: '#000000'
    };

    colorPairs.push(colorPair);
    renderColorPair(colorPair);
    updateImage();
}

// Add a color pair with specific values
function addColorPairWithValues(sourceColor, targetColor) {
    const colorPairId = generateId();
    const colorPair = {
        id: colorPairId,
        source: sourceColor,
        target: targetColor
    };

    colorPairs.push(colorPair);
    renderColorPair(colorPair);
}

// Render a color pair in the UI
function renderColorPair(colorPair) {
    const colorPairElement = document.createElement('div');
    colorPairElement.className = 'color-pair';
    colorPairElement.dataset.id = colorPair.id;

    colorPairElement.innerHTML = `
        <div class="color-picker-group">
            <div class="color-picker-label">Source Color</div>
           <div class="color-picker">
    <input type="color" class="source-color" value="${colorPair.source}" aria-label="Source Color">
    <input type="text" class="source-color-text" value="${colorPair.source}" maxlength="7" aria-label="Source Hex">
</div>

        </div>
        
        <div class="color-picker-group">
            <div class="color-picker-label">Target Color</div>
            <div class="color-picker">
                <input type="color" class="target-color" value="${colorPair.target}" aria-label="Target Color">
                <input type="text" class="target-color-text" value="${colorPair.target}" maxlength="7" aria-label="Target Hex">
            </div>
        </div>
        
        <button class="remove-color-btn" aria-label="Remove Color Pair">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;

    colorReplacementsContainer.appendChild(colorPairElement);

    // Add event listeners to the new elements
    const sourceColorInput = colorPairElement.querySelector('.source-color');
    const targetColorInput = colorPairElement.querySelector('.target-color');
    const removeBtn = colorPairElement.querySelector('.remove-color-btn');

    const debouncedSourceUpdate = debounce(() => {
        updateColorPair(colorPair.id, 'source', sourceColorInput.value);
        historyManager.addState(createImageState(modifiedImage, colorPairs)); // Optional: track state only on stop
    }, 100); // 300ms after stop

    sourceColorInput.addEventListener('input', debouncedSourceUpdate);


    const debouncedTargetUpdate = debounce(() => {
        updateColorPair(colorPair.id, 'target', targetColorInput.value);
        historyManager.addState(createImageState(modifiedImage, colorPairs));
    }, 100);

    targetColorInput.addEventListener('input', debouncedTargetUpdate);

    sourceColorInput.addEventListener('change', () => {
        updateImage();
        // Add new state to history after color change
        historyManager.addState(createImageState(modifiedImage, colorPairs));
    });

    targetColorInput.addEventListener('change', () => {
        updateImage();
        // Add new state to history after color change
        historyManager.addState(createImageState(modifiedImage, colorPairs));
    });

    removeBtn.addEventListener('click', () => {
        removeColorPair(colorPair.id);
    });
    const sourceColorText = colorPairElement.querySelector('.source-color-text');
    const targetColorText = colorPairElement.querySelector('.target-color-text');

    // Source sync
    sourceColorInput.addEventListener('input', () => {
        sourceColorText.value = sourceColorInput.value.toUpperCase();
    });
    sourceColorText.addEventListener('input', () => {
        const val = sourceColorText.value.trim();
        if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
            sourceColorInput.value = val;
            updateColorPair(colorPair.id, 'source', val);
            updateImage();
        }
    });

    // Target sync
    targetColorInput.addEventListener('input', () => {
        targetColorText.value = targetColorInput.value.toUpperCase();
    });
    targetColorText.addEventListener('input', () => {
        const val = targetColorText.value.trim();
        if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
            targetColorInput.value = val;
            updateColorPair(colorPair.id, 'target', val);
            updateImage();
        }
    });

}

// Update a color pair in the colorPairs array
function updateColorPair(id, property, value) {
    const index = colorPairs.findIndex(pair => pair.id === id);
    if (index !== -1) {
        colorPairs[index][property] = value;
        updateImage();
    }
}

// Remove a color pair
function removeColorPair(id) {
    const index = colorPairs.findIndex(pair => pair.id === id);
    if (index !== -1) {
        colorPairs.splice(index, 1);

        // Remove from DOM
        const element = document.querySelector(`.color-pair[data-id="${id}"]`);
        if (element) {
            element.remove();
        }

        updateImage();

        // Add new state to history after removal
        historyManager.addState(createImageState(modifiedImage, colorPairs));
    }
}

// Update tolerance value display
// function updateToleranceValue() {
//     const value = colorToleranceSlider.value;
//     toleranceValueDisplay.textContent = value;

//     // Update image with new tolerance
//     updateImage();

//     // Add new state to history after significant change
//     // Throttle history addition to avoid too many states
//     clearTimeout(this.toleranceTimeout);
//     this.toleranceTimeout = setTimeout(() => {
//         historyManager.addState(createImageState(modifiedImage, colorPairs));
//     }, 500);
// }

// Update the modified image with current color replacements
function updateImage() {
    // const tolerance = parseInt(colorToleranceSlider.value, 10);

    if (isSvg) {
        // For SVG, replace colors directly in the SVG structure
        const newSvg = replaceColorsInSvg(originalImage, colorPairs);
        modifiedImageHolder.innerHTML = '';
        modifiedImageHolder.appendChild(newSvg);
        modifiedImage = newSvg;
    } else {
        // For raster images, use canvas to replace colors
        replaceColorsInImage(originalImage, colorPairs)
            .then(newImageData => {
                modifiedImage.src = newImageData;
            })
            .catch(error => {
                console.error('Error updating image:', error);
                showNotification('Error updating image', 'error');
            });
    }
}

// Handle download button click
function handleDownload() {
    const format = downloadFormatSelect.value;

    if (isSvg && modifiedImage) {
        // For SVG files
        const svgUrl = svgToDataUrl(modifiedImage);

        convertSvgToFormat(svgUrl, format)
            .then(dataUrl => {
                downloadImage(dataUrl, format, originalFile.name);
            })
            .catch(error => {
                console.error('Error preparing SVG for download:', error);
                showNotification('Error preparing download', 'error');
            });
    } else if (modifiedImage) {
        // For raster images
        convertImageFormat(modifiedImage.src, format)
            .then(dataUrl => {
                downloadImage(dataUrl, format, originalFile.name);
            })
            .catch(error => {
                console.error('Error preparing image for download:', error);
                showNotification('Error preparing download', 'error');
            });
    }
}

// Handle undo button click
function handleUndo() {
    const previousState = historyManager.undo();
    if (previousState) {
        applyHistoryState(previousState);
    }
}

// Handle redo button click
function handleRedo() {
    const nextState = historyManager.redo();
    if (nextState) {
        applyHistoryState(nextState);
    }
}

// Apply a history state
function applyHistoryState(state) {
    // Update color pairs
    colorPairs = JSON.parse(JSON.stringify(state.colorPairs));

    // Rebuild color pairs UI
    colorReplacementsContainer.innerHTML = '';
    colorPairs.forEach(pair => {
        renderColorPair(pair);
    });

    // Update image
    if (state.isSvg) {
        // For SVG states
        const svgElement = parseSvgContent(state.svgContent);
        modifiedImageHolder.innerHTML = '';
        modifiedImageHolder.appendChild(svgElement);
        modifiedImage = svgElement;
    } else {
        // For raster image states
        modifiedImage.src = state.imageData;
    }
}

// Handle reset button click
function handleReset() {
    // Reset to original image
    if (isSvg) {
        modifiedImageHolder.innerHTML = '';
        const resetSvg = originalImage.cloneNode(true);
        modifiedImageHolder.appendChild(resetSvg);
        modifiedImage = resetSvg;
    } else {
        modifiedImage.src = originalImage.src;
    }

    // Reset color pairs
    colorPairs = [];
    colorReplacementsContainer.innerHTML = '';

    if (isSvg) {
        // For SVGs, re-extract colors
        const colors = extractColorsFromSvg(originalImage);
        if (colors.length > 0) {
            colors.forEach(color => {
                addColorPairWithValues(color, color);
            });
        } else {
            addColorPair();
        }
    } else {
        // For raster images, add a default color pair
        addColorPair();
    }

    // Reset tolerance
    colorToleranceSlider.value = 20;
    toleranceValueDisplay.textContent = '20';

    // Add new state to history
    historyManager.addState(createImageState(modifiedImage, colorPairs));
}

// Go back to upload screen
function goBackToUpload() {
    // Reset state
    originalFile = null;
    originalImage = null;
    modifiedImage = null;
    isSvg = false;
    colorPairs = [];
    historyManager.reset();

    // Clear UI
    originalImageHolder.innerHTML = '';
    modifiedImageHolder.innerHTML = '';
    colorReplacementsContainer.innerHTML = '';

    // Show upload, hide editor
    uploadContainer.style.display = 'block';
    editorContainer.style.display = 'none';
}

// Start the application
document.addEventListener('DOMContentLoaded', init);