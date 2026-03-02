import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Buscar...' }: SearchInputProps) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-dark" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-tonalli-black-card border border-light-border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors"
      />
    </div>
  );
}
