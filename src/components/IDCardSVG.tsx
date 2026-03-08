import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface IDCardProps {
  name: string;
  idNumber: string;
  expirationDate: string;
  photoUrl?: string; // Optional, if we have a real photo
  className?: string;
  onClose?: () => void;
}

export const IDCardSVG: React.FC<IDCardProps> = ({ 
  name, 
  idNumber, 
  expirationDate, 
  photoUrl,
  className,
  onClose
}) => {
  return (
    <div className={cn("relative select-none", className)} onClick={onClose}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" className="w-full h-full drop-shadow-2xl">
        <defs>
          <pattern id="halftone-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#d0d0d0"/>
          </pattern>
          
          <g id="photo-placeholder">
            <circle cx="0" cy="-6" r="6" fill="#a0a0a0" stroke="#000" strokeWidth="3"/>
            <path d="M -10 8 C -10 0, -5 -3, 0 -3 C 5 -3, 10 0, 10 8" fill="#a0a0a0" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
          </g>
        </defs>

        <style>
          {`
            .comic-label { font-family: 'Impact', 'Arial Black', sans-serif; font-weight: bold; }
            .data-text { font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif; font-weight: bold; }
          `}
        </style>

        {/* Card Body */}
        <g transform="translate(25, 25)">
            {/* Background */}
            <rect x="0" y="0" width="450" height="300" rx="15" fill="#f0a500" stroke="#000" strokeWidth="6" />
            
            {/* Header */}
            <path d="M 10 10 L 440 10 L 430 70 L 20 70 Z" fill="#e03030" stroke="#000" strokeWidth="5"/>
            <text x="225" y="45" className="comic-label" fontSize="28" fill="#fff" textAnchor="middle" dominantBaseline="middle">ID DE CIUDADANO</text>

            {/* Photo Area */}
            <rect x="25" y="90" width="120" height="150" rx="10" fill="#000" />
            <rect x="15" y="80" width="120" height="150" rx="10" fill="#fff" stroke="#000" strokeWidth="5" />
            
            {photoUrl ? (
                <image href={photoUrl} x="15" y="80" width="120" height="150" preserveAspectRatio="xMidYMid slice" clipPath="inset(0px round 10px)" />
            ) : (
                <use href="#photo-placeholder" x="75" y="155" transform="scale(5) translate(-60, -120)" /> 
            )}
            
            {/* Photo Label (only if no photo) */}
            {!photoUrl && <text x="75" y="215" className="comic-label" fontSize="22" fill="#000" textAnchor="middle">FOTO</text>}

            {/* Data Fields */}
            <g transform="translate(160, 95)">
            <text x="0" y="0" className="comic-label" fontSize="18" fill="#000">NOMBRE:</text>
            <text x="0" y="25" className="data-text" fontSize="24" fill="#000">{name.toUpperCase()}</text>
            
            <text x="0" y="60" className="comic-label" fontSize="18" fill="#000">ID NRO:</text>
            <text x="0" y="85" className="data-text" fontSize="24" fill="#000">{idNumber}</text>
            
            <text x="0" y="120" className="comic-label" fontSize="18" fill="#000">VENCE:</text>
            <text x="0" y="145" className="data-text" fontSize="24" fill="#000">{expirationDate}</text>
            </g>

            {/* Stamp / Seal */}
            <g transform="translate(390, 240) rotate(-15)">
            <circle cx="0" cy="0" r="40" fill="#e03030" stroke="#000" strokeWidth="4" />
            <path d="M -30 15 L 30 -15" stroke="#fff" strokeWidth="3"/>
            </g>
            
            {/* Barcode / Bottom Strip */}
            <g transform="translate(25, 250)">
            <rect x="0" y="0" width="100" height="25" fill="#fff" stroke="#000" strokeWidth="2" />
            <rect x="5" y="2" width="5" height="21" fill="#000"/>
            <rect x="15" y="2" width="3" height="21" fill="#000"/>
            <rect x="25" y="2" width="8" height="21" fill="#000"/>
            <rect x="40" y="2" width="2" height="21" fill="#000"/>
            <rect x="50" y="2" width="6" height="21" fill="#000"/>
            <rect x="65" y="2" width="3" height="21" fill="#000"/>
            <rect x="75" y="2" width="12" height="21" fill="#000"/>
            </g>
        </g>
      </svg>
    </div>
  );
};
