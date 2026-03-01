import { useState, useEffect } from 'react';
import { Loader2, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlob } from '@/config/api';
import type { Restaurant, QRData } from '@/types';
import Modal from '@/components/ui/Modal';

type BrandedLayout = 'logo-left' | 'logo-right';

interface QRDesignerProps {
  tableId: string;
  tableNumber: number;
  menuUrl: string;
  onClose: () => void;
}

export default function QRDesigner({ tableId, tableNumber, menuUrl, onClose }: QRDesignerProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [layout, setLayout] = useState<BrandedLayout>('logo-left');
  const [showTableNum, setShowTableNum] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tenant, qrData] = await Promise.all([
          apiFetch<Restaurant>('/tenants/me', { auth: true }),
          apiFetch<QRData>(`/tables/${tableId}/qr`, { auth: true }),
        ]);
        if (cancelled) return;
        setLogoUrl(tenant.logoUrl);
        setQrPreview(qrData.qrCode);
      } catch {
        toast.error('Error cargando datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tableId]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await apiFetchBlob(`/tables/${tableId}/qr-branded`, {
        method: 'POST',
        body: { layout, showTableNumber: showTableNum },
        auth: true,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tarjeta-mesa-${tableNumber}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Tarjeta descargada');
    } catch {
      toast.error('Error al generar tarjeta');
    } finally {
      setDownloading(false);
    }
  };

  // No logo → simple QR fallback
  if (!loading && !logoUrl) {
    return (
      <Modal title={`QR Mesa ${tableNumber}`} onClose={onClose}>
        <div className="flex flex-col items-center">
          {qrPreview ? (
            <>
              <div className="w-52 h-52 bg-white rounded-2xl p-4 mb-4">
                <img src={qrPreview} alt="QR" className="w-full h-full object-contain" />
              </div>
              <p className="text-gold text-xl font-semibold mb-1">Mesa {tableNumber}</p>
              <p className="text-silver-dark text-xs mb-2">{menuUrl}</p>
              <p className="text-silver-muted text-[11px] mb-4">Sube un logo en Configuración para generar tarjetas de impresión</p>
              <div className="flex gap-2.5">
                <a
                  href={menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-5 py-3 rounded-lg border border-gold text-gold text-[13px] font-medium hover:bg-gold/10 transition-colors"
                >
                  <ExternalLink size={14} />
                  Abrir menú
                </a>
                <a
                  href={qrPreview}
                  download={`mesa-${tableNumber}-qr.png`}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-lg border border-gold text-gold text-[13px] font-medium hover:bg-gold/10 transition-colors"
                >
                  <Download size={14} />
                  Descargar
                </a>
              </div>
            </>
          ) : (
            <p className="text-silver-muted text-sm py-10">No se pudo generar el QR</p>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Tarjeta Mesa ${tableNumber}`} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col items-center">
        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="h-8 w-8 text-gold animate-spin mx-auto mb-3" />
            <p className="text-silver-muted text-sm">Cargando...</p>
          </div>
        ) : (
          <>
            {/* Branded card preview — landscape */}
            <div
              className="relative w-full bg-[#0A0A0A] border border-light-border rounded-xl overflow-hidden select-none"
              style={{ aspectRatio: '2048 / 1400' }}
            >
              {/* Gold border */}
              <div className="absolute inset-[2.5%] rounded-2xl border border-[#C9A84C]/35 pointer-events-none" />

              {/* Content area (above branding strip) */}
              <div className="absolute inset-[3%] bottom-[12%] flex">
                {/* Left panel */}
                <div className="flex-1 flex items-center justify-center">
                  {layout === 'logo-left' ? (
                    <img src={logoUrl!} alt="Logo" className="max-w-[72%] max-h-[70%] object-contain" draggable={false} />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-white rounded-lg p-[6%] w-[58%] aspect-square shadow-lg shadow-black/30">
                        {qrPreview && <img src={qrPreview} alt="QR" className="w-full h-full object-contain" draggable={false} />}
                      </div>
                      {showTableNum && (
                        <span className="text-[#C9A84C] text-[9px] sm:text-xs font-normal tracking-[0.2em] border border-[#C9A84C]/25 bg-[#111] rounded-full px-3 py-1" style={{ fontFamily: 'Georgia, serif' }}>
                          Mesa {tableNumber}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Center divider */}
                <div className="w-px my-[5%]" style={{ background: 'linear-gradient(to bottom, transparent, #C9A84C33, #4A8C6F22, #C9A84C33, transparent)' }} />

                {/* Right panel */}
                <div className="flex-1 flex items-center justify-center">
                  {layout === 'logo-right' ? (
                    <img src={logoUrl!} alt="Logo" className="max-w-[72%] max-h-[70%] object-contain" draggable={false} />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-white rounded-lg p-[6%] w-[58%] aspect-square shadow-lg shadow-black/30">
                        {qrPreview && <img src={qrPreview} alt="QR" className="w-full h-full object-contain" draggable={false} />}
                      </div>
                      {showTableNum && (
                        <span className="text-[#C9A84C] text-[9px] sm:text-xs font-normal tracking-[0.2em] border border-[#C9A84C]/25 bg-[#111] rounded-full px-3 py-1" style={{ fontFamily: 'Georgia, serif' }}>
                          Mesa {tableNumber}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Horizontal separator */}
              <div className="absolute left-[6%] right-[6%] bottom-[12%] h-px bg-[#C9A84C]/10" />

              {/* Bottom branding strip */}
              <div className="absolute bottom-[3%] left-0 right-0 flex items-center justify-center gap-3">
                <img src="/tonalli-logo.svg" alt="" className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
                <div className="text-center">
                  <p className="text-[#C9A84C] text-[10px] sm:text-sm font-normal tracking-[0.35em] opacity-80" style={{ fontFamily: 'Georgia, serif' }}>TONALLI</p>
                  <p className="text-[#6A6A6A] text-[7px] sm:text-[10px] tracking-[0.25em]">tonalli.app</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="w-full mt-4 space-y-3">
              {/* Layout selector */}
              <div>
                <span className="text-silver-muted text-[11px] font-medium tracking-wide uppercase block mb-2">Disposición</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLayout('logo-left')}
                    className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-colors ${
                      layout === 'logo-left'
                        ? 'border-gold text-gold bg-gold/10'
                        : 'border-light-border text-silver-muted hover:text-silver'
                    }`}
                  >
                    Logo Izquierda
                  </button>
                  <button
                    onClick={() => setLayout('logo-right')}
                    className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-colors ${
                      layout === 'logo-right'
                        ? 'border-gold text-gold bg-gold/10'
                        : 'border-light-border text-silver-muted hover:text-silver'
                    }`}
                  >
                    Logo Derecha
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTableNum}
                  onChange={e => setShowTableNum(e.target.checked)}
                  className="w-4 h-4 rounded border-light-border bg-tonalli-black-card text-gold accent-gold"
                />
                <span className="text-silver text-[13px]">Mostrar número de mesa</span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5 mt-4 w-full">
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-gold text-gold text-[13px] font-medium hover:bg-gold/10 transition-colors"
              >
                <ExternalLink size={14} />
                Abrir menú
              </a>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gold text-gold text-[13px] font-semibold hover:bg-gold/10 transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {downloading ? 'Generando...' : 'Descargar tarjeta'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
