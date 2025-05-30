/**
 * Utility functions for color manipulation and SVG processing
 */

/**
 * Extracts all unique colors from an SVG element
 * @param {HTMLElement} svgElement - The SVG element to analyze
 * @returns {Array} Array of unique color strings
 */
function extractColorsFromSvg(svgElement) {
    const colors = new Set();
    
    // Function to check if a color is valid and not transparent
    const isValidColor = (color) => {
        return color && 
               color !== 'none' && 
               color !== 'transparent' &&
               color !== 'rgba(0, 0, 0, 0)' &&
               !color.includes('url(');
    };
    
    // Process an element and its descendants
    const processElement = (element) => {
        if (!element || element.nodeType !== 1) return;
        
        // Check fill attribute
        const fill = element.getAttribute('fill');
        if (isValidColor(fill)) colors.add(fill);
        
        // Check stroke attribute
        const stroke = element.getAttribute('stroke');
        if (isValidColor(stroke)) colors.add(stroke);
        
        // Check style attribute for fill and stroke
        const style = element.getAttribute('style');
        if (style) {
            const fillMatch = style.match(/fill:\s*([^;]+)/);
            if (fillMatch && isValidColor(fillMatch[1])) colors.add(fillMatch[1]);
            
            const strokeMatch = style.match(/stroke:\s*([^;]+)/);
            if (strokeMatch && isValidColor(strokeMatch[1])) colors.add(strokeMatch[1]);
        }
        
        // Process child elements
        Array.from(element.children).forEach(processElement);
    };
    
    // Start processing from the SVG element
    processElement(svgElement);
    
    return Array.from(colors);
}

/**
 * Replaces colors in an SVG element
 * @param {HTMLElement} svgElement - The SVG element to modify
 * @param {Array} colorPairs - Array of {source, target} color pairs
 * @returns {HTMLElement} The modified SVG element
 */
function replaceColorsInSvg(svgElement, colorPairs) {
    // Create a deep clone of the SVG element to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true);
    
    // Process an element and its descendants
    const processElement = (element) => {
        if (!element || element.nodeType !== 1) return;
        
        // Check and replace fill attribute
        if (element.hasAttribute('fill')) {
            const fill = element.getAttribute('fill');
            colorPairs.forEach(pair => {
                if (colorMatches(fill, pair.source)) {
                    element.setAttribute('fill', pair.target);
                }
            });
        }
        
        // Check and replace stroke attribute
        if (element.hasAttribute('stroke')) {
            const stroke = element.getAttribute('stroke');
            colorPairs.forEach(pair => {
                if (colorMatches(stroke, pair.source)) {
                    element.setAttribute('stroke', pair.target);
                }
            });
        }
        
        // Check and replace colors in style attribute
        if (element.hasAttribute('style')) {
            let style = element.getAttribute('style');
            
            colorPairs.forEach(pair => {
                style = style.replace(/fill:\s*([^;]+)/g, (match, color) => {
                    return colorMatches(color, pair.source) ? 
                        `fill: ${pair.target}` : match;
                });
                
                style = style.replace(/stroke:\s*([^;]+)/g, (match, color) => {
                    return colorMatches(color, pair.source) ? 
                        `stroke: ${pair.target}` : match;
                });
            });
            
            element.setAttribute('style', style);
        }
        
        // Process child elements
        Array.from(element.children).forEach(processElement);
    };
    
    // Start processing from the cloned SVG element
    processElement(clonedSvg);
    
    return clonedSvg;
}

/**
 * Checks if a color matches the source color, considering tolerance
 * @param {string} color1 - The color to check
 * @param {string} color2 - The source color
 * @param {number} tolerance - The color tolerance (0-100)
 * @returns {boolean} Whether the colors match within tolerance
 */
function colorMatches(color1, color2, tolerance = 0) {
    // If colors are exactly the same, return true
    if (color1 === color2) return true;
    
    // If tolerance is 0, require exact match
    if (tolerance === 0) return false;
    
    // Convert both colors to RGB format for comparison
    const rgb1 = colorToRgb(color1);
    const rgb2 = colorToRgb(color2);
    
    // If any conversion failed, require exact match
    if (!rgb1 || !rgb2) return false;
    
    // Calculate color distance (Euclidean distance in RGB space)
    const distance = Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
    
    // Convert tolerance to a distance threshold (max distance is √(255²+255²+255²) ≈ 441.7)
    const maxDistance = 441.7;
    const threshold = (tolerance / 100) * maxDistance;
    
    return distance <= threshold;
}

/**
 * Converts a color string to RGB object
 * @param {string} color - The color string (hex, rgb, rgba, named color)
 * @returns {Object|null} RGB object with r, g, b properties or null if conversion fails
 */
function colorToRgb(color) {
    // Create a temporary element to use the browser's color parsing
    const tempElement = document.createElement('div');
    tempElement.style.color = color;
    document.body.appendChild(tempElement);
    
    // Get computed style
    const computedColor = getComputedStyle(tempElement).color;
    document.body.removeChild(tempElement);
    
    // Parse RGB/RGBA format
    const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10)
        };
    }
    
    return null;
}

/**
 * Converts a color to a format suitable for canvas
 * @param {string} color - The color string
 * @returns {string} The color in a format compatible with canvas
 */
function formatColorForCanvas(color) {
    // Handle edge cases
    if (!color || color === 'none' || color === 'transparent') {
        return 'rgba(0, 0, 0, 0)';
    }
    
    return color;
}
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

const updateImageWithNewColors = debounce((image, colorPairs, tolerance) => {
    replaceColorsInImage(image, colorPairs, tolerance).then(dataUrl => {
        image.src = dataUrl;
    });
}, 300); // 300ms pause before running


/**
 * Replaces colors in a raster image using canvas
 * @param {HTMLImageElement} image - The image element
 * @param {Array} colorPairs - Array of {source, target} color pairs
 * @param {number} tolerance - The color tolerance (0-100)
 * @returns {Promise<string>} Promise resolving to the modified image data URL
 */
function replaceColorsInImage(image, colorPairs, tolerance = 0) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        
        // Draw the image on the canvas
        ctx.drawImage(image, 0, 0);
        
        // Get image data for manipulation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert colorPairs to RGB format for comparison
        const rgbColorPairs = colorPairs.map(pair => ({
            source: colorToRgb(pair.source),
            target: colorToRgb(pair.target)
        }));
        
        // Define the maximum distance based on tolerance
        const maxDistance = 441.7; // √(255²+255²+255²)
        const thresholds = rgbColorPairs.map(pair => 
            (tolerance / 100) * maxDistance
        );
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Check against each color pair
            for (let j = 0; j < rgbColorPairs.length; j++) {
                const pair = rgbColorPairs[j];
                const threshold = thresholds[j];
                
                // Skip if source color is undefined or null
                if (!pair.source) continue;
                
                // Calculate color distance
                const distance = Math.sqrt(
                    Math.pow(r - pair.source.r, 2) +
                    Math.pow(g - pair.source.g, 2) +
                    Math.pow(b - pair.source.b, 2)
                );
                
                // Replace color if within threshold
                if (distance <= threshold) {
                    data[i] = pair.target.r;
                    data[i + 1] = pair.target.g;
                    data[i + 2] = pair.target.b;
                    break; // Stop after first match
                }
            }
        }
        
        // Put modified image data back on canvas
        ctx.putImageData(imageData, 0, 0);
        
         setTimeout(() => {
            resolve(canvas.toDataURL('image/png'));
        }, 1000);
    });
}

/**
 * Converts an SVG element to a data URL
 * @param {HTMLElement} svgElement - The SVG element
 * @returns {string} The SVG as a data URL
 */
function svgToDataUrl(svgElement) {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    return URL.createObjectURL(svgBlob);
}

/**
 * Converts an SVG data URL to a downloadable format
 * @param {string} svgUrl - The SVG data URL or object URL
 * @param {string} format - The desired format (svg, png, jpeg, webp)
 * @returns {Promise<string>} Promise resolving to the image data URL
 */
function convertSvgToFormat(svgUrl, format) {
    return new Promise((resolve, reject) => {
        if (format === 'svg') {
            // For SVG format, we use the original SVG data
            fetch(svgUrl)
                .then(response => response.text())
                .then(svgText => {
                    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
                    resolve(URL.createObjectURL(svgBlob));
                })
                .catch(reject);
        } else {
            // For raster formats, render SVG to canvas and convert
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Scale up for better quality
                const scale = 2;
                canvas.width = img.naturalWidth * scale;
                canvas.height = img.naturalHeight * scale;
                
                const ctx = canvas.getContext('2d');
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);
                
                // Convert to the requested format
                let mimeType;
                switch (format) {
                    case 'png': mimeType = 'image/png'; break;
                    case 'jpeg': mimeType = 'image/jpeg'; break;
                    case 'webp': mimeType = 'image/webp'; break;
                    default: mimeType = 'image/png';
                }
                
                resolve(canvas.toDataURL(mimeType, 0.9));
            };
            img.onerror = reject;
            img.src = svgUrl;
        }
    });
}

/**
 * Converts a data URL to a specific image format
 * @param {string} dataUrl - The source data URL
 * @param {string} format - The desired format (png, jpeg, webp)
 * @returns {Promise<string>} Promise resolving to the converted data URL
 */
function convertImageFormat(dataUrl, format) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Convert to the requested format
            let mimeType;
            switch (format) {
                case 'png': mimeType = 'image/png'; break;
                case 'jpeg': mimeType = 'image/jpeg'; break;
                case 'webp': mimeType = 'image/webp'; break;
                default: mimeType = 'image/png';
            }
            
            // For JPEG, use a white background
            if (format === 'jpeg') {
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            resolve(canvas.toDataURL(mimeType, 0.9));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}