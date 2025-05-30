/**
 * Utility functions for the Image Color Changer app
 */

// History management for undo/redo operations
class HistoryManager {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
    }
    
    addState(state) {
        // If we're not at the end of the history array, remove everything after current index
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }
        
        // Add the new state and increment the index
        this.history.push(state);
        this.currentIndex++;
        
        this.updateButtonStates();
    }
    
    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            this.updateButtonStates();
            return this.getCurrentState();
        }
        return null;
    }
    
    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            this.updateButtonStates();
            return this.getCurrentState();
        }
        return null;
    }
    
    canUndo() {
        return this.currentIndex > 0;
    }
    
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }
    
    getCurrentState() {
        if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
            return this.history[this.currentIndex];
        }
        return null;
    }
    
    reset() {
        this.history = [];
        this.currentIndex = -1;
        this.updateButtonStates();
    }
    
    updateButtonStates() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn && redoBtn) {
            undoBtn.disabled = !this.canUndo();
            redoBtn.disabled = !this.canRedo();
        }
    }
}

/**
 * Creates an image state object for history tracking
 * @param {HTMLImageElement|HTMLElement} imageElement - The image or SVG element
 * @param {Array} colorPairs - Array of source/target color pairs
 * @returns {Object} State object
 */
function createImageState(imageElement, colorPairs) {
    // For SVG elements
    if (imageElement.tagName.toLowerCase() === 'svg') {
        return {
            isSvg: true,
            svgContent: imageElement.outerHTML,
            colorPairs: JSON.parse(JSON.stringify(colorPairs))
        };
    }
    
    // For regular images
    return {
        isSvg: false,
        imageData: imageElement.src,
        colorPairs: JSON.parse(JSON.stringify(colorPairs))
    };
}

/**
 * Shows a notification to the user
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, warning)
 */
function showNotification(message, type = 'success') {
    // Remove any existing notification
    const existingNotification = document.querySelector('.color-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'color-notification';
    notification.textContent = message;
    
    // Set background color based on type
    if (type === 'error') {
        notification.style.backgroundColor = 'var(--error-color)';
    } else if (type === 'warning') {
        notification.style.backgroundColor = 'var(--warning-color)';
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 2.5 seconds
    setTimeout(() => {
        notification.remove();
    }, 2500);
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Checks if an image is SVG based on its content or file extension
 * @param {File|string} source - The image file or data URL
 * @returns {boolean} True if the image is SVG
 */
function isSvgImage(source) {
    if (source instanceof File) {
        return source.type === 'image/svg+xml' || source.name.toLowerCase().endsWith('.svg');
    } 
    
    if (typeof source === 'string') {
        if (source.startsWith('data:')) {
            return source.includes('image/svg+xml');
        }
        return source.includes('<svg') || source.toLowerCase().endsWith('.svg');
    }
    
    return false;
}

/**
 * Safely parses SVG content into an HTML element
 * @param {string} svgContent - The SVG content as string
 * @returns {HTMLElement} The SVG element
 */
function parseSvgContent(svgContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    return doc.documentElement;
}

/**
 * Creates a download link for the image
 * @param {string} dataUrl - The data URL for the image
 * @param {string} format - The format of the image (png, jpeg, webp, svg)
 * @param {string} originalName - The original filename
 */
function downloadImage(dataUrl, format, originalName = 'image') {
    const link = document.createElement('a');
    link.href = dataUrl;
    
    // Generate filename
    const baseName = originalName.split('.')[0] || 'image';
    link.download = `${baseName}_modified.${format}`;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}