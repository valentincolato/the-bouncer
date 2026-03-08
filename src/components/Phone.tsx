import React from 'react';
import { Phone as PhoneIcon, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface PhoneProps {
  status: 'idle' | 'ringing' | 'active';
  onAnswer: () => void;
  onHangup: () => void;
  onCallBoss?: () => void;
  callerName?: string;
}

function ComicPhone({ status, onAnswer, onHangup, onCallBoss, callerName = "BOSS" }: PhoneProps) {
  const dataState = status === 'idle' ? 0 : status === 'ringing' ? 1 : 2;

  const handleClick = () => {
    if (status === 'idle' && onCallBoss) {
      onCallBoss();
    } else if (status === 'ringing') {
      onAnswer();
    } else if (status === 'active') {
      onHangup();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 z-40 w-80 md:w-[400px] cursor-pointer transition-transform hover:scale-105 origin-bottom-left" onClick={handleClick}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 500 500" 
        id="tactical-handy" 
        data-state={dataState}
        className="w-full h-full"
        style={{ cursor: 'pointer', width: '100%', maxWidth: '500px', fontFamily: "'Impact', 'Arial Black', sans-serif" }}
      >
        <defs>
          <pattern id="halftone" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#d3d3d3" />
          </pattern>
          <filter id="comic-shadow" x="0" y="0" width="200%" height="200%">
            <feOffset result="offOut" in="SourceGraphic" dx="6" dy="6" />
            <feColorMatrix result="matrixOut" in="offOut" type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 1 0" />
            <feBlend in="SourceGraphic" in2="matrixOut" mode="normal" />
          </filter>
        </defs>

        <style>{`
          /* Estilos base */
          .shadow-only { fill: #111; }
          .svg-outline { stroke: #111; stroke-width: 4px; stroke-linejoin: round; }
          
          /* Color variables */
          .color-body { fill: #212121; } 
          .color-accent { fill: #FF5722; } 
          .color-screen { fill: #8BC34A; } 
          .color-white { fill: #FFF; }
          
          /* Transiciones base de la radio */
          #handy-body-group {
            transform-origin: 250px 250px;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          /* =========================================
             ESTADO 0: NORMAL (REPOSO) 
             ========================================= */
          [data-state="0"] #handy-body-group {
            transform: translate(20px, 180px) rotate(15deg); /* Lowered and tilted */
          }
          /* Hover effect handled by parent div scaling, but let's add internal lift */
          [data-state="0"]:hover #handy-body-group {
             transform: translate(20px, 150px) rotate(10deg);
          }

          [data-state="0"] .ring-fx,
          [data-state="0"] .talk-fx {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
          }

          /* =========================================
             ESTADO 1: SONANDO (Alerta/Llamada entrante)
             ========================================= */
          [data-state="1"] #handy-body-group {
            transform: translate(0, -20px) rotate(0deg); /* Sube cuando llama */
            animation: violentShake 0.1s infinite;
          }
          [data-state="1"] .talk-fx {
            opacity: 0;
            pointer-events: none;
          }
          [data-state="1"] .ring-fx {
            opacity: 1;
          }
          /* Animaciones exclusivas de estado 1 */
          [data-state="1"] .color-screen {
            animation: screenAlert 0.2s infinite alternate;
          }
          [data-state="1"] #led-indicator {
            animation: ledFlash 0.15s infinite alternate;
          }

          /* =========================================
             ESTADO 2: HABLANDO (Transmitiendo)
             ========================================= */
          [data-state="2"] #handy-body-group {
            transform: translate(0, -40px) rotate(0deg); /* Rises higher when answered */
          }
          [data-state="2"] .ring-fx {
            opacity: 0;
          }
          [data-state="2"] .talk-fx {
            opacity: 1;
          }
          [data-state="2"] #screen-text {
            opacity: 0;
          }
          [data-state="2"] #screen-talk-text {
            opacity: 1;
          }
          [data-state="2"] #grille-body {
            animation: grillePulse 0.3s infinite alternate;
            transform-origin: 250px 300px;
          }

          /* Animation Keyframes */
          @keyframes violentShake {
            0% { transform: translate(3px, 3px) rotate(2deg); }
            25% { transform: translate(-3px, -1px) rotate(-2deg); }
            50% { transform: translate(4px, -3px) rotate(1deg); }
            75% { transform: translate(-4px, 3px) rotate(-1deg); }
            100% { transform: translate(2px, 2px) rotate(2deg); }
          }
          @keyframes screenAlert {
            0% { fill: #8BC34A; }
            100% { fill: #FFEB3B; } /* Amarillo alerta */
          }
          @keyframes ledFlash {
            0% { fill: #424242; }
            100% { fill: #FF1744; } /* Rojo brillante */
          }
          
          /* Text Animations (include position and rotation) */
          @keyframes textPopBeep {
            0% { transform: translate(360px, 150px) rotate(15deg) scale(0.9); opacity: 0.8; }
            100% { transform: translate(360px, 150px) rotate(15deg) scale(1.15); opacity: 1; }
          }
          @keyframes textPopCall {
            0% { transform: translate(60px, 280px) rotate(-15deg) scale(0.9); opacity: 0.8; }
            100% { transform: translate(60px, 280px) rotate(-15deg) scale(1.15); opacity: 1; }
          }

          @keyframes antennaWaves {
            0% { r: 5px; opacity: 1; stroke-width: 8px; }
            100% { r: 80px; opacity: 0; stroke-width: 2px; }
          }

          /* Animaciones estado 2 (Sonido Blast) */
          @keyframes soundBlast1 {
            0% { transform: translate(0, 0) scale(1); opacity: 0; }
            10% { opacity: 1; }
            100% { transform: translate(50px, -30px) scale(1.5); opacity: 0; }
          }
          @keyframes soundBlast2 {
            0% { transform: translate(0, 0) scale(1); opacity: 0; }
            15% { opacity: 1; }
            100% { transform: translate(70px, 0px) scale(1.8); opacity: 0; }
          }
          @keyframes soundBlast3 {
            0% { transform: translate(0, 0) scale(1); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translate(50px, 30px) scale(1.5); opacity: 0; }
          }
          @keyframes grillePulse {
            0% { transform: scale(1); }
            100% { transform: scale(1.05); }
          }
        `}</style>

        <rect width="100%" height="100%" fill="url(#halftone)" />

        <g id="handy-body-group">
          
          <path d="M 200 40 L 220 40 L 210 150 L 190 150 Z" className="shadow-only" transform="translate(6, 6)" />
          <path d="M 200 40 L 220 40 L 210 150 L 190 150 Z" className="color-body svg-outline" />

          <rect x="230" y="100" width="40" height="30" rx="5" className="shadow-only" transform="translate(6, 6)" />
          <rect x="230" y="100" width="40" height="30" rx="5" className="color-body svg-outline" />
          <line x1="250" y1="105" x2="250" y2="125" stroke="#111" strokeWidth="4" />
          
          <rect x="280" y="110" width="30" height="20" rx="5" className="shadow-only" transform="translate(6, 6)" />
          <rect x="280" y="110" width="30" height="20" rx="5" className="color-body svg-outline" />

          <rect x="180" y="140" width="140" height="300" rx="10" className="shadow-only" transform="translate(6, 6)" />
          <rect x="180" y="140" width="140" height="300" rx="10" className="color-body svg-outline" />
          
          <circle cx="280" cy="155" r="6" className="shadow-only" transform="translate(4,4)" />
          <circle cx="280" cy="155" r="6" fill="#424242" className="svg-outline" id="led-indicator" />

          <line x1="180" y1="180" x2="200" y2="180" stroke="#111" strokeWidth="4" />
          <line x1="180" y1="200" x2="200" y2="200" stroke="#111" strokeWidth="4" />
          <line x1="180" y1="220" x2="200" y2="220" stroke="#111" strokeWidth="4" />
          
          <rect x="155" y="240" width="30" height="80" rx="5" className="shadow-only" transform="translate(6, 6)" />
          <rect x="155" y="240" width="30" height="80" rx="5" className="color-accent svg-outline" id="ptt-button"/>
          
          <rect x="200" y="170" width="100" height="50" rx="5" className="shadow-only" transform="translate(6, 6)" />
          <rect x="200" y="170" width="100" height="50" rx="5" className="color-screen svg-outline" />
          
          <text id="screen-text" x="250" y="205" textAnchor="middle" fontSize="28" fill="#111" fontWeight="900" style={{ transition: 'opacity 0.2s' }}>CH 01</text>
          <text id="screen-talk-text" x="250" y="205" textAnchor="middle" fontSize="28" fill="#E53935" fontWeight="900" opacity="0" style={{ transition: 'opacity 0.2s' }}>{callerName}</text>

          <g id="grille-body" transform="translate(6, 6)">
            <rect x="200" y="250" width="100" height="100" rx="5" className="shadow-only" />
            <rect x="200" y="250" width="100" height="100" rx="5" className="color-body svg-outline" />
            
            <line x1="210" y1="270" x2="290" y2="270" stroke="#111" strokeWidth="6" />
            <line x1="210" y1="290" x2="290" y2="290" stroke="#111" strokeWidth="6" />
            <line x1="210" y1="310" x2="290" y2="310" stroke="#111" strokeWidth="6" />
            <line x1="210" y1="330" x2="290" y2="330" stroke="#111" strokeWidth="6" />
          </g>

          <rect x="205" y="360" width="25" height="20" rx="3" className="svg-outline" fill="#424242" />
          <rect x="237" y="360" width="25" height="20" rx="3" className="svg-outline" fill="#424242" />
          <rect x="270" y="360" width="25" height="20" rx="3" className="svg-outline" fill="#424242" />
          <rect x="205" y="390" width="25" height="20" rx="3" className="svg-outline" fill="#424242" />
          <rect x="237" y="390" width="25" height="20" rx="3" className="svg-outline" fill="#424242" />
          <rect x="270" y="390" width="25" height="20" rx="3" className="svg-outline" fill="#424242" />

          <path d="M 320 160 L 340 180 L 340 400 L 320 420 Z" className="shadow-only" transform="translate(6, 6)" />
          <path d="M 320 160 L 340 180 L 340 400 L 320 420 Z" className="color-body svg-outline" />

          <path d="M 195 150 Q 210 150, 210 160" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>

        <g className="ring-fx">
          <circle cx="210" cy="40" r="0" fill="none" stroke="#FF5722" style={{ animation: 'antennaWaves 0.6s infinite' }} />
          <circle cx="210" cy="40" r="0" fill="none" stroke="#FFC107" style={{ animation: 'antennaWaves 0.6s infinite', animationDelay: '0.2s' }} />
          <circle cx="210" cy="40" r="0" fill="none" stroke="#8BC34A" style={{ animation: 'antennaWaves 0.6s infinite', animationDelay: '0.4s' }} />

          <g style={{ animation: 'textPopBeep 0.3s infinite alternate' }}>
            <text x="4" y="4" fontSize="42" fontStyle="italic" fill="#111" fontWeight="900">BEEP!</text>
            <text x="0" y="0" fontSize="42" fontStyle="italic" fill="#FFC107" stroke="#111" strokeWidth="3" fontWeight="900">BEEP!</text>
          </g>
          <g style={{ animation: 'textPopCall 0.3s infinite alternate', animationDelay: '0.15s' }}>
            <text x="4" y="4" fontSize="36" fontStyle="italic" fill="#111" fontWeight="900">CALL!</text>
            <text x="0" y="0" fontSize="36" fontStyle="italic" fill="#FF5722" stroke="#111" strokeWidth="3" fontWeight="900">CALL!</text>
          </g>
        </g>

        <g className="talk-fx">
          <g style={{ animation: 'soundBlast1 0.6s infinite' }}>
            <path d="M 290 260 L 320 240 L 310 260 L 340 250" stroke="#111" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 310 240 L 340 220 L 330 240 L 360 230" stroke="#111" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          
          <g style={{ animation: 'soundBlast2 0.7s infinite', animationDelay: '0.1s' }}>
            <path d="M 300 300 L 330 300 L 320 310 L 350 310" stroke="#111" fill="none" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 330 300 L 360 300 L 350 310 L 380 310" stroke="#111" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          <g style={{ animation: 'soundBlast3 0.6s infinite', animationDelay: '0.2s' }}>
            <path d="M 290 340 L 320 360 L 310 340 L 340 350" stroke="#111" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 310 360 L 340 380 L 330 360 L 360 370" stroke="#111" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function Phone({ status, onAnswer, onHangup, onCallBoss, callerName = "BOSS" }: PhoneProps) {
  return (
    <>
      {/* Desktop Version */}
      <div className="hidden md:block">
        <ComicPhone
          status={status}
          onAnswer={onAnswer}
          onHangup={onHangup}
          onCallBoss={onCallBoss}
          callerName={callerName}
        />
      </div>

      {/* Mobile Version (Original) */}
      <div className="md:hidden fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2">
        <AnimatePresence>
          {(status === 'ringing' || status === 'active') && (
            <motion.div
              initial={{ y: 200, rotate: 10 }}
              animate={{ y: 0, rotate: -5 }}
              exit={{ y: 200, rotate: 10 }}
              className={cn(
                "w-72 bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative",
                status === 'ringing' && "animate-[shake_0.5s_ease-in-out_infinite]" 
              )}
            >
              {/* Antenna */}
              <div className="absolute -top-6 right-8 w-2 h-8 bg-black -z-10"></div>
              <div className="absolute -top-8 right-7 w-4 h-4 bg-black rounded-full -z-10"></div>

              {/* Screen Container */}
              <div className="p-4 bg-yellow-400">
                  <div className="bg-white border-4 border-black h-40 flex flex-col items-center justify-center relative overflow-hidden">
                      {/* Halftone Pattern */}
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '8px 8px' }}></div>
                      
                      {status === 'ringing' ? (
                          <>
                              <div className="text-4xl font-display font-bold uppercase animate-pulse text-red-600 transform -rotate-2">RING!</div>
                              <div className="text-4xl font-display font-bold uppercase animate-pulse text-red-600 transform rotate-2 delay-75">RING!</div>
                              <div className="mt-2 font-bold font-sans bg-black text-white px-2 py-1 transform -rotate-1">{callerName}</div>
                          </>
                      ) : (
                          <>
                              <div className="w-16 h-16 bg-black rounded-full mb-2 flex items-center justify-center">
                                  <div className="w-12 h-1 bg-green-500 animate-[pulse_1s_ease-in-out_infinite]"></div>
                              </div>
                              <div className="font-bold font-sans text-xl uppercase tracking-wider">CONNECTED</div>
                              <div className="text-sm font-mono bg-black text-white px-2">{callerName}</div>
                          </>
                      )}
                  </div>
              </div>

              {/* Controls */}
              <div className="p-4 pt-0 grid grid-cols-2 gap-4">
                {status === 'ringing' ? (
                  <>
                    <button 
                      onClick={onAnswer}
                      className="bg-green-500 hover:bg-green-400 text-black border-4 border-black p-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex justify-center items-center"
                    >
                      <PhoneIcon className="w-6 h-6 mr-2" />
                      ANSWER
                    </button>
                    <button 
                      onClick={onHangup}
                      className="bg-red-500 hover:bg-red-400 text-black border-4 border-black p-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex justify-center items-center"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={onHangup}
                    className="col-span-2 bg-red-500 hover:bg-red-400 text-black border-4 border-black p-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex justify-center items-center"
                  >
                    <span className="mr-2">HANG UP</span>
                    <PhoneOff className="w-6 h-6" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Idle State / Button to check phone */}
        {status === 'idle' && (
           <button 
              onClick={onCallBoss}
              className="w-20 h-20 bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center hover:scale-110 transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none transform -rotate-6 group"
              title="Call Boss"
           >
               <PhoneIcon className="w-8 h-8 text-black mb-1 group-hover:animate-bounce" />
               <span className="text-[10px] font-bold uppercase leading-none">Call Boss</span>
           </button>
        )}
      </div>
    </>
  );
}
