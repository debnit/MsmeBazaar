import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializePreloading } from "./utils/preload";
import { initializeOptimizations } from "./utils/optimize";

// Initialize performance optimizations
initializePreloading();
initializeOptimizations();

// Register service worker for caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed'));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
