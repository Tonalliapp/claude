interface InputFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function InputField({
  label, placeholder, value, onChange, type, textarea, error, required, disabled,
}: InputFieldProps) {
  const cls = `w-full bg-tonalli-black-card border rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors disabled:opacity-40 ${
    error ? 'border-red-500/50' : 'border-light-border'
  }`;

  return (
    <div className="space-y-1.5">
      <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {textarea ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`${cls} min-h-[72px] resize-none`}
        />
      ) : (
        <input
          type={type || 'text'}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={cls}
        />
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
