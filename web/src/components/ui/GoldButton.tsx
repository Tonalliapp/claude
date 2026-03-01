import type { ReactNode } from 'react';

interface GoldButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  className?: string;
}

const styles = {
  primary: 'bg-gold hover:bg-gold-light text-tonalli-black',
  outline: 'border border-gold text-gold hover:bg-gold/10',
  danger: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
};

export default function GoldButton({
  children, onClick, type = 'button', loading, disabled, variant = 'primary', className = '',
}: GoldButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading ? (
        <div className="h-5 w-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : children}
    </button>
  );
}
