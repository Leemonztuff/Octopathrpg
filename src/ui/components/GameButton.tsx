import React from 'react';

interface GameButtonProps {
  id?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'metal' | 'tab';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  active?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const GameButton: React.FC<GameButtonProps> = ({
  id,
  variant = 'primary',
  size = 'md',
  disabled = false,
  active = false,
  onClick,
  children,
  className = '',
  title,
}) => {
  const baseStyles = 'font-pixel select-none inline-flex items-center justify-center border-2 text-center transition-all cursor-pointer shadow-md relative overflow-hidden';

  const sizeStyles = {
    xs: 'text-[7px] px-1.5 py-0.5 rounded-sm border',
    sm: 'text-[8px] sm:text-[9px] px-2.5 py-1 rounded border-2',
    md: 'text-[10px] sm:text-[11px] px-4 py-1.5 rounded-md border-2',
    lg: 'text-[12px] sm:text-[13px] px-6 py-2 rounded-lg border-2',
  }[size];

  const variantStyles = {
    primary: 'border-[#f0b541]/70 bg-[#251f12] text-[#f0b541] hover:bg-[#382f1b] hover:border-[#f0b541] shadow-[0_1px_4px_rgba(240,181,65,0.15)] active:scale-95',
    secondary: 'border-[#38bdf8]/60 bg-[#101c2b] text-[#38bdf8] hover:bg-[#1a2e45] hover:border-[#38bdf8] shadow-[0_1px_4px_rgba(56,189,248,0.15)] active:scale-95',
    danger: 'border-[#ef4444]/60 bg-[#261217] text-[#fca5a5] hover:bg-[#3b1b23] hover:border-[#ef4444] shadow-[0_1px_4px_rgba(239,68,68,0.15)] active:scale-95',
    success: 'border-[#10b981]/60 bg-[#0c2018] text-[#a7f3d0] hover:bg-[#153326] hover:border-[#10b981] shadow-[0_1px_4px_rgba(16,185,129,0.15)] active:scale-95',
    metal: 'border-[#55527a]/60 bg-[#13121f] text-slate-300 hover:bg-[#1d1b30] hover:border-[#7e79b8] active:scale-95',
    tab: active
      ? 'border-[#f0b541] bg-[#1e1a2f] text-[#f0b541] font-bold shadow-[inset_0_-2px_0_#f0b541]'
      : 'border-transparent bg-[#110f1b]/80 text-slate-400 hover:text-slate-200 hover:bg-[#171426]',
  }[variant];

  const disabledStyles = 'opacity-40 cursor-not-allowed pointer-events-none transform-none active:scale-100';

  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${disabled ? disabledStyles : ''} ${className}`}
      title={title}
    >
      {/* Dynamic tactile light sheen effect inside premium button types */}
      {!disabled && variant !== 'tab' && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
      )}
      <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">{children}</span>
    </button>
  );
};
