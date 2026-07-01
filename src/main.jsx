import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/tokens.css';

// Remove the static boot splash (defined inline in index.html) once React
// has mounted and painted — this is what makes the very first screen feel
// instant even before any JS bundle has executed.
function removeBootSplash() {
  const el = document.getElementById('app-boot-splash');
  if (el) {
    el.style.transition = 'opacity 0.25s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 260);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

requestAnimationFrame(() => requestAnimationFrame(removeBootSplash));
