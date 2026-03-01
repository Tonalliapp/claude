import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (e) {
  console.error('[Tonalli Menu] Fatal:', e);
  document.getElementById('root')!.innerHTML = `
    <div style="min-height:100vh;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif">
      <div style="text-align:center">
        <p style="font-size:18px;margin-bottom:8px">Error al cargar el menú</p>
        <p style="color:#8A8A8A;font-size:14px">${e instanceof Error ? e.message : 'Error desconocido'}</p>
      </div>
    </div>`;
}
