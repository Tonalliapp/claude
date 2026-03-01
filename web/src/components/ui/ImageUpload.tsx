import { useState, useRef } from 'react';
import { Upload, X, Image } from 'lucide-react';

interface ImageUploadProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => void;
  label?: string;
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export default function ImageUpload({
  currentUrl, onUpload, onRemove, label = 'Subir imagen', shape = 'square', size = 'md',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setUploading(true);
    try {
      await onUpload(file);
    } catch {
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const imgSrc = preview || currentUrl;
  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${sizes[size]} ${rounded} border-2 border-dashed border-gold-border bg-tonalli-black-card flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-gold/30 transition-colors group`}
        onClick={() => inputRef.current?.click()}
      >
        {imgSrc ? (
          <>
            <img src={imgSrc} alt="" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            )}
            {onRemove && !uploading && (
              <button
                onClick={e => { e.stopPropagation(); onRemove(); setPreview(null); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} className="text-white" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            {uploading ? (
              <div className="h-6 w-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            ) : (
              <>
                <Image size={20} className="text-silver-dark" />
                <Upload size={12} className="text-silver-dark" />
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-silver-dark text-xs">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
