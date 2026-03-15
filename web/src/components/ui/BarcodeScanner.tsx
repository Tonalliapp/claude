import { useState, useId } from 'react';
import { Camera, CameraOff, X, Keyboard } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface Props {
  onScan: (barcode: string) => void;
  onClose: () => void;
  label?: string;
}

export default function BarcodeScanner({ onScan, onClose, label = 'Escanear código de barras' }: Props) {
  const id = useId().replace(/:/g, '');
  const containerId = `scanner-${id}`;
  const { isScanning, start, stop, error } = useBarcodeScanner(containerId, onScan);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code) {
      onScan(code);
      setManualCode('');
    }
  };

  return (
    <div className="bg-tonalli-black-card border border-gold-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-light-border">
        <p className="text-white text-sm font-medium">{label}</p>
        <div className="flex items-center gap-2">
          {!manualMode && (
            isScanning ? (
              <button
                onClick={stop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
              >
                <CameraOff size={14} />
                Detener
              </button>
            ) : (
              <button
                onClick={start}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-medium hover:bg-gold/20 transition-colors"
              >
                <Camera size={14} />
                Cámara
              </button>
            )
          )}
          <button
            onClick={() => { setManualMode(!manualMode); if (isScanning) stop(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              manualMode
                ? 'bg-gold/10 border border-gold/30 text-gold'
                : 'text-silver-dark hover:text-silver'
            }`}
          >
            <Keyboard size={14} />
            Manual
          </button>
          <button onClick={onClose} className="text-silver-dark hover:text-silver p-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {manualMode ? (
        <div className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
              placeholder="Ingresa el código de barras"
              autoFocus
              className="flex-1 bg-tonalli-black border border-light-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold/30"
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
              className="px-4 py-3 rounded-xl bg-gold text-tonalli-black text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              Buscar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            id={containerId}
            className="w-full bg-black"
            style={{ minHeight: isScanning ? 240 : 0 }}
          />

          {!isScanning && !error && (
            <div className="flex items-center justify-center py-8">
              <button
                onClick={start}
                className="flex flex-col items-center gap-2 text-silver-dark hover:text-gold transition-colors"
              >
                <Camera size={32} />
                <span className="text-xs">Toca para abrir la cámara</span>
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-500/10">
          <p className="text-red-400 text-xs mb-2">{error}</p>
          {!manualMode && (
            <button
              onClick={() => setManualMode(true)}
              className="text-gold text-xs font-medium hover:underline"
            >
              Ingresar código manualmente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
