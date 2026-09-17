import React, { useState } from 'react';

interface DialogueBoxProps {
  npcName: string;
  lines: string[];
  questId?: string;
  onAcceptQuest?: (questId: string) => void;
  onClose: () => void;
}

export const DialogueBoxUI: React.FC<DialogueBoxProps> = ({
  npcName,
  lines,
  questId,
  onAcceptQuest,
  onClose,
}) => {
  const [currentLineIdx, setCurrentLineIdx] = useState<number>(0);
  const [questAccepted, setQuestAccepted] = useState<boolean>(false);

  const handleNext = () => {
    if (currentLineIdx < lines.length - 1) {
      setCurrentLineIdx(currentLineIdx + 1);
    } else {
      onClose();
    }
  };

  const handleAccept = () => {
    if (questId && onAcceptQuest) {
      onAcceptQuest(questId);
      setQuestAccepted(true);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-end justify-center pb-32 sm:pb-36 px-4">
      {/* 9-Slice TalkBox Container from Tiny GUI Pack */}
      <div className="tg-box relative p-4 flex flex-col justify-between w-full max-w-[440px] min-h-[135px] text-[#f4f4f8] pointer-events-auto animate-in zoom-in-95 fade-in duration-150 shadow-2xl">
        {/* Speaker Name Tag Banner */}
        <div className="absolute -top-3 left-4 flex items-center gap-1.5 bg-[#26243a] border-2 border-[#5a577d] px-2.5 py-0.5 rounded shadow image-pixelated">
          <img
            src="/tiny_gui/extracted/icon_chat.png"
            alt="Chat"
            className="w-3.5 h-3.5 image-pixelated"
          />
          <span className="font-pixel text-[9px] text-[#f0b541] tracking-wide uppercase">
            {npcName}
          </span>
          <span className="font-silkscreen text-[8px] text-slate-400 ml-1">
            [{currentLineIdx + 1}/{lines.length}]
          </span>
        </div>

        {/* Dialogue Text Content */}
        <div className="pt-2 pb-3 px-1">
          <p className="font-silkscreen text-xs sm:text-sm text-[#e2e2ec] leading-relaxed select-none">
            "{lines[currentLineIdx]}"
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-[#3c3a54]/50">
          {questId && currentLineIdx === lines.length - 1 && !questAccepted ? (
            <div className="flex items-center justify-between w-full gap-2">
              <button
                onClick={onClose}
                className="tg-btn-rect-slate text-[#dfdfe8] hover:brightness-110 active:brightness-90 font-pixel text-[8px] h-7 px-3 flex items-center justify-center cursor-pointer border-none outline-none"
              >
                Rechazar
              </button>
              <button
                onClick={handleAccept}
                className="tg-btn-rect-green text-white hover:brightness-110 active:brightness-90 font-pixel text-[8px] h-7 px-3 flex items-center gap-1.5 justify-center cursor-pointer border-none outline-none shadow-md"
              >
                <img src="/tiny_gui/extracted/btn_check_green.png" alt="Check" className="w-3.5 h-3.5 image-pixelated" />
                <span>Aceptar Misión</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end w-full">
              <button
                onClick={handleNext}
                className="tg-btn-rect-gold text-[#222] font-pixel text-[8px] font-bold h-7 px-4 flex items-center gap-1.5 justify-center cursor-pointer border-none outline-none hover:brightness-110 active:brightness-90"
              >
                <span>{currentLineIdx < lines.length - 1 ? 'Siguiente' : 'Cerrar'}</span>
                <span className="text-[10px]">▶</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
