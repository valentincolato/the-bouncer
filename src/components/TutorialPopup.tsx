import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialPopupProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  customClasses?: string;
  autoCloseDelay?: number;
}

export function TutorialPopup({ isOpen, onClose, text, position, customClasses, autoCloseDelay }: TutorialPopupProps) {
  useEffect(() => {
    if (isOpen && autoCloseDelay) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  const positionClasses = {
    'top-left': 'fixed top-4 left-4',
    'top-right': 'fixed top-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'center': 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'custom': 'absolute'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          className={cn(
            "z-[9999] bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xs",
            positionClasses[position],
            customClasses
          )}
        >
          {/* Comic speech bubble tail (optional, can be styled via customClasses if needed) */}
          
          <button 
            onClick={onClose}
            className="absolute -top-3 -right-3 bg-red-500 border-2 border-black rounded-full p-1 hover:bg-red-600 hover:scale-110 transition-transform"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <p className="font-display font-bold text-lg leading-tight text-black">
            {text}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
