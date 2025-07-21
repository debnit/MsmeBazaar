/**
 * cursor.ai.js - Visual Cursor Overlay for Cypress Tests
 * 
 * Description:
 * This plugin overlays a visual cursor during Cypress test execution to enhance
 * test visibility for debugging and CI/CD video reviews. It tracks all mouse
 * movements, clicks, and interactions with smooth animations and visual effects.
 * 
 * Features:
 * - Visual cursor overlay (24px circle with high z-index)
 * - Follows all Cypress mouse actions (.click(), .trigger('mousemove'), .dblclick(), etc.)
 * - Ripple animation on clicks with customizable effects
 * - Trail system showing last 3 cursor positions with fading effect
 * - Floating action labels ("Clicked", "Hovered", "Double Clicked", etc.)
 * - Environment variable toggle via Cypress.env('cursorAI')
 * - TypeScript-compatible structure
 * - Non-intrusive - doesn't interfere with page UI or test behavior
 * 
 * Usage:
 * 1. Place this file in: cypress/support/plugins/cursor.ai.js
 * 2. Import in cypress/support/e2e.js: import './plugins/cursor.ai';
 * 3. Enable via environment variable in cypress.config.js:
 *    env: { cursorAI: true }
 * 4. Optional configurations via environment variables:
 *    - cursorAI: true/false (enable/disable)
 *    - cursorAI_showTrail: true/false (show cursor trail)
 *    - cursorAI_showLabels: true/false (show action labels)
 *    - cursorAI_cursorSize: number (cursor size in pixels, default: 24)
 *    - cursorAI_trailLength: number (trail length, default: 3)
 * 
 * Browser Compatibility: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
 * Cypress Compatibility: v12+
 * 
 * @author MSMEBazaar Test Automation Team
 * @version 1.0.0
 */

(function initCursorAI() {
  'use strict';

  // Check if cursor overlay is enabled
  if (!Cypress.env('cursorAI')) {
    return;
  }

  // Configuration from environment variables
  const config = {
    showTrail: Cypress.env('cursorAI_showTrail') !== false, // Default: true
    showLabels: Cypress.env('cursorAI_showLabels') !== false, // Default: true
    cursorSize: Cypress.env('cursorAI_cursorSize') || 24,
    trailLength: Cypress.env('cursorAI_trailLength') || 3,
    animationDuration: 150, // milliseconds
    rippleDuration: 600, // milliseconds
    labelDuration: 2000, // milliseconds
  };

  // State management
  let isInitialized = false;
  let cursorElement = null;
  let trailElements = [];
  let activeLabels = [];
  let lastPosition = { x: 0, y: 0 };
  let animationFrame = null;

  /**
   * Initialize CSS styles for cursor overlay
   */
  function initializeStyles() {
    if (document.getElementById('cypress-cursor-ai-styles')) {
      return; // Already initialized
    }

    const style = document.createElement('style');
    style.id = 'cypress-cursor-ai-styles';
    style.innerHTML = `
      /* Main cursor overlay */
      .cypress-ai-cursor {
        position: fixed;
        width: ${config.cursorSize}px;
        height: ${config.cursorSize}px;
        background: radial-gradient(circle, rgba(30, 136, 229, 0.9) 0%, rgba(30, 136, 229, 0.7) 70%, rgba(30, 136, 229, 0.4) 100%);
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 50%;
        z-index: 2147483647; /* Maximum z-index */
        pointer-events: none;
        transform: translate(-50%, -50%);
        transition: all ${config.animationDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        box-shadow: 0 0 10px rgba(30, 136, 229, 0.5), inset 0 0 5px rgba(255, 255, 255, 0.3);
      }

      /* Cursor hover state */
      .cypress-ai-cursor.hover {
        background: radial-gradient(circle, rgba(76, 175, 80, 0.9) 0%, rgba(76, 175, 80, 0.7) 70%, rgba(76, 175, 80, 0.4) 100%);
        box-shadow: 0 0 15px rgba(76, 175, 80, 0.6), inset 0 0 5px rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%) scale(1.2);
      }

      /* Click ripple effect */
      .cypress-click-ripple {
        position: fixed;
        border: 3px solid rgba(30, 136, 229, 0.8);
        border-radius: 50%;
        z-index: 2147483646;
        pointer-events: none;
        animation: cypress-ripple ${config.rippleDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      @keyframes cypress-ripple {
        0% {
          width: ${config.cursorSize}px;
          height: ${config.cursorSize}px;
          opacity: 1;
          transform: translate(-50%, -50%) scale(0.8);
        }
        50% {
          opacity: 0.6;
        }
        100% {
          width: ${config.cursorSize * 3}px;
          height: ${config.cursorSize * 3}px;
          opacity: 0;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      /* Double click ripple effect */
      .cypress-dblclick-ripple {
        position: fixed;
        border: 3px solid rgba(255, 152, 0, 0.8);
        border-radius: 50%;
        z-index: 2147483646;
        pointer-events: none;
        animation: cypress-double-ripple ${config.rippleDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      @keyframes cypress-double-ripple {
        0%, 50% {
          width: ${config.cursorSize}px;
          height: ${config.cursorSize}px;
          opacity: 1;
          transform: translate(-50%, -50%) scale(0.8);
        }
        25%, 75% {
          width: ${config.cursorSize * 2}px;
          height: ${config.cursorSize * 2}px;
          opacity: 0.7;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          width: ${config.cursorSize * 4}px;
          height: ${config.cursorSize * 4}px;
          opacity: 0;
          transform: translate(-50%, -50%) scale(1.2);
        }
      }

      /* Cursor trail elements */
      .cypress-cursor-trail {
        position: fixed;
        width: ${config.cursorSize * 0.6}px;
        height: ${config.cursorSize * 0.6}px;
        background: radial-gradient(circle, rgba(30, 136, 229, 0.4) 0%, rgba(30, 136, 229, 0.2) 100%);
        border-radius: 50%;
        z-index: 2147483645;
        pointer-events: none;
        transform: translate(-50%, -50%);
        transition: all ${config.animationDuration * 0.8}ms ease-out;
      }

      /* Action labels */
      .cypress-action-label {
        position: fixed;
        background: rgba(33, 33, 33, 0.9);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: 12px;
        font-weight: 600;
        z-index: 2147483647;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: cypress-label-appear ${config.labelDuration}ms ease-out forwards;
        transform: translate(-50%, -120%);
      }

      @keyframes cypress-label-appear {
        0% {
          opacity: 0;
          transform: translate(-50%, -120%) scale(0.8) translateY(10px);
        }
        15% {
          opacity: 1;
          transform: translate(-50%, -120%) scale(1) translateY(0);
        }
        85% {
          opacity: 1;
          transform: translate(-50%, -120%) scale(1) translateY(0);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -120%) scale(0.9) translateY(-10px);
        }
      }

      /* Label color variants */
      .cypress-action-label.click {
        background: rgba(30, 136, 229, 0.9);
      }

      .cypress-action-label.dblclick {
        background: rgba(255, 152, 0, 0.9);
      }

      .cypress-action-label.rightclick {
        background: rgba(156, 39, 176, 0.9);
      }

      .cypress-action-label.hover {
        background: rgba(76, 175, 80, 0.9);
      }

      .cypress-action-label.type {
        background: rgba(255, 87, 34, 0.9);
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .cypress-ai-cursor {
          width: ${config.cursorSize * 0.8}px;
          height: ${config.cursorSize * 0.8}px;
        }
        
        .cypress-cursor-trail {
          width: ${config.cursorSize * 0.5}px;
          height: ${config.cursorSize * 0.5}px;
        }
        
        .cypress-action-label {
          font-size: 11px;
          padding: 4px 8px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Create and initialize the main cursor element
   */
  function createCursor() {
    if (cursorElement) {
      return cursorElement;
    }

    cursorElement = document.createElement('div');
    cursorElement.className = 'cypress-ai-cursor';
    cursorElement.setAttribute('data-cypress-cursor', 'true');
    document.body.appendChild(cursorElement);

    return cursorElement;
  }

  /**
   * Create trail elements for cursor movement history
   */
  function createTrail() {
    if (!config.showTrail) return;

    // Clean up existing trail elements
    trailElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    trailElements = [];

    // Create new trail elements
    for (let i = 0; i < config.trailLength; i++) {
      const trailElement = document.createElement('div');
      trailElement.className = 'cypress-cursor-trail';
      trailElement.style.opacity = (config.trailLength - i) / config.trailLength * 0.6;
      trailElement.style.transform = `translate(-50%, -50%) scale(${(config.trailLength - i) / config.trailLength})`;
      trailElement.setAttribute('data-cypress-trail', i.toString());
      document.body.appendChild(trailElement);
      trailElements.push(trailElement);
    }
  }

  /**
   * Update trail positions with smooth animation
   */
  function updateTrail(x, y) {
    if (!config.showTrail || trailElements.length === 0) return;

    // Shift trail positions
    for (let i = trailElements.length - 1; i > 0; i--) {
      const currentElement = trailElements[i];
      const previousElement = trailElements[i - 1];
      if (currentElement && previousElement) {
        currentElement.style.left = previousElement.style.left;
        currentElement.style.top = previousElement.style.top;
      }
    }

    // Update first trail element to follow main cursor
    if (trailElements[0]) {
      trailElements[0].style.left = `${x}px`;
      trailElements[0].style.top = `${y}px`;
    }
  }

  /**
   * Move cursor to specified coordinates with smooth animation
   */
  function moveCursor(x, y, immediate = false) {
    if (!cursorElement) return;

    // Cancel previous animation frame
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }

    if (immediate) {
      cursorElement.style.left = `${x}px`;
      cursorElement.style.top = `${y}px`;
      updateTrail(x, y);
      lastPosition = { x, y };
    } else {
      // Smooth animation
      const startTime = performance.now();
      const startX = lastPosition.x;
      const startY = lastPosition.y;
      const deltaX = x - startX;
      const deltaY = y - startY;

      function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / config.animationDuration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

        const currentX = startX + deltaX * easeProgress;
        const currentY = startY + deltaY * easeProgress;

        cursorElement.style.left = `${currentX}px`;
        cursorElement.style.top = `${currentY}px`;
        updateTrail(currentX, currentY);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          lastPosition = { x, y };
          animationFrame = null;
        }
      }

      animationFrame = requestAnimationFrame(animate);
    }
  }

  /**
   * Create ripple effect at specified coordinates
   */
  function createRipple(x, y, type = 'click') {
    const ripple = document.createElement('div');
    ripple.className = type === 'dblclick' ? 'cypress-dblclick-ripple' : 'cypress-click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.setAttribute('data-cypress-ripple', type);
    
    document.body.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, config.rippleDuration);
  }

  /**
   * Create floating action label
   */
  function createActionLabel(x, y, text, type = 'default') {
    if (!config.showLabels) return;

    const label = document.createElement('div');
    label.className = `cypress-action-label ${type}`;
    label.textContent = text;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.setAttribute('data-cypress-label', type);
    
    document.body.appendChild(label);
    activeLabels.push(label);

    // Remove label after animation
    setTimeout(() => {
      if (label.parentNode) {
        label.parentNode.removeChild(label);
      }
      const index = activeLabels.indexOf(label);
      if (index > -1) {
        activeLabels.splice(index, 1);
      }
    }, config.labelDuration);
  }

  /**
   * Get element center coordinates
   */
  function getElementCenter(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
      return { x: lastPosition.x, y: lastPosition.y };
    }

    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  /**
   * Get coordinates from Cypress command arguments
   */
  function getCoordinatesFromArgs(args) {
    const element = args[0];
    const options = args[1] || {};

    if (element && element.getBoundingClientRect) {
      const rect = element.getBoundingClientRect();
      const x = rect.left + (options.x || rect.width / 2);
      const y = rect.top + (options.y || rect.height / 2);
      return { x, y };
    }

    // Fallback to options coordinates or last position
    return {
      x: options.x || options.clientX || lastPosition.x,
      y: options.y || options.clientY || lastPosition.y
    };
  }

  /**
   * Add hover effect to cursor
   */
  function addHoverEffect() {
    if (cursorElement) {
      cursorElement.classList.add('hover');
    }
  }

  /**
   * Remove hover effect from cursor
   */
  function removeHoverEffect() {
    if (cursorElement) {
      cursorElement.classList.remove('hover');
    }
  }

  /**
   * Initialize the cursor overlay system
   */
  function initialize() {
    if (isInitialized) return;

    try {
      initializeStyles();
      createCursor();
      createTrail();

      // Initialize cursor position to center of viewport
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      moveCursor(centerX, centerY, true);

      isInitialized = true;
    } catch (error) {
      console.warn('Cypress Cursor AI: Failed to initialize:', error);
    }
  }

  /**
   * Clean up cursor overlay elements
   */
  function cleanup() {
    // Cancel any pending animations
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    // Remove cursor element
    if (cursorElement && cursorElement.parentNode) {
      cursorElement.parentNode.removeChild(cursorElement);
      cursorElement = null;
    }

    // Remove trail elements
    trailElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    trailElements = [];

    // Remove active labels
    activeLabels.forEach(label => {
      if (label.parentNode) {
        label.parentNode.removeChild(label);
      }
    });
    activeLabels = [];

    // Remove styles
    const styleElement = document.getElementById('cypress-cursor-ai-styles');
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }

    isInitialized = false;
  }

  /**
   * Handle Cypress command events
   */
  function handleCommand(command) {
    if (!isInitialized) {
      initialize();
    }

    const { name, args } = command;

    try {
      switch (name) {
        case 'click':
          const clickCoords = getCoordinatesFromArgs(args);
          moveCursor(clickCoords.x, clickCoords.y);
          createRipple(clickCoords.x, clickCoords.y, 'click');
          createActionLabel(clickCoords.x, clickCoords.y, 'Clicked', 'click');
          removeHoverEffect();
          break;

        case 'dblclick':
          const dblClickCoords = getCoordinatesFromArgs(args);
          moveCursor(dblClickCoords.x, dblClickCoords.y);
          createRipple(dblClickCoords.x, dblClickCoords.y, 'dblclick');
          createActionLabel(dblClickCoords.x, dblClickCoords.y, 'Double Clicked', 'dblclick');
          removeHoverEffect();
          break;

        case 'rightclick':
          const rightClickCoords = getCoordinatesFromArgs(args);
          moveCursor(rightClickCoords.x, rightClickCoords.y);
          createRipple(rightClickCoords.x, rightClickCoords.y, 'click');
          createActionLabel(rightClickCoords.x, rightClickCoords.y, 'Right Clicked', 'rightclick');
          removeHoverEffect();
          break;

        case 'hover':
          const hoverCoords = getCoordinatesFromArgs(args);
          moveCursor(hoverCoords.x, hoverCoords.y);
          addHoverEffect();
          createActionLabel(hoverCoords.x, hoverCoords.y, 'Hovered', 'hover');
          break;

        case 'trigger':
          if (args[1] === 'mousemove' || args[1] === 'mouseenter' || args[1] === 'mouseover') {
            const triggerCoords = getCoordinatesFromArgs(args);
            moveCursor(triggerCoords.x, triggerCoords.y);
            
            if (args[1] === 'mouseenter' || args[1] === 'mouseover') {
              addHoverEffect();
              createActionLabel(triggerCoords.x, triggerCoords.y, 'Mouse Enter', 'hover');
            }
          } else if (args[1] === 'mouseleave' || args[1] === 'mouseout') {
            removeHoverEffect();
            const leaveCoords = getCoordinatesFromArgs(args);
            createActionLabel(leaveCoords.x, leaveCoords.y, 'Mouse Leave', 'hover');
          }
          break;

        case 'type':
          const typeCoords = getCoordinatesFromArgs(args);
          moveCursor(typeCoords.x, typeCoords.y);
          createActionLabel(typeCoords.x, typeCoords.y, `Typing: ${args[1] || ''}`, 'type');
          break;

        case 'clear':
          const clearCoords = getCoordinatesFromArgs(args);
          moveCursor(clearCoords.x, clearCoords.y);
          createActionLabel(clearCoords.x, clearCoords.y, 'Cleared', 'type');
          break;

        case 'check':
        case 'uncheck':
          const checkCoords = getCoordinatesFromArgs(args);
          moveCursor(checkCoords.x, checkCoords.y);
          createRipple(checkCoords.x, checkCoords.y, 'click');
          createActionLabel(checkCoords.x, checkCoords.y, name === 'check' ? 'Checked' : 'Unchecked', 'click');
          break;

        case 'select':
          const selectCoords = getCoordinatesFromArgs(args);
          moveCursor(selectCoords.x, selectCoords.y);
          createActionLabel(selectCoords.x, selectCoords.y, `Selected: ${args[1] || ''}`, 'click');
          break;

        case 'focus':
          const focusCoords = getCoordinatesFromArgs(args);
          moveCursor(focusCoords.x, focusCoords.y);
          addHoverEffect();
          createActionLabel(focusCoords.x, focusCoords.y, 'Focused', 'hover');
          break;

        case 'blur':
          removeHoverEffect();
          const blurCoords = getCoordinatesFromArgs(args);
          createActionLabel(blurCoords.x, blurCoords.y, 'Blurred', 'hover');
          break;

        default:
          // Handle other mouse-related commands
          if (name.includes('mouse') || name.includes('drag') || name.includes('drop')) {
            const genericCoords = getCoordinatesFromArgs(args);
            moveCursor(genericCoords.x, genericCoords.y);
            createActionLabel(genericCoords.x, genericCoords.y, name.charAt(0).toUpperCase() + name.slice(1), 'default');
          }
          break;
      }
    } catch (error) {
      console.warn(`Cypress Cursor AI: Error handling command '${name}':`, error);
    }
  }

  // Event listeners
  Cypress.on('command:start', handleCommand);

  // Handle page navigation and reloading
  Cypress.on('window:before:load', (win) => {
    // Reinitialize on new page load
    setTimeout(() => {
      if (Cypress.env('cursorAI')) {
        initialize();
      }
    }, 100);
  });

  // Cleanup on test completion
  Cypress.on('test:after:run', () => {
    cleanup();
  });

  // Handle viewport changes
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      if (isInitialized) {
        // Recreate trail elements with new viewport dimensions
        createTrail();
      }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      // DOM is already ready
      setTimeout(initialize, 0);
    }
  }

  // Export for testing purposes (if needed)
  if (typeof window !== 'undefined') {
    window.CypressCursorAI = {
      initialize,
      cleanup,
      moveCursor,
      createRipple,
      createActionLabel,
      config
    };
  }

})();

// Type definitions for TypeScript compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}

/**
 * TypeScript Interface Definitions
 * 
 * interface CypressCursorAIConfig {
 *   showTrail: boolean;
 *   showLabels: boolean;
 *   cursorSize: number;
 *   trailLength: number;
 *   animationDuration: number;
 *   rippleDuration: number;
 *   labelDuration: number;
 * }
 * 
 * interface CypressCursorAI {
 *   initialize(): void;
 *   cleanup(): void;
 *   moveCursor(x: number, y: number, immediate?: boolean): void;
 *   createRipple(x: number, y: number, type?: string): void;
 *   createActionLabel(x: number, y: number, text: string, type?: string): void;
 *   config: CypressCursorAIConfig;
 * }
 * 
 * declare global {
 *   interface Window {
 *     CypressCursorAI: CypressCursorAI;
 *   }
 * }
 */