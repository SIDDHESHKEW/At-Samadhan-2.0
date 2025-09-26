// Mock Vite client for development
console.log('Mock Vite client loaded');

// This is a minimal mock implementation to prevent 404 errors
// It doesn't actually provide Vite functionality

// Mock the HMR API
window.__vite_hmr = {
  on: () => {},
  off: () => {},
  send: () => {}
};

// Prevent console errors
window.__vite_plugin_react_preamble_installed__ = true;