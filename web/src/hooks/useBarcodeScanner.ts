import { useEffect, useRef, useCallback, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseBarcodeScanner {
  isScanning: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  error: string | null;
}

export function useBarcodeScanner(
  containerId: string,
  onScan: (barcode: string) => void,
): UseBarcodeScanner {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const mountedRef = useRef(true);

  // Debounce: ignore same barcode within 2s
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore — may not be running
      }
      try {
        scannerRef.current.clear();
      } catch {
        // ignore — DOM element may be gone
      }
      scannerRef.current = null;
    }
    if (mountedRef.current) setIsScanning(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      await stop();

      // Verify the container element exists in the DOM
      const container = document.getElementById(containerId);
      if (!container) {
        setError('Contenedor de cámara no encontrado. Intenta de nuevo.');
        return;
      }

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 120 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          const now = Date.now();
          if (
            decodedText === lastScanRef.current.code &&
            now - lastScanRef.current.time < 2000
          ) {
            return;
          }
          lastScanRef.current = { code: decodedText, time: now };

          // Stop scanner BEFORE calling callback to prevent DOM crash
          // when callback unmounts this component
          if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {});
            try { scannerRef.current.clear(); } catch { /* ignore */ }
            scannerRef.current = null;
          }
          if (mountedRef.current) setIsScanning(false);

          // Now safe to call — scanner is stopped, won't access removed DOM
          onScanRef.current(decodedText);
        },
        () => {
          // scan error (no code found) — ignore
        },
      );
      setIsScanning(true);
    } catch (err) {
      let msg = 'No se pudo acceder a la cámara';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
          msg = 'Permiso de cámara denegado. Actívalo en la configuración de tu navegador.';
        } else if (err.name === 'NotFoundError' || err.message.includes('Requested device not found')) {
          msg = 'No se encontró una cámara en este dispositivo.';
        } else if (err.name === 'NotReadableError') {
          msg = 'La cámara está en uso por otra aplicación.';
        } else if (err.name === 'OverconstrainedError') {
          msg = 'La cámara no soporta la configuración requerida.';
        } else if (err.name === 'SecurityError' || err.message.includes('secure context')) {
          msg = 'Se requiere HTTPS para acceder a la cámara.';
        } else {
          msg = err.message;
        }
      }
      setError(msg);
      setIsScanning(false);
    }
  }, [containerId, stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        try { scannerRef.current.clear(); } catch { /* ignore */ }
        scannerRef.current = null;
      }
    };
  }, []);

  return { isScanning, start, stop, error };
}
