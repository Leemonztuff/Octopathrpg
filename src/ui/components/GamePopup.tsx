import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface GamePopupProps {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string; // e.g. "max-w-[425px]"
  maxHeight?: string; // e.g. "max-h-[700px]"
}

export const GamePopup: React.FC<GamePopupProps> = ({
  id,
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className = '',
  maxWidth = 'max-w-[425px]',
  maxHeight = 'max-h-[700px]',
}) => {
  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id={id}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none overflow-y-auto"
        >
          {/* Backdrop click to close */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`w-full ${maxWidth} h-[92vh] ${maxHeight} tg-box-popup flex flex-col relative overflow-hidden text-slate-100 bg-[#0e0d18] z-10 ${className}`}
          >
            {/* Header section with closing button if title exists */}
            {title && (
              <div className="bg-[#181628] border-b-2 border-[#3d3a5a] px-3.5 py-2.5 shrink-0 flex items-center justify-between shadow-md">
                <div className="flex flex-col">
                  <span className="font-pixel text-[10px] text-[#f0b541] font-bold tracking-wider">
                    {title}
                  </span>
                  {subtitle && (
                    <span className="font-silkscreen text-[6px] text-slate-400 mt-0.5">
                      {subtitle}
                    </span>
                  )}
                </div>

                {/* Close Button with premium feedback */}
                <button
                  onClick={onClose}
                  className="w-5 h-5 bg-[#12111f] hover:bg-[#1a192c] border border-[#3d3a5a] hover:border-[#f0b541]/50 text-slate-400 hover:text-slate-100 rounded flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title="Cerrar ventana"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Main content body inside popup */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
