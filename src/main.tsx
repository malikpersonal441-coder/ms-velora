import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The opening loader (1% → 100% with the intro sound) runs from an inline script in
// index.html so it starts instantly, before this bundle has loaded.

// Installable app + push notifications
import { registerServiceWorker } from './lib/pwa';
registerServiceWorker();
