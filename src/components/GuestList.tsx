import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Guest } from '@/types';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface GuestListProps {
  guests: Guest[];
  isOpen: boolean;
  onClose: () => void;
  currentDay: number;
}

interface GuestListSVGProps {
    guests: Guest[];
    onClose?: () => void;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    viewBoxHeight?: number;
}

export function GuestListSVG({ guests, onClose, className, onClick }: GuestListSVGProps) {
    const [checkedGuests, setCheckedGuests] = useState<Set<number>>(new Set());
    
    useEffect(() => {
        setCheckedGuests(new Set());
    }, [guests]);

    const toggleGuest = (index: number) => {
        const newChecked = new Set(checkedGuests);
        if (newChecked.has(index)) {
            newChecked.delete(index);
        } else {
            newChecked.add(index);
        }
        setCheckedGuests(newChecked);
    };

    // Dynamic height calculation
    const headerHeight = 150;
    const rowHeight = 60;
    const paddingBottom = 50;
    const contentHeight = Math.max(600, headerHeight + (guests.length * rowHeight) + paddingBottom);
    const viewBoxHeight = contentHeight;

    return (
        <svg 
            viewBox={`0 0 500 ${viewBoxHeight}`} 
            className={cn("w-full h-auto drop-shadow-2xl", className)}
            onClick={onClick}
        >
              <defs>
                <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill="#d0d0d0"/>
                </pattern>
                <g id="person-icon">
                  <circle cx="0" cy="-6" r="6" fill="#f0a500" stroke="#000" strokeWidth="3" />
                  <path d="M -10 8 C -10 0, -5 -3, 0 -3 C 5 -3, 10 0, 10 8" fill="#f0a500" stroke="#000" strokeWidth="3" strokeLinecap="round" />
                </g>
              </defs>

              <style>{`
                .comic-text { font-family: 'Impact', 'Arial Black', sans-serif; font-weight: bold; }
                .hand-text { font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif; font-weight: bold; }
                .checkbox { cursor: pointer; }
                .checkbox rect { transition: fill 0.2s; }
                .checkbox:hover rect { fill: #e8e8e8; }
                .mark { opacity: 0; transition: opacity 0.1s; pointer-events: none; }
                .checkbox.checked .mark { opacity: 1; }
              `}</style>

              {/* Clipboard Body */}
              <rect x="15" y="15" width="470" height={viewBoxHeight - 30} rx="10" fill="#000" />
              <rect x="0" y="0" width="470" height={viewBoxHeight - 30} rx="10" fill="#f0a500" stroke="#000" strokeWidth="6" />
              
              {/* Paper */}
              <rect x="25" y="35" width="420" height={viewBoxHeight - 80} fill="#000" />
              <rect x="15" y="25" width="420" height={viewBoxHeight - 80} fill="#fff" stroke="#000" strokeWidth="5" />
              
              {/* Header Clip */}
              <rect x="135" y="-15" width="200" height="50" fill="#000" />
              <rect x="130" y="-20" width="200" height="50" fill="#silver" stroke="#000" strokeWidth="4" />
              <circle cx="230" cy="5" r="8" fill="#333" />

              {/* Title Sticker */}
              <g transform="translate(250, 60) rotate(-2)">
                <rect x="-120" y="-30" width="240" height="60" fill="#000" />
                <rect x="-125" y="-35" width="240" height="60" fill="#ff5500" stroke="#000" strokeWidth="5" />
                <text x="0" y="5" className="comic-text" fontSize="36" fill="#fff" textAnchor="middle" dominantBaseline="middle">GUEST LIST</text>
              </g>

              {/* Guest Entries */}
              <g transform={`translate(0, ${headerHeight})`}>
                {guests.map((guest, index) => {
                    const yPos = index * rowHeight;
                    const isChecked = checkedGuests.has(index);
                    
                    return (
                        <g key={index} className="guest-row">
                            {/* Line */}
                             <line 
                                x1="30" 
                                y1={yPos + 40} 
                                x2="420" 
                                y2={yPos + 40} 
                                stroke="#000" 
                                strokeWidth="2" 
                                strokeOpacity="0.1"
                            />

                            {/* Checkbox */}
                            <g 
                                className={`checkbox ${isChecked ? 'checked' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGuest(index);
                                }}
                            >
                                <rect x="35" y={yPos} width="30" height="30" fill="#fff" stroke="#000" strokeWidth="4" />
                                <path className="mark" d={`M 40 ${yPos + 15} L 50 ${yPos + 25} L 70 ${yPos - 10}`} stroke="#000" strokeWidth="5" fill="none" strokeLinecap="round" />
                            </g>
                            
                            {/* Name */}
                            <text x="80" y={yPos + 25} className="hand-text" fontSize="24" fill="#000" style={{ textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.5 : 1 }}>
                                {guest.name}
                            </text>
                            
                            {/* Icon & Count */}
                            <g transform={`translate(350, ${yPos + 15})`}>
                                <use href="#person-icon" x="0" y="0" />
                                <text x="25" y="10" className="comic-text" fontSize="24" fill="#000">x {guest.groupSize}</text>
                            </g>
                        </g>
                    );
                })}
              </g>
              
              {/* Close Button (X) - Only show if onClose is provided */}
              {onClose && (
                  <g 
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }} 
                    style={{ cursor: 'pointer' }}
                    transform="translate(440, 25)"
                  >
                      <circle cx="0" cy="0" r="20" fill="#f00" stroke="#000" strokeWidth="3" />
                      <path d="M -10 -10 L 10 10 M 10 -10 L -10 10" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
                  </g>
              )}

            </svg>
    );
}

export function GuestList({ guests, isOpen, onClose, currentDay }: GuestListProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ y: 500, rotate: -15, scale: 0.5, opacity: 0 }}
            animate={{ y: 0, rotate: 0, scale: 1, opacity: 1 }}
            exit={{ y: 500, rotate: -15, scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="w-full max-w-lg cursor-pointer max-h-[90vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <GuestListSVG guests={guests} onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
