// Button effects data
const buttonEffects = [
    {
        id: 'scale-up',
        name: 'Scale Up',
        className: 'scale-up',
        label: 'Hover Me',
        css: `.scale-up {
  padding: 10px 20px;
  background-color: #4f46e5;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.scale-up:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
}`
    },
    {
        id: 'border-animation',
        name: 'Border Animation',
        className: 'border-animation',
        label: 'Hover Me',
        css: `.border-animation {
  padding: 10px 20px;
  background-color: transparent;
  color: #4f46e5;
  border: 2px solid #4f46e5;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  z-index: 1;
  overflow: hidden;
  transition: color 0.3s ease;
}

.border-animation::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 0%;
  height: 100%;
  background-color: #4f46e5;
  z-index: -1;
  transition: width 0.3s ease;
}

.border-animation:hover {
  color: white;
}

.border-animation:hover::before {
  width: 100%;
}`
    },
    {
        id: 'gradient-shift',
        name: 'Gradient Shift',
        className: 'gradient-shift',
        label: 'Hover Me',
        css: `.gradient-shift {
  padding: 10px 20px;
  background: linear-gradient(to right, #4f46e5 0%, #ec4899 100%);
  background-size: 200% auto;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-position 0.5s ease;
}

.gradient-shift:hover {
  background-position: right center;
}`
    },
    {
        id: 'text-slide',
        name: 'Text Slide',
        className: 'text-slide',
        label: 'Hover Me',
        css: `.text-slide {
  padding: 10px 20px;
  background-color: #4f46e5;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.text-slide::before {
  content: 'Click Me';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.text-slide:hover::before {
  transform: translateY(0);
}`
    },
    {
        id: 'shadow-pulse',
        name: 'Shadow Pulse',
        className: 'shadow-pulse',
        label: 'Hover Me',
        css: `.shadow-pulse {
  padding: 10px 20px;
  background-color: white;
  color: #4f46e5;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.shadow-pulse:hover {
  box-shadow: 0 0 0 5px rgba(79, 70, 229, 0.2);
}`
    },
    {
        id: 'outline-fill',
        name: 'Outline Fill',
        className: 'outline-fill',
        label: 'Hover Me',
        css: `.outline-fill {
  padding: 10px 20px;
  background-color: transparent;
  color: #4f46e5;
  border: 2px solid #4f46e5;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: color 0.3s ease;
}

.outline-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #4f46e5;
  z-index: -1;
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 0.3s ease;
}

.outline-fill:hover {
  color: white;
}

.outline-fill:hover::after {
  transform: scaleY(1);
}`
    },
    {
        id: 'bounce-effect',
        name: 'Bounce Effect',
        className: 'bounce-effect',
        label: 'Hover Me',
        css: `.bounce-effect {
  padding: 10px 20px;
  background-color: #4f46e5;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.bounce-effect:hover {
  transform: translateY(-5px);
}`
    },
    {
        id: 'shimmer-effect',
        name: 'Shimmer Effect',
        className: 'shimmer-effect',
        label: 'Hover Me',
        css: `.shimmer-effect {
  padding: 10px 20px;
  background-color: #4f46e5;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.shimmer-effect::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: rotate(30deg);
  transition: transform 0.7s;
  opacity: 0;
}

.shimmer-effect:hover::before {
  transform: rotate(30deg) translate(150%, -150%);
  opacity: 1;
}`
    },
    {
        id: 'spin-effect',
        name: 'Spin Effect',
        className: 'spin-effect',
        label: 'Hover Me',
        css: `.spin-effect {
  padding: 10px 20px;
  background-color: #4f46e5;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.spin-effect::after {
  content: '→';
  position: absolute;
  right: -20px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: all 0.3s ease;
}

.spin-effect:hover {
  padding-right: 35px;
}

.spin-effect:hover::after {
  right: 15px;
  opacity: 1;
}`
    },
    {
        id: 'neon-glow',
        name: 'Neon Glow',
        className: 'neon-glow',
        label: 'Hover Me',
        css: `.neon-glow {
  padding: 10px 20px;
  background-color: transparent;
  color: #4f46e5;
  border: 2px solid #4f46e5;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.neon-glow:hover {
  color: white;
  background-color: #4f46e5;
  box-shadow: 0 0 10px #4f46e5, 0 0 20px rgba(79, 70, 229, 0.5);
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
}`
    }
];

// Create button cards
function createButtonCards() {
    const buttonGrid = document.getElementById('buttonGrid');
    
    buttonEffects.forEach(effect => {
        const card = document.createElement('div');
        card.className = 'button-card';
        
        card.innerHTML = `
            <div class="card-content">
                <h3 class="card-title">${effect.name}</h3>
                <div class="button-preview">
                    <button class="${effect.className}">${effect.label}</button>
                </div>
                <button class="copy-button" data-id="${effect.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy CSS</span>
                    <span class="tooltip">Copied!</span>
                </button>
            </div>
            <div class="code-container">
                <pre><code>${effect.css}</code></pre>
            </div>
        `;
        
        buttonGrid.appendChild(card);
    });
}

// Copy to clipboard functionality
function initializeCopyButtons() {
    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', async () => {
            const effectId = button.dataset.id;
            const effect = buttonEffects.find(e => e.id === effectId);
            
            try {
                await navigator.clipboard.writeText(effect.css);
                const tooltip = button.querySelector('.tooltip');
                tooltip.classList.add('show');
                
                setTimeout(() => {
                    tooltip.classList.remove('show');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    });
}

// Set current year in footer
function setCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    yearElement.textContent = new Date().getFullYear();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createButtonCards();
    initializeCopyButtons();
    setCurrentYear();
});