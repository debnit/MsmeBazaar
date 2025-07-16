// Performance optimization utilities
export const optimizeImages = () => {
  // Lazy load images
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src!;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
};

// Optimize font loading
export const optimizeFonts = () => {
  // Preload critical fonts
  const fontUrl = '/fonts/inter-var.woff2';
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = fontUrl;
  fontLink.as = 'font';
  fontLink.type = 'font/woff2';
  fontLink.crossOrigin = '';
  document.head.appendChild(fontLink);
};

// Optimize CSS loading
export const optimizeCSS = () => {
  // Inline critical CSS
  const criticalCSS = `
    .loading-spinner {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = criticalCSS;
  document.head.appendChild(style);
};

// Bundle size optimization
export const optimizeBundles = () => {
  // Dynamic imports for heavy libraries
  const heavyLibraries = [
    'recharts',
    'framer-motion',
    'react-hook-form'
  ];
  
  // Preload only when needed
  heavyLibraries.forEach(lib => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = `/node_modules/${lib}/dist/index.js`;
    document.head.appendChild(link);
  });
};

// Initialize all optimizations
export const initializeOptimizations = () => {
  if (typeof window !== 'undefined') {
    optimizeImages();
    optimizeFonts();
    optimizeCSS();
    optimizeBundles();
  }
};